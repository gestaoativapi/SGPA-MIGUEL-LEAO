const db = require('../db');
const bcrypt = require('bcryptjs');
const tipos = require('./documentTypes');

function seedTipos() {
  const upsert = db.prepare(`
    INSERT INTO tipos_documento (codigo, bloco, bloco_nome, fase, nome, descricao, aplica_servico, aplica_material, obrigatorio, ordem, checklist_json)
    VALUES (@codigo, @bloco, @bloco_nome, @fase, @nome, @descricao, @aplica_servico, @aplica_material, @obrigatorio, @ordem, @checklist_json)
    ON CONFLICT(codigo) DO UPDATE SET
      bloco=excluded.bloco, bloco_nome=excluded.bloco_nome, fase=excluded.fase,
      nome=excluded.nome, descricao=excluded.descricao,
      aplica_servico=excluded.aplica_servico, aplica_material=excluded.aplica_material,
      obrigatorio=excluded.obrigatorio, ordem=excluded.ordem, checklist_json=excluded.checklist_json
  `);
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      upsert.run({
        codigo: r.codigo,
        bloco: r.bloco,
        bloco_nome: r.bloco_nome,
        fase: r.fase,
        nome: r.nome,
        descricao: r.descricao || '',
        aplica_servico: r.aplica_servico ? 1 : 0,
        aplica_material: r.aplica_material ? 1 : 0,
        obrigatorio: r.obrigatorio ? 1 : 0,
        ordem: r.ordem,
        checklist_json: JSON.stringify(r.checklist || []),
      });
    }
  });
  tx(tipos);
  console.log(`✔ ${tipos.length} tipos de documento carregados.`);
}

function seedUsuarios() {
  const count = db.prepare('SELECT COUNT(*) c FROM usuarios').get().c;
  if (count > 0) {
    console.log('ℹ Usuários já existem — pulando criação de usuários padrão.');
    return;
  }
  const insert = db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, papel, secretaria)
    VALUES (?, ?, ?, ?, ?)
  `);
  const senhaPadrao = bcrypt.hashSync('MigueLeao@2026', 10);
  const usuarios = [
    ['Administrador do Sistema', 'admin@miguelleao.pi.gov.br', 'admin', 'Tecnologia da Informação'],
    ['Controladoria Interna', 'controladoria@miguelleao.pi.gov.br', 'controladoria', 'Controladoria Interna'],
    ['Fiscal de Contratos', 'fiscal@miguelleao.pi.gov.br', 'fiscal', 'Secretaria de Administração'],
    ['Gestor de Contratos', 'gestor@miguelleao.pi.gov.br', 'gestor', 'Secretaria de Administração'],
    ['Ordenador de Despesas', 'ordenador@miguelleao.pi.gov.br', 'ordenador', 'Gabinete do Prefeito'],
    ['Almoxarifado', 'almoxarifado@miguelleao.pi.gov.br', 'almoxarifado', 'Secretaria de Administração'],
    ['Servidor Requisitante', 'requisitante@miguelleao.pi.gov.br', 'requisitante', 'Secretaria de Educação'],
  ];
  const tx = db.transaction((rows) => {
    for (const [nome, email, papel, secretaria] of rows) {
      insert.run(nome, email, senhaPadrao, papel, secretaria);
    }
  });
  tx(usuarios);
  console.log(`✔ ${usuarios.length} usuários padrão criados. Senha inicial de todos: MigueLeao@2026`);
}

seedTipos();
seedUsuarios();
console.log('Seed concluído.');
