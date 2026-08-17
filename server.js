require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const dayjs = require('dayjs');

const db = require('./db');
const { PAPEIS, PODE_CRIAR_PROCESSO, PODE_ENVIAR_DOCUMENTO, PODE_GERENCIAR_USUARIOS,
        PODE_ALTERAR_PERMISSAO_DOWNLOAD, PODE_ARQUIVAR_PROCESSO, podeBaixar } = require('./lib/permissions');
const { proximoNumeroProcesso, nomearArquivo, slug } = require('./lib/numeracao');
const { calcularPendencias } = require('./lib/pendencias');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: process.env.DATA_DIR || path.join(__dirname, 'data') }),
  secret: process.env.SESSION_SECRET || 'troque-este-segredo-em-producao-miguel-leao',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }, // 8h
}));

// ---------- Helpers de auditoria ----------
function log(processoId, usuarioId, evento, detalhes) {
  db.prepare('INSERT INTO log_eventos (processo_id, usuario_id, evento, detalhes) VALUES (?,?,?,?)')
    .run(processoId || null, usuarioId || null, evento, detalhes || null);
}

// ---------- Auth middleware ----------
function requireAuth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login');
  next();
}
function requirePapel(papeisPermitidos) {
  return (req, res, next) => {
    if (!req.session.usuario || !papeisPermitidos.has(req.session.usuario.papel)) {
      return res.status(403).render('erro', { usuario: req.session.usuario, titulo: 'Acesso negado',
        mensagem: 'Seu perfil não tem permissão para esta ação.' });
    }
    next();
  };
}
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.PAPEIS = PAPEIS;
  res.locals.dayjs = dayjs;
  next();
});

