// Papéis do sistema e o que cada um pode fazer.
// Mantido simples e centralizado para facilitar auditoria.

const PAPEIS = {
  admin: 'Administrador do Sistema',
  controladoria: 'Controladoria Interna',
  fiscal: 'Fiscal de Contrato',
  gestor: 'Gestor de Contrato',
  ordenador: 'Ordenador de Despesas',
  almoxarifado: 'Almoxarifado',
  requisitante: 'Servidor Requisitante',
  leitor: 'Consulta (somente leitura)',
};

// Quem pode alterar a permissão de download de um documento e quem
// sempre pode baixar independentemente da flag (auditoria/controle).
const SEMPRE_PODE_BAIXAR = new Set(['admin', 'controladoria']);
const PODE_ALTERAR_PERMISSAO_DOWNLOAD = new Set(['admin', 'controladoria']);
const PODE_CRIAR_PROCESSO = new Set(['admin', 'requisitante', 'fiscal', 'gestor', 'controladoria']);
const PODE_ENVIAR_DOCUMENTO = new Set(['admin', 'requisitante', 'fiscal', 'gestor', 'controladoria', 'almoxarifado', 'ordenador']);
const PODE_GERENCIAR_USUARIOS = new Set(['admin']);
const PODE_ARQUIVAR_PROCESSO = new Set(['admin', 'controladoria']);

function podeBaixar(usuario, documento) {
  if (!usuario) return false;
  if (SEMPRE_PODE_BAIXAR.has(usuario.papel)) return true;
  return !!documento.permite_download;
}

module.exports = {
  PAPEIS,
  SEMPRE_PODE_BAIXAR,
  PODE_ALTERAR_PERMISSAO_DOWNLOAD,
  PODE_CRIAR_PROCESSO,
  PODE_ENVIAR_DOCUMENTO,
  PODE_GERENCIAR_USUARIOS,
  PODE_ARQUIVAR_PROCESSO,
  podeBaixar,
};
