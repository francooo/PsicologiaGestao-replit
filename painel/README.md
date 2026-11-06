# Painel do dono — ConsultaPsi

Aplicação web separada (Vite + React + TypeScript) para a administração da plataforma acompanhar
assinantes, pagamentos, vencimentos e gerar relatórios em PDF. Conversa com a API do sistema
(`/api/platform/*`) usando token Bearer — não usa cookies.

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_API_URL` | `https://gestaoparaclinicas.vercel.app` | Endereço da API do ConsultaPsi (sem barra no fim) |

## Rodar localmente

```bash
cd painel
npm install
npm run mock                                   # API fictícia em http://localhost:5199
VITE_API_URL=http://localhost:5199 npm run dev # painel em http://localhost:5173
```

Logins do mock (senha `teste123`): `dono@consultapsi.example` (admin da plataforma) e
`marina@consultapsi.example` (sem acesso, mostra "Acesso restrito").

Verificação: `npx tsc --noEmit` e `npm run build`.

## Deploy na Vercel

1. Novo projeto na Vercel apontando para este repositório.
2. **Root Directory**: `painel` · **Framework Preset**: Vite (build `npm run build`, saída `dist`).
3. Em Environment Variables, defina `VITE_API_URL` se a API não estiver no endereço padrão.
4. O `vercel.json` já reescreve todas as rotas para `index.html` (SPA).
5. No projeto da **API**, defina `PAINEL_ORIGIN=https://<domínio-do-painel>` (sem barra no fim;
   vários separados por vírgula). Isso libera o CORS das rotas do painel e o retorno do login com
   Google para `https://<domínio-do-painel>/login`.

## Acesso

Só usuários com `isPlatformAdmin = true` entram. O token fica no `localStorage` (`painel_token`).
