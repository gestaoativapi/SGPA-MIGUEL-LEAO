const db = require('../db');

// Calcula, para um processo, quais tipos de documento aplicáveis à sua
// natureza (serviço/material) ainda não têm nenhum arquivo anexado, e
// quais itens de checklist foram marcados como pendentes nos documentos
// já enviados. Isso NUNCA bloqueia o processo — apenas gera avisos.
function calcularPendencias(processo) {
  const campo = processo.tipo_objeto === 'material' ? 'aplica_material' : 'aplica_servico';
  const tipos = db.prepare(`SELECT * FROM tipos_documento WHERE ${campo} = 1 ORDER BY ordem`).all();
  const documentos = db.prepare('SELECT * FROM documentos WHERE processo_id = ?').all(processo.id);

  const porTipo = new Map();
  for (const d of documentos) {
    if (!porTipo.has(d.tipo_codigo)) porTipo.set(d.tipo_codigo, []);
    porTipo.get(d.tipo_codigo).push(d);
  }

  const tiposFaltando = [];
  const itensChecklistPendentes = [];

  for (const t of tipos) {
    const docs = porTipo.get(t.codigo) || [];
    if (t.obrigatorio && docs.length === 0) {
      tiposFaltando.push(t);
    }
    for (const d of docs) {
      let respostas = {};
      try { respostas = JSON.parse(d.checklist_respostas || '{}'); } catch (e) { respostas = {}; }
      const checklist = JSON.parse(t.checklist_json || '[]');
      checklist.forEach((item, idx) => {
        const resp = respostas[String(idx)];
        if (resp === 'nao') {
          itensChecklistPendentes.push({
            tipo_codigo: t.codigo, tipo_nome: t.nome, documento_id: d.id, item, resposta: resp,
          });
        }
      });
    }
  }

  const totalObrigatorios = tipos.filter(t => t.obrigatorio).length;
  const obrigatoriosAtendidos = totalObrigatorios - tiposFaltando.length;
  const percentual = totalObrigatorios === 0 ? 100 : Math.round((obrigatoriosAtendidos / totalObrigatorios) * 100);

  return { tiposFaltando, itensChecklistPendentes, percentual, totalObrigatorios, obrigatoriosAtendidos };
}

module.exports = { calcularPendencias };
