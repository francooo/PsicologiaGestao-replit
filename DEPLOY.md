# Guia de Deploy - ConsultaPsi

Este guia explica como colocar o sistema ConsultaPsi em produção usando serviços de hospedagem modernos.

## 🚀 Opção Recomendada: Render.com

O Render é uma excelente opção pois oferece hospedagem gratuita para Web Services e PostgreSQL (com limitações) ou planos pagos acessíveis.

### Pré-requisitos
1. Seu código deve estar no GitHub (já está!).
2. Você precisa de uma conta no [Render.com](https://render.com).

### Passo 1: Banco de Dados (PostgreSQL)

Você tem duas opções:
1. **Usar o Neon DB (Atual):** Você já tem um banco no Neon. Pode continuar usando ele.
2. **Criar novo no Render:**
   - No Dashboard do Render, clique em **New +** -> **PostgreSQL**.
   - Dê um nome (ex: `consultapsi-db`).
   - Copie a `Internal Database URL` (para uso interno no Render) ou `External Database URL`.

### Passo 2: Web Service (Aplicação)

1. No Dashboard, clique em **New +** -> **Web Service**.
2. Conecte sua conta do GitHub e selecione o repositório `PsicologiaGestao-replit`.
3. Configure:
   - **Name:** `consultapsi` (ou outro de sua escolha)
   - **Region:** Escolha a mais próxima (ex: Ohio ou Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

### Passo 3: Variáveis de Ambiente

Na aba **Environment** do seu Web Service, adicione as seguintes variáveis:

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `DATABASE_URL` | `postgresql://...` | Sua URL de conexão (do Neon ou Render) |
| `RESEND_API_KEY` | `re_VnJA3...` | Sua chave da API do Resend |
| `NODE_ENV` | `production` | Define ambiente de produção |
| `SESSION_SECRET` | `(crie uma senha longa)` | Usado para criptografar sessões |
| `APP_URL` | `https://seu-app.onrender.com` | URL que o Render vai gerar para você |

### Passo 4: Deploy

1. Clique em **Create Web Service**.
2. O Render vai clonar, instalar dependências, fazer o build e iniciar.
3. Acompanhe os logs. Se aparecer `serving on port ...`, está funcionando!

---

## 🚂 Opção Alternativa: Railway.app

O Railway é muito simples de usar e detecta configurações automaticamente.

1. Crie uma conta no [Railway.app](https://railway.app).
2. Clique em **New Project** -> **Deploy from GitHub repo**.
3. Selecione seu repositório.
4. O Railway vai detectar que é um projeto Node.js.
5. Vá em **Variables** e adicione as mesmas variáveis citadas acima (`DATABASE_URL`, `RESEND_API_KEY`, etc).
6. O Railway gera um domínio automático para você.

---

## ⚠️ Importante sobre o Banco de Dados

### Migrations
O sistema usa Drizzle ORM. Em produção, as tabelas precisam ser criadas.
O comando `npm run build` não roda as migrations automaticamente.

**Como rodar migrations em produção:**
No Render, você pode adicionar um "Job" ou rodar via Shell (se disponível no plano pago), ou conectar localmente no banco de produção e rodar `npm run db:push`.

**Recomendação:**
Mantenha o banco Neon que você já está usando. Ele já tem as tabelas criadas e dados inseridos. Apenas certifique-se de usar a mesma `DATABASE_URL` no Render.

## 📧 Configuração de Email (Resend)

Lembre-se:
- Em **produção**, você deve configurar um domínio verificado no Resend (ex: `mg.suaclinica.com.br`) para enviar emails para qualquer pessoa.
- Enquanto estiver no modo "Teste" do Resend, emails só chegam para o email cadastrado na conta Resend.

## 🔍 Verificação Pós-Deploy

1. Acesse a URL gerada (ex: `https://consultapsi.onrender.com`).
2. Tente fazer login.
3. Teste a recuperação de senha (verifique se o link no email aponta para a URL correta).
