# SGPA — Sistema de Gestão de Processos Administrativos
Prefeitura Municipal de Miguel Leão/PI

Protótipo funcional que organiza os processos de despesa pública do
município (planejamento → contratação → execução → recebimento →
controle interno → pagamento → arquivamento), com numeração automática
de processo, renomeação padronizada dos arquivos anexados, checklist
flexível (não bloqueante) e uma tela de consulta/visualização de
documentos com controle de permissão de download.

O catálogo de 26 documentos, os 6 blocos e as 7 fases usados no sistema
foram extraídos diretamente do pacote de modelos enviado (`00_Capa e
Índice Geral` até `25_Quadro de Conformidade Multiórgãos`).

## Como rodar localmente

```bash
npm install
cp .env.example .env      # ajuste SESSION_SECRET em produção
npm run seed               # cria as tabelas, os 26 tipos de documento e usuários padrão
npm start                  # sobe em http://localhost:3000
```

Usuários criados pelo seed (senha inicial `MigueLeao@2026` para todos —
**troque no primeiro acesso**, via tela de Usuários com o login admin):

| Papel | E-mail |
|---|---|
| Administrador | admin@miguelleao.pi.gov.br |
| Controladoria Interna | controladoria@miguelleao.pi.gov.br |
| Fiscal de Contrato | fiscal@miguelleao.pi.gov.br |
| Gestor de Contrato | gestor@miguelleao.pi.gov.br |
| Ordenador de Despesas | ordenador@miguelleao.pi.gov.br |
| Almoxarifado | almoxarifado@miguelleao.pi.gov.br |
| Requisitante | requisitante@miguelleao.pi.gov.br |

## O que o sistema faz

- **Numeração automática de processo**: `PML-AAAA-NNNNNN`, sequencial por
  ano, gerado no momento da abertura (não pode ser reaproveitado nem
  editado manualmente).
- **Renomeação automática dos arquivos** no upload, no padrão:
  `{código do documento}_{nome do documento}_{número do processo}_{AAAA-MM-DD}_v{versão}.{extensão}`
  Ex.: `08_Ordem-de-Servico-Autorizacao-de-Inicio_PML-2026-000001_2026-08-17_v1.pdf`
- **Organização por tipo e por fase**: cada processo mostra seus
  documentos agrupados nos 6 blocos do pacote original (A—Diagnóstico,
  B—Manuais de Função, C—Nomeação e Início, D—Fiscalização e
  Recebimento, E—Almoxarifado e Patrimônio, F—Controle Interno e
  Pagamento), na mesma ordem numérica 00–25.
- **Checklist flexível, não travado**: cada tipo de documento carrega o
  checklist orientativo extraído do próprio modelo (os itens SIM/NÃO/N-A
  dos formulários). Preencher é opcional; o que ficar como "pendente"
  aparece como aviso no topo do processo, mas nunca impede o upload de
  outros documentos nem o andamento do processo.
- **Avisos de regularização**: painel de conformidade mostra quantos
  documentos obrigatórios (Nível 1 do Relatório de Diagnóstico, doc. 02)
  já foram anexados e quais ainda faltam, com percentual.
- **Tela de visualização e consulta**: todo documento pode ser aberto
  (`/documentos/:id/visualizar`) para consulta rápida, independente da
  permissão de download.
- **Download controlável por documento**: quem cria/anexa decide se o
  arquivo pode ser baixado por todos ou apenas consultado; Controladoria
  e Administrador sempre podem baixar (auditoria). O botão de bloquear/
  liberar fica disponível a esses dois perfis.
- **Papéis e permissões**: admin, controladoria, fiscal, gestor,
  ordenador, almoxarifado, requisitante — cada um com o que pode criar,
  anexar, liberar download e arquivar (ver `lib/permissions.js`).
- **Histórico/auditoria** por processo: login, criação, uploads,
  visualizações, downloads e mudanças de permissão ficam registrados em
  `log_eventos`.

## Estrutura de pastas dos arquivos no disco

```
uploads/
  2026/
    PML-2026-000001/
      07_Portaria-Nomeacao-Fiscal-Gestor_PML-2026-000001_2026-08-17_v1.pdf
      08_Ordem-de-Servico-Autorizacao-de-Inicio_PML-2026-000001_2026-08-17_v1.pdf
      ...
```

## Onde ajustar o catálogo de documentos, blocos e checklist

Tudo fica em `seed/documentTypes.js`. Para adicionar um novo tipo de
documento, mudar um checklist ou reclassificar obrigatoriedade, edite
esse arquivo e rode `npm run seed` novamente (é idempotente).