// ---------- Login ----------
app.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/');
  res.render('login', { erro: null });
});
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email);
  if (!usuario || !bcrypt.compareSync(senha || '', usuario.senha_hash)) {
    return res.render('login', { erro: 'E-mail ou senha inválidos.' });
  }
  req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, secretaria: usuario.secretaria };
  log(null, usuario.id, 'login', null);
  res.redirect('/');
});
app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// ---------- Dashboard ----------
app.get('/', requireAuth, (req, res) => {
  const { status, secretaria, q } = req.query;
  let sql = 'SELECT * FROM processos WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (secretaria) { sql += ' AND secretaria = ?'; params.push(secretaria); }
  if (q) { sql += ' AND (numero LIKE ? OR objeto LIKE ? OR contratado_nome LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY criado_em DESC';
  const processos = db.prepare(sql).all(...params).map(p => ({ ...p, pendencias: calcularPendencias(p) }));
  const secretarias = db.prepare('SELECT DISTINCT secretaria FROM processos ORDER BY secretaria').all().map(r => r.secretaria);

  const resumo = {
    total: processos.length,
    abertos: processos.filter(p => p.status === 'aberto').length,
    pendentes: processos.filter(p => p.pendencias.tiposFaltando.length > 0).length,
    concluidos: processos.filter(p => p.status === 'concluido' || p.status === 'arquivado').length,
  };

  res.render('dashboard', { processos, secretarias, resumo, filtros: { status, secretaria, q } });
});

// ---------- Novo processo ----------
app.get('/processos/novo', requireAuth, requirePapel(PODE_CRIAR_PROCESSO), (req, res) => {
  res.render('processo_novo', { erro: null });
});
app.post('/processos', requireAuth, requirePapel(PODE_CRIAR_PROCESSO), (req, res) => {
  const { tipo_objeto, objeto, secretaria, contratado_nome, contratado_documento, valor } = req.body;
  if (!objeto || !secretaria || !tipo_objeto) {
    return res.render('processo_novo', { erro: 'Preencha ao menos objeto, secretaria e natureza.' });
  }
  const ano = dayjs().year();
  const { numero, sequencial } = proximoNumeroProcesso(db, ano);
  const info = db.prepare(`
    INSERT INTO processos (numero, ano, sequencial, tipo_objeto, objeto, secretaria, contratado_nome, contratado_documento, valor, criado_por)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(numero, ano, sequencial, tipo_objeto, objeto, secretaria, contratado_nome || null, contratado_documento || null,
         valor ? Number(valor) : null, req.session.usuario.id);
  log(info.lastInsertRowid, req.session.usuario.id, 'processo_criado', numero);
  res.redirect(`/processos/${numero}`);
});

// ---------- Detalhe do processo ----------
function carregarProcesso(numero) {
  return db.prepare('SELECT * FROM processos WHERE numero = ?').get(numero);
}

app.get('/processos/:numero', requireAuth, (req, res) => {
  const processo = carregarProcesso(req.params.numero);
  if (!processo) return res.status(404).render('erro', { titulo: 'Processo não encontrado', mensagem: 'Verifique o número informado.' });

  const campo = processo.tipo_objeto === 'material' ? 'aplica_material' : 'aplica_servico';
  const tipos = db.prepare(`SELECT * FROM tipos_documento WHERE ${campo} = 1 ORDER BY ordem`).all()
    .map(t => ({ ...t, checklist: JSON.parse(t.checklist_json || '[]') }));
  const documentos = db.prepare(`
    SELECT d.*, u.nome AS enviado_por_nome FROM documentos d
    LEFT JOIN usuarios u ON u.id = d.enviado_por
    WHERE d.processo_id = ? ORDER BY d.enviado_em DESC
  `).all(processo.id);

  const documentosPorTipo = {};
  for (const d of documentos) {
    (documentosPorTipo[d.tipo_codigo] ||= []).push(d);
  }

  // agrupar tipos por bloco, preservando ordem
  const blocos = [];
  const blocoMap = new Map();
  for (const t of tipos) {
    if (!blocoMap.has(t.bloco)) {
      const b = { bloco: t.bloco, bloco_nome: t.bloco_nome, tipos: [] };
      blocoMap.set(t.bloco, b);
      blocos.push(b);
    }
    blocoMap.get(t.bloco).tipos.push(t);
  }

  const pendencias = calcularPendencias(processo);
  const eventos = db.prepare(`
    SELECT le.*, u.nome AS usuario_nome FROM log_eventos le
    LEFT JOIN usuarios u ON u.id = le.usuario_id
    WHERE le.processo_id = ? ORDER BY le.criado_em DESC LIMIT 30
  `).all(processo.id);

  res.render('processo_detail', {
    processo, blocos, documentosPorTipo, pendencias, eventos,
    podeBaixarFn: (doc) => podeBaixar(req.session.usuario, doc),
    podeEnviar: PODE_ENVIAR_DOCUMENTO.has(req.session.usuario.papel),
    podeAlterarPermissao: PODE_ALTERAR_PERMISSAO_DOWNLOAD.has(req.session.usuario.papel),
    podeArquivar: PODE_ARQUIVAR_PROCESSO.has(req.session.usuario.papel),
  });
});

app.post('/processos/:numero/status', requireAuth, requirePapel(PODE_ARQUIVAR_PROCESSO), (req, res) => {
  const processo = carregarProcesso(req.params.numero);
  if (!processo) return res.status(404).end();
  const { status } = req.body;
  if (!['aberto', 'pendente', 'concluido', 'arquivado'].includes(status)) return res.status(400).end();
  db.prepare("UPDATE processos SET status = ?, atualizado_em = datetime('now') WHERE id = ?").run(status, processo.id);
  log(processo.id, req.session.usuario.id, 'status_alterado', status);
  res.redirect(`/processos/${processo.numero}`);
});

// ---------- Upload de documento ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const processo = carregarProcesso(req.params.numero);
    const dir = path.join(UPLOAD_ROOT, String(processo.ano), processo.numero);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const processo = carregarProcesso(req.params.numero);
    const tipo = db.prepare('SELECT * FROM tipos_documento WHERE codigo = ?').get(req.body.tipo_codigo);
    const versaoRow = db.prepare('SELECT COALESCE(MAX(versao),0) v FROM documentos WHERE processo_id = ? AND tipo_codigo = ?')
      .get(processo.id, req.body.tipo_codigo);
    const versao = versaoRow.v + 1;
    const ext = path.extname(file.originalname).replace('.', '');
    const nomeSistema = nomearArquivo({
      codigo: tipo.codigo, nomeTipoDocumento: tipo.nome, numeroProcesso: processo.numero, versao, extensao: ext,
    });
    req._nomeSistemaAtual = nomeSistema; // usado depois para gravar no banco
    cb(null, nomeSistema);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/processos/:numero/documentos', requireAuth, requirePapel(PODE_ENVIAR_DOCUMENTO),
  upload.single('arquivo'), (req, res) => {
    const processo = carregarProcesso(req.params.numero);
    if (!processo || !req.file) return res.status(400).render('erro', { titulo: 'Erro no envio', mensagem: 'Selecione um arquivo e o tipo de documento.' });

    const versaoRow = db.prepare('SELECT COALESCE(MAX(versao),0) v FROM documentos WHERE processo_id = ? AND tipo_codigo = ?')
      .get(processo.id, req.body.tipo_codigo);
    // a versão real já foi calculada no momento do nome do arquivo; buscamos de novo para consistência
    const caminhoRelativo = path.relative(UPLOAD_ROOT, req.file.path);
    const checklistRespostas = {};
    for (const key of Object.keys(req.body)) {
      if (key.startsWith('check__')) {
        checklistRespostas[key.replace('check__', '')] = req.body[key];
      }
    }
    const info = db.prepare(`
      INSERT INTO documentos (processo_id, tipo_codigo, nome_original, nome_sistema, caminho_arquivo, versao, tamanho, mime, enviado_por, permite_download, observacoes, checklist_respostas)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      processo.id, req.body.tipo_codigo, req.file.originalname, req.file.filename, caminhoRelativo,
      versaoRow.v + 1, req.file.size, req.file.mimetype, req.session.usuario.id,
      req.body.permite_download === 'on' ? 1 : 0, req.body.observacoes || null, JSON.stringify(checklistRespostas)
    );
    log(processo.id, req.session.usuario.id, 'documento_enviado', `${req.body.tipo_codigo} :: ${req.file.filename}`);
    res.redirect(`/processos/${processo.numero}`);
  });

// ---------- Visualização / download de documentos ----------
function carregarDocumentoComProcesso(id) {
  return db.prepare(`
    SELECT d.*, p.numero AS processo_numero FROM documentos d
    JOIN processos p ON p.id = d.processo_id
    WHERE d.id = ?
  `).get(id);
}

app.get('/documentos/:id/visualizar', requireAuth, (req, res) => {
  const doc = carregarDocumentoComProcesso(req.params.id);
  if (!doc) return res.status(404).end();
  const caminho = path.join(UPLOAD_ROOT, doc.caminho_arquivo);
  if (!fs.existsSync(caminho)) return res.status(404).end();
  log(doc.processo_id, req.session.usuario.id, 'documento_visualizado', doc.nome_sistema);
  res.setHeader('Content-Disposition', `inline; filename="${doc.nome_sistema}"`);
  res.setHeader('Content-Type', doc.mime || 'application/octet-stream');
  fs.createReadStream(caminho).pipe(res);
});

app.get('/documentos/:id/download', requireAuth, (req, res) => {
  const doc = carregarDocumentoComProcesso(req.params.id);
  if (!doc) return res.status(404).end();
  if (!podeBaixar(req.session.usuario, doc)) {
    return res.status(403).render('erro', { titulo: 'Download não permitido',
      mensagem: 'Este documento está configurado apenas para visualização/consulta. Solicite liberação à Controladoria.' });
  }
  const caminho = path.join(UPLOAD_ROOT, doc.caminho_arquivo);
  if (!fs.existsSync(caminho)) return res.status(404).end();
  log(doc.processo_id, req.session.usuario.id, 'documento_baixado', doc.nome_sistema);
  res.download(caminho, doc.nome_sistema);
});

app.post('/documentos/:id/permissao', requireAuth, requirePapel(PODE_ALTERAR_PERMISSAO_DOWNLOAD), (req, res) => {
  const doc = carregarDocumentoComProcesso(req.params.id);
  if (!doc) return res.status(404).end();
  const novo = doc.permite_download ? 0 : 1;
  db.prepare('UPDATE documentos SET permite_download = ? WHERE id = ?').run(novo, doc.id);
  log(doc.processo_id, req.session.usuario.id, 'permissao_download_alterada', `${doc.nome_sistema} -> ${novo ? 'liberado' : 'bloqueado'}`);
  res.redirect(`/processos/${doc.processo_numero}`);
});

// ---------- Catálogo de documentos (consulta) ----------
app.get('/catalogo', requireAuth, (req, res) => {
  const tipos = db.prepare('SELECT * FROM tipos_documento ORDER BY ordem').all()
    .map(t => ({ ...t, checklist: JSON.parse(t.checklist_json || '[]') }));
  res.render('catalogo', { tipos });
});

// ---------- Administração de usuários ----------
app.get('/admin/usuarios', requireAuth, requirePapel(PODE_GERENCIAR_USUARIOS), (req, res) => {
  const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
  res.render('admin_usuarios', { usuarios, erro: null });
});
app.post('/admin/usuarios', requireAuth, requirePapel(PODE_GERENCIAR_USUARIOS), (req, res) => {
  const { nome, email, senha, papel, secretaria } = req.body;
  if (!nome || !email || !senha || !papel) {
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    return res.render('admin_usuarios', { usuarios, erro: 'Preencha todos os campos obrigatórios.' });
  }
  const hash = bcrypt.hashSync(senha, 10);
  try {
    db.prepare('INSERT INTO usuarios (nome, email, senha_hash, papel, secretaria) VALUES (?,?,?,?,?)')
      .run(nome, email, hash, papel, secretaria || null);
  } catch (e) {
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nome').all();
    return res.render('admin_usuarios', { usuarios, erro: 'Não foi possível criar (e-mail já existe?).' });
  }
  res.redirect('/admin/usuarios');
});
app.post('/admin/usuarios/:id/toggle', requireAuth, requirePapel(PODE_GERENCIAR_USUARIOS), (req, res) => {
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (usuario) db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(usuario.ativo ? 0 : 1, usuario.id);
  res.redirect('/admin/usuarios');
});

app.listen(PORT, () => {
  console.log(`SGPA — Miguel Leão/PI rodando em http://localhost:${PORT}`);
});
