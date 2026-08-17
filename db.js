const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'sgpa.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL, -- admin, requisitante, fiscal, gestor, controladoria, ordenador, almoxarifado, leitor
  secretaria TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tipos_documento (
  codigo TEXT PRIMARY KEY,       -- '00'..'25'
  bloco TEXT NOT NULL,           -- 'A'..'F'
  bloco_nome TEXT NOT NULL,
  fase INTEGER,                  -- 1..7 (fase do fluxo, ou NULL se transversal)
  nome TEXT NOT NULL,
  descricao TEXT,
  aplica_servico INTEGER NOT NULL DEFAULT 1,
  aplica_material INTEGER NOT NULL DEFAULT 1,
  obrigatorio INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS processos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,     -- PML-2026-000123
  ano INTEGER NOT NULL,
  sequencial INTEGER NOT NULL,
  tipo_objeto TEXT NOT NULL,       -- servico | material | obra
  objeto TEXT NOT NULL,
  secretaria TEXT NOT NULL,
  contratado_nome TEXT,
  contratado_documento TEXT,
  valor REAL,
  fase_atual INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'aberto', -- aberto | pendente | concluido | arquivado
  criado_por INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  processo_id INTEGER NOT NULL,
  tipo_codigo TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  nome_sistema TEXT NOT NULL,
  caminho_arquivo TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  tamanho INTEGER,
  mime TEXT,
  enviado_por INTEGER,
  enviado_em TEXT NOT NULL DEFAULT (datetime('now')),
  permite_download INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  checklist_respostas TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (processo_id) REFERENCES processos(id),
  FOREIGN KEY (tipo_codigo) REFERENCES tipos_documento(codigo),
  FOREIGN KEY (enviado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS log_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  processo_id INTEGER,
  usuario_id INTEGER,
  evento TEXT NOT NULL,
  detalhes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

module.exports = db;