## Identidade visual

O layout segue o padrão de marca da Ativa.One (Manual de Marca): navy
`#1F2A31`, teal `#3E7C7A`, sage `#CFD0AF`, bronze `#A67C52`, fundo
`#F7F6F1`, tipografia Sora (títulos) + Inter (texto), logo aplicada no
topo e na tela de login. Para trocar cores/logo, edite
`public/css/style.css` (bloco `:root`) e os arquivos em `public/img/`.

## Deploy — colocar no ar

Este pacote já inclui `Dockerfile` e `render.yaml` prontos para publicar
o sistema em uma URL pública, com HTTPS automático e disco persistente
para o banco de dados e os arquivos anexados:

1. Suba esta pasta para um repositório Git (GitHub ou GitLab).
2. Crie uma conta em [render.com](https://render.com) (ou outro provedor
   Docker — Railway e Fly.io funcionam da mesma forma).
3. No Render: **New > Blueprint**, aponte para o repositório — ele lê o
   `render.yaml` e cria o serviço, o disco persistente e a variável
   `SESSION_SECRET` automaticamente.
4. Em poucos minutos o Render fornece uma URL pública
   (ex.: `https://sgpa-miguel-leao.onrender.com`) já com HTTPS.
5. Acesse essa URL, faça login com o usuário admin do seed e troque a
   senha padrão imediatamente (tela **Usuários**).
6. Se quiser um domínio próprio (ex. `processos.miguelleao.pi.gov.br`),
   configure-o em **Settings > Custom Domains** no Render e aponte um
   registro CNAME no DNS do município para a URL gerada.

Este ambiente de trabalho não tem uma conta de hospedagem própria para
publicar em nome da Prefeitura — o passo 2 acima precisa ser feito por
alguém do município (ou eu posso te guiar tela a tela se você preferir
fazer isso comigo). Alternativa igualmente válida: instalar direto no
servidor/VPS da Prefeitura, como descrito na seção seguinte.

## Hospedagem / "rodar online" — outras opções

Este protótipo já roda como aplicação web completa (Node.js + banco
SQLite embutido) — falta apenas colocá-lo em um servidor acessível pela
rede da Prefeitura ou pela internet, com login e permissões (já
implementados). Três caminhos possíveis, do mais simples ao mais robusto:

1. **VPS simples / servidor da Prefeitura**: instalar Node.js 18+,
   copiar esta pasta, rodar com um gerenciador de processo (`pm2`) atrás
   de um proxy HTTPS (Nginx + Certbot). Baixo custo, dados ficam no
   próprio município.
2. **PaaS gerenciado** (Railway, Render, Fly.io): deploy direto do
   repositório, HTTPS automático. Atenção: nesses serviços o disco não é
   permanente por padrão — usar um volume persistente para a pasta
   `uploads/` e `data/`, ou migrar o armazenamento de arquivos para um
   bucket S3-compatível antes de ir a produção.
3. **Banco de dados**: SQLite atende bem o volume de um município
   pequeno; se o volume crescer, a troca para PostgreSQL é direta,
   mudando apenas `db.js`.

## Segurança e LGPD (pontos de atenção antes de produção real)

- Trocar `SESSION_SECRET` e as senhas padrão antes de qualquer uso real.
- Ativar HTTPS (cookie de sessão deve virar `secure: true`).
- Definir política de backup diário de `data/sgpa.sqlite` e da pasta
  `uploads/`.
- Definir prazo de guarda documental (mínimo 10 anos, conforme o Manual
  Orientativo, doc. 01) e rotina de expurgo/arquivamento morto.
- Os documentos podem conter CPF/CNPJ de fornecedores e servidores —
  tratar como dado pessoal nos termos da LGPD, com acesso restrito por
  papel (já implementado) e log de quem visualizou/baixou (já
  implementado em `log_eventos`).

## Limitações conhecidas deste protótipo

- Sem edição de processo/documento após criado (apenas nova versão via
  novo upload) — decisão intencional para preservar rastro de auditoria.
- Sem geração automática dos PDFs preenchidos a partir dos modelos
  `.docx` originais (o sistema anexa o arquivo já preenchido pelo
  usuário fora do sistema, ou pode evoluir para preencher formulários
  web e gerar o PDF).
- Sem OCR nem leitura automática de conteúdo do documento.
- Sem envio de e-mail/notificação quando algo fica pendente (pode ser
  adicionado depois, ex. resumo semanal para a Controladoria).
