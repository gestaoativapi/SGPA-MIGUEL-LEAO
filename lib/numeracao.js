const dayjs = require('dayjs');

const SIGLA_MUNICIPIO = 'PML'; // Prefeitura Municipal de Miguel Leão

// Gera o próximo número de processo do ano corrente: PML-2026-000123
function proximoNumeroProcesso(db, ano) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(sequencial), 0) AS max_seq FROM processos WHERE ano = ?'
  ).get(ano);
  const seq = row.max_seq + 1;
  const numero = `${SIGLA_MUNICIPIO}-${ano}-${String(seq).padStart(6, '0')}`;
  return { numero, sequencial: seq };
}

// Normaliza texto para uso em nome de arquivo (sem acento, sem espaço).
function slug(texto) {
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Monta o nome de arquivo padronizado:
// {codigo}_{NomeDocumentoSlug}_{NumeroProcesso}_{AAAA-MM-DD}_v{versao}.{ext}
function nomearArquivo({ codigo, nomeTipoDocumento, numeroProcesso, versao, extensao }) {
  const data = dayjs().format('YYYY-MM-DD');
  const base = `${codigo}_${slug(nomeTipoDocumento)}_${slug(numeroProcesso)}_${data}_v${versao}`;
  return `${base}${extensao ? '.' + extensao.replace(/^\./, '') : ''}`;
}

module.exports = { SIGLA_MUNICIPIO, proximoNumeroProcesso, slug, nomearArquivo };
