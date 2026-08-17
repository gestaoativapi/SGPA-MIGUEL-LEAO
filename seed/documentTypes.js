// Catálogo dos 26 documentos do "Pacote de Gestão da Despesa Pública"
// da Prefeitura Municipal de Miguel Leão/PI, numerados na ordem de uso
// dentro do processo (00 a 25), organizados em 6 blocos (A-F) e
// mapeados às 7 fases do fluxo (Manual Orientativo / Fluxograma, docs 01 e 03).
//
// aplica_servico / aplica_material definem para qual natureza de objeto
// o documento é relevante (usado para calcular pendências sem travar o processo).
// obrigatorio = 1 marca os documentos que o Relatório de Diagnóstico (doc 02)
// classifica como Nível 1 (obrigatório, não pode esperar).

const S = 1, M = 0; // aplica_servico / aplica_material (1 = aplica, 0 = não aplica)

const tipos = [
  { codigo: '00', bloco: 'A', bloco_nome: 'Diagnóstico e Orientação Geral', fase: null,
    nome: 'Capa e Índice Geral do Pacote', descricao: 'Documento de referência do pacote completo.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '01', bloco: 'A', bloco_nome: 'Diagnóstico e Orientação Geral', fase: null,
    nome: 'Manual Orientativo Ilustrado', descricao: 'Visão geral do fluxo em 7 fases.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '02', bloco: 'A', bloco_nome: 'Diagnóstico e Orientação Geral', fase: null,
    nome: 'Relatório de Diagnóstico e Plano de Adequação', descricao: 'Situação atual e plano de ação em 3 níveis.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '03', bloco: 'A', bloco_nome: 'Diagnóstico e Orientação Geral', fase: null,
    nome: 'Fluxograma do Processo (impressão/mural)', descricao: 'Diagrama das 7 fases.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '04', bloco: 'A', bloco_nome: 'Diagnóstico e Orientação Geral', fase: null,
    nome: 'Manual do Rito Processual Mínimo Viável', descricao: 'Passo a passo para equipe reduzida.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '05', bloco: 'B', bloco_nome: 'Manuais de Função', fase: 2,
    nome: 'Manual do Fiscal de Contrato', descricao: 'Atribuições, limites e responsabilidades (Art. 117, Lei 14.133/2021).',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '06', bloco: 'B', bloco_nome: 'Manuais de Função', fase: 2,
    nome: 'Manual do Gestor de Contrato', descricao: 'Coordenação, aditivos e penalidades.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '07', bloco: 'C', bloco_nome: 'Nomeação e Início do Contrato', fase: 2,
    nome: 'Portaria de Nomeação de Fiscal e Gestor', descricao: 'Designação formal (até 4 fiscais).',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1, ordem: 7,
    checklist: [
      'Fiscal(is) nomeado(s) por Portaria',
      'Gestor(a) nomeado(a) por Portaria',
      'Portaria publicada/arquivada no processo',
    ] },

  { codigo: '08', bloco: 'C', bloco_nome: 'Nomeação e Início do Contrato', fase: 3,
    nome: 'Ordem de Serviço / Autorização de Início', descricao: 'Marco formal de início da execução (Art. 111 e 117).',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1,
    checklist: [
      'Dados do contrato preenchidos (objeto, contratado, valor, vigência, dotação, empenho)',
      'Data de início e previsão de conclusão definidas',
      'Fiscal e Gestor identificados',
      'Contratado ciente e OS assinada',
    ] },

  { codigo: '09', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Atesto de Execução de Serviços', descricao: 'Para contratos de prestação de serviço (Art. 140).',
    aplica_servico: 1, aplica_material: 0, obrigatorio: 1,
    checklist: [
      'Serviços executados no prazo e local contratados',
      'Quantidade/qualidade conferem com o contratado',
      'Certidões do contratado presentes e válidas (CND Federal, FGTS, CNDT, Estadual, Municipal)',
      'Sem ocorrências/glosas pendentes de justificativa',
      'Atesto assinado pelo Fiscal (e visto do Gestor)',
    ] },

  { codigo: '10', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Atesto de Recebimento de Materiais/Bens', descricao: 'Para contratos de fornecimento (Art. 140).',
    aplica_servico: 0, aplica_material: 1, obrigatorio: 1,
    checklist: [
      'Quantidade e especificação conferem com a Nota Fiscal e o contrato',
      'Certidões do contratado presentes e válidas',
      'Sem pendências de recebimento',
      'Atesto assinado pelo Fiscal (e visto do Gestor)',
    ] },

  { codigo: '11', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Termo de Recebimento Consolidado', descricao: 'Modelo único — serviços OU materiais.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0,
    checklist: [
      'Natureza do objeto marcada (serviço ou material)',
      'Verificação quantitativa e qualitativa preenchida',
      'Regularidade fiscal do contratado verificada',
      'Modalidade definida (provisório ou definitivo)',
    ] },

  { codigo: '12', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Termo de Recebimento Provisório', descricao: 'Art. 140, I — Lei 14.133/2021.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [
      'Conferência inicial realizada',
      'Assinatura do responsável pelo recebimento',
    ] },

  { codigo: '13', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Termo de Recebimento Definitivo', descricao: 'Art. 140, II — Lei 14.133/2021.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1, checklist: [
      'Verificação definitiva de conformidade concluída',
      'Assinatura do Gestor do Contrato',
    ] },

  { codigo: '14', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Relatório Mensal de Fiscalização', descricao: 'Para contratos de serviço contínuo.',
    aplica_servico: 1, aplica_material: 0, obrigatorio: 0, checklist: [
      'Relatório do mês de referência anexado',
      'Ocorrências do período registradas (se houver)',
    ] },

  { codigo: '15', bloco: 'D', bloco_nome: 'Fiscalização e Recebimento', fase: 4,
    nome: 'Notificação ao Contratado', descricao: 'Para irregularidades identificadas.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [
      'Irregularidade descrita objetivamente',
      'Prazo para regularização definido',
      'Ciência do contratado registrada',
    ] },

  { codigo: '16', bloco: 'E', bloco_nome: 'Almoxarifado e Patrimônio', fase: 4,
    nome: 'Guia de Saída de Material (Almoxarifado)', descricao: 'Destinação a setor, sala e responsável.',
    aplica_servico: 0, aplica_material: 1, obrigatorio: 1, checklist: [
      'Tipo de saída e vinculação à compra (contrato/empenho/NF) preenchidos',
      'Secretaria, setor e responsável pelo recebimento identificados',
      'Relação de itens entregues completa',
      'Confirmação de entrega assinada pelo responsável recebedor',
    ] },

  { codigo: '17', bloco: 'E', bloco_nome: 'Almoxarifado e Patrimônio', fase: 4,
    nome: 'Termo de Responsabilidade', descricao: 'Guarda de bem/equipamento por servidor.',
    aplica_servico: 0, aplica_material: 1, obrigatorio: 0, checklist: [
      'Bem/equipamento identificado (nº patrimonial)',
      'Servidor responsável identificado e assinatura coletada',
    ] },

  { codigo: '18', bloco: 'E', bloco_nome: 'Almoxarifado e Patrimônio', fase: 4,
    nome: 'Termo de Transferência Patrimonial', descricao: 'Mudança de responsável pelo bem.',
    aplica_servico: 0, aplica_material: 1, obrigatorio: 0, checklist: [
      'Responsável de origem e destino identificados',
      'Assinaturas de ambos os responsáveis coletadas',
    ] },

  { codigo: '19', bloco: 'E', bloco_nome: 'Almoxarifado e Patrimônio', fase: 4,
    nome: 'Termo de Baixa Patrimonial', descricao: 'Exclusão de bem do inventário.',
    aplica_servico: 0, aplica_material: 1, obrigatorio: 0, checklist: [
      'Motivo da baixa justificado',
      'Autorização da autoridade competente registrada',
    ] },

  { codigo: '20', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 5,
    nome: 'Parecer da Controladoria Interna', descricao: 'Com cláusula de limitação estrutural.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1, checklist: [
      'Documentação do processo revisada integralmente',
      'Certidões e legalidade verificadas',
      'Parecer conclusivo emitido (aprovado / com ressalva / devolvido)',
      'Cláusula de limitação estrutural preenchida, se aplicável (ver doc. 24)',
    ] },

  { codigo: '21', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 5,
    nome: 'Checklist do Processo de Pagamento', descricao: 'Capa obrigatória de todo processo.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1, checklist: [
      'Todos os documentos obrigatórios da fase anexados',
      'Numeração de páginas/processo conferida',
      'Assinaturas de todas as etapas presentes',
    ] },

  { codigo: '22', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 6,
    nome: 'Declaração de Recebimento e Quitação', descricao: 'Confirmação final do fornecedor.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 1, checklist: [
      'Fornecedor confirmou recebimento do valor',
      'Declaração assinada e anexada ao processo',
    ] },

  { codigo: '23', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 2,
    nome: 'Tabela de Limites de Dispensa (2026)', descricao: 'Valores atualizados — Decreto 12.807/2025.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },

  { codigo: '24', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 5,
    nome: 'Anexo de Declaração de Limitação Estrutural', descricao: 'Versão solta, para processos antigos.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [
      'Situação de acúmulo de função descrita',
      'Controle compensatório adotado indicado',
    ] },

  { codigo: '25', bloco: 'F', bloco_nome: 'Controle Interno e Pagamento', fase: 5,
    nome: 'Quadro-Resumo de Conformidade Multiórgãos', descricao: 'TCE/PI, TCU, CGU, CNMP, CFC e STN.',
    aplica_servico: 1, aplica_material: 1, obrigatorio: 0, checklist: [] },
];

module.exports = tipos.map((t, i) => ({
  aplica_servico: 1, aplica_material: 1, obrigatorio: 0,
  ordem: i,
  checklist: [],
  ...t,
}));
