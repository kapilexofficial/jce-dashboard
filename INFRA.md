# Infraestrutura e Dependências Externas

Mapa de todos os serviços de terceiros que mantêm o dashboard funcionando, com a separação do que está em **nome do mantenedor atual** vs. o que pertence à **JCE Transportes**.

> Última revisão: 2026-05-25

---

## 🔴 No nome do mantenedor (precisam ser transferidos em caso de handover)

| Serviço | Função | Conta atual | Como transferir |
|---|---|---|---|
| **Vercel** | Hospedagem do app (build, runtime, edge cache, cron). Domínio `dashboard.jcetrans.com.br` apontado aqui. | Team `kapilexofficials-projects` | JCE cria team Vercel próprio → `Settings → Advanced → Transfer Project`. Env vars e aliases de domínio vão junto. |
| **GitHub** | Repositório do código-fonte. | `kapilexofficial/jce-dashboard` | JCE cria org `jce-transportes` no GitHub → `Settings → Transfer ownership`. A Vercel reconecta automaticamente. |
| **Locaweb** | Registro do domínio `jcetrans.com.br`. | CPF do mantenedor | Locaweb → "Transferência de Titularidade" (processo formal com contrato). Custo: ~R$40/ano. |

---

## 🟡 Credenciais de serviços da JCE (apenas guardadas pelo mantenedor)

Contas-mãe pertencem à JCE — mantenedor só tem as credenciais técnicas no 1Password e nos env vars. Em handover, basta compartilhar/rotacionar.

| Serviço | Função | Variáveis de ambiente | Onde estão hoje |
|---|---|---|---|
| **ESL Cloud** | API REST + GraphQL + Data Export — fonte de fretes, margens, ocorrências, financeiro. | `ESL_API_BASE_URL`, `ESL_API_TOKEN`, `ESL_DATA_EXPORT_TOKEN`, `ESL_GRAPHQL_URL`, `ESL_GRAPHQL_TOKEN` | 1Password + Vercel env vars |
| **Trucks Control** | API XML do rastreador GPS — fonte oficial de KM/odômetro por veículo. | `TRUCKS_CONTROL_BASE_URL`, `TRUCKS_CONTROL_LOGIN`, `TRUCKS_CONTROL_PASSWORD` | 1Password + Vercel env vars |
| **Elithium** | API de telemetria (km/l, desempenho por veículo). | `ELITHIUM_API_URL`, `ELITHIUM_USERNAME`, `ELITHIUM_PASSWORD`, `ELITHIUM_HASH_AUTH` | 1Password + Vercel env vars |

---

## 🟠 Infraestrutura técnica auxiliar

| Serviço | Função | Conta | Plano | Handover |
|---|---|---|---|---|
| **Supabase** | Datalake do Trucks Control (histórico de sincronizações XML). | Conta do mantenedor | Free (verificar) | `Settings → Transfer project` para a org JCE. Schema atual está em `supabase/migrations/`. |

Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

---

## 🟢 Bibliotecas open-source (não exigem conta)

Tudo via `npm` — licenças MIT/Apache, sem custo:

- **Runtime:** Next.js 16, React 19, TypeScript 5
- **UI:** Tailwind CSS 4, shadcn/ui, @base-ui/react, lucide-react, @fontsource-variable/inter
- **Charts:** Recharts
- **Utils:** date-fns, clsx, class-variance-authority, tailwind-merge, tw-animate-css
- **Integrações:** @supabase/supabase-js, adm-zip (descompactar resposta XML do Trucks Control), fast-xml-parser

Versões exatas em `package.json`.

---

## ⚙️ Segredos internos do app

| Variável | Função |
|---|---|
| `CRON_SECRET` | Protege o endpoint `/api/cron/trucks-control-sync` chamado pelo cron da Vercel. Pode ser rotacionado livremente, sem dependência externa. |

---

## 📋 Ordem prática de migração (handover completo)

1. **JCE cria contas corporativas** no GitHub (org), Vercel (team) e Supabase (org) usando email do domínio jcetrans.com.br.
2. **Transferir repositório GitHub** → org da JCE. Vercel reconecta sozinha após o transfer.
3. **Transferir projeto Vercel** → team da JCE. Domínio `dashboard.jcetrans.com.br` e env vars acompanham.
4. **Transferir domínio Locaweb** via formulário de "Transferência de Titularidade" (CNPJ JCE assume).
5. **Transferir projeto Supabase** → org da JCE. Se houver muito dado acumulado, exportar/importar via `pg_dump`.
6. **Compartilhar credenciais ESL/Trucks Control/Elithium** com TI da JCE (já são contas deles — só repassar o que está no 1Password).
7. **Rotacionar `CRON_SECRET`** no Vercel após a migração.
8. **Validar deploy** em produção depois de tudo migrado: `vercel ls` + curl no domínio + login na ESL pra ver se token continua válido.

---

## 💰 Custos recorrentes pagos pelo mantenedor hoje

| Item | Valor estimado |
|---|---|
| Vercel (plano Hobby/Pro — verificar) | US$ 0 (Hobby) ou US$ 20/mês (Pro) |
| Locaweb (domínio jcetrans.com.br) | ~R$ 40/ano |
| Supabase (Free tier) | US$ 0 |
| **Custos pagos pela JCE direto** | ESL Cloud, Trucks Control, Elithium — fora deste app |

---

## 🔧 Para rodar localmente após handover

```bash
git clone git@github.com:<nova-org>/jce-dashboard.git
cd jce-dashboard
npm install
# copiar .env.local com as credenciais (pedir pro mantenedor anterior ou re-emitir via ESL/Trucks/Elithium)
npm run dev          # http://localhost:3000
```

Para deploy manual via CLI:

```bash
npx vercel link      # vincular projeto Vercel
npx vercel --prod    # publicar pra https://dashboard.jcetrans.com.br
```
