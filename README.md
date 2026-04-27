# JCE Dashboard

Dashboard logístico-financeiro da **J.C.E Transportes Ltda** (CNPJ 08.966.240/0001-57) integrado à API do TMS **ESL Cloud**.

- **Produção**: https://dashboard.jcetrans.com.br
- **Stack**: Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui · Recharts · TypeScript
- **Hospedagem**: Vercel

## Como rodar localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:3000 (ou na primeira porta livre — pode ir para 3001).

Variáveis de ambiente em `.env.local`:

```
ESL_API_BASE_URL=https://jcetrans.eslcloud.com.br
ESL_API_TOKEN=<token TI_SERVICE>
ESL_DATA_EXPORT_TOKEN=<token API_JCE>
ESL_GRAPHQL_URL=https://jcetrans.eslcloud.com.br/graphql
ESL_GRAPHQL_TOKEN=<token API_JCE>
```

## Estrutura

```
src/
├── app/
│   ├── page.tsx                    # Dashboard principal (KPIs + gráficos)
│   ├── analise-fretes/             # Painel de eficiência operacional (OTD, lead time, OTD por cliente)
│   ├── fretes/                     # Listagem de fretes com filtros
│   ├── ocorrencias/                # Ocorrências de notas fiscais
│   ├── financeiro/                 # Contas a pagar/receber
│   ├── faturamento/                # Receita por sender / corporation
│   ├── fechamento/                 # Fechamento mensal consolidado
│   ├── dre/                        # DRE por veículo
│   ├── clientes/                   # Análise de clientes
│   ├── coletas/                    # Coletas via Elithium
│   ├── tracking/                   # Rastreamento por CT-e
│   ├── telemetria/                 # Telemetria de frota
│   ├── motorista/                  # Análise por motorista
│   ├── manutencao/                 # Ordens de serviço
│   ├── performance/                # Performance por usuário
│   ├── relatorios/                 # Templates de relatório do ESL
│   └── api/
│       ├── revalidate/             # Invalida cache server-side (tags)
│       ├── fretes/, financeiro/…   # Route handlers (proxies REST)
├── components/
│   ├── app-sidebar.tsx             # Navegação principal
│   ├── refresh-button.tsx          # Botão "Atualizar" no header (invalida tags + router.refresh)
│   ├── date-filter.tsx             # Filtro de período reutilizável
│   ├── dashboard/                  # Gráficos compartilhados
│   └── ui/                         # shadcn/ui (button, card, table, chart…)
└── lib/
    ├── esl-api.ts                  # Cliente da API ESL (REST + GraphQL)
    └── elithium-api.ts             # Cliente Elithium (coletas)
```

## Integração ESL Cloud

A API ESL é consumida via dois canais paralelos:

- **REST** (`/api/...`) — relatórios estruturados (margens, ocorrências, billings, veículos, analytics).
- **GraphQL** (`/graphql`) — queries com cursor pagination (fretes, manifestos, drivers, invoices). **A ESL limita 20 itens/página independente do `first`** — paginar via cursor (`after`/`endCursor`).

### Cache server-side e atualização

- Cliente HTTP em `lib/esl-api.ts` aceita `cacheOpts` opcional `{ revalidate, tags }`. Sem essa opção, usa `cache: "no-store"` (sempre fresco).
- Páginas pesadas (`/fretes`, `/analise-fretes`) usam `revalidate: 300` + tag `"freights"` → primeiro load lento, demais instantâneos.
- O botão **Atualizar** no header chama `POST /api/revalidate` (invalida as tags `freights`, `margins`, `occurrences`) e em seguida `router.refresh()`.

### Status de fretes (mapeamento)

Valores reais retornados pela API e como são exibidos:

| API | Label | Cor (Tailwind) |
|---|---|---|
| `finished`, `done` | Finalizado | `emerald` |
| `in_transit` | Em Trânsito | `blue` |
| `manifested` | Manifestado | `amber` |
| `pending` | Pendente | `muted` |
| `cancelled` | Cancelado | `red` |

> `done` é usado para `Freight::Complementary` (aditivos), `finished` para `Freight::Normal`. Semanticamente equivalentes para o usuário; agrupados sob "Finalizado".

## Painel `/analise-fretes`

Análise de eficiência operacional com base nos timestamps do ESL:

| Tempo | Origem (campo) | Significado |
|---|---|---|
| Início do serviço | `serviceAt` | Quando o frete começou a ser executado |
| Finalização | `finishedAt` | Quando foi entregue (só populado para `finished`, não para `done`) |
| Cadastro | `createdAt` | Quando o registro foi criado no ESL |
| Emissão CT-e | `draftEmissionAt` | Emissão fiscal do CT-e |
| Prazo prometido | `deliveryPredictionDate` + `deliveryPredictionHour` | Deadline cadastrado no TMS |

**KPIs**:
- **Tempo de Viagem** = média de `finishedAt − serviceAt`
- **OTD%** (On-Time Delivery) = `finishedAt ≤ deliveryPredictionDate` ÷ fretes com prazo cadastrado
- **Lead Time Admin** = `serviceAt − createdAt`
- **Atraso Médio** = `finishedAt − deliveryPredictionDate` (quando atrasou)

**OTD por Cliente (grupo)**: clientes são agrupados pelos **8 primeiros dígitos do CNPJ** (raiz da matriz). Filiais do mesmo grupo (ex: HNK ITU + HNK PASSOS = HNK BR) aparecem consolidadas. O nome do grupo é a razão social mais comum entre as ocorrências.

## Convenções

- Páginas `force-dynamic` por padrão para evitar pre-render estático com tokens.
- Server Components fazem o fetch inicial; Client Components recebem props já hidratadas e cuidam de filtros/interatividade.
- shadcn/ui via `components.json` — adicionar componentes novos com `npx shadcn@latest add <comp>`.
- Erros de fetch são tratados com `.catch(() => [])` para evitar crash da página inteira; loga em `console.error` no servidor.

## Deploy

`git push origin main` dispara build automático na Vercel. Para deploy manual: `npx vercel --prod` na pasta do projeto.
