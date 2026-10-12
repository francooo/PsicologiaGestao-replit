# ConsultaPsi — app mobile (Expo)

App mobile do ConsultaPsi feito com **Expo**. Usa a **mesma API do Vercel** e o **mesmo banco Neon** do sistema web, então tudo que você faz no app aparece no web, e o contrário também.

## Como rodar no celular (Expo Go)

1. Instale o **Expo Go** no celular (Play Store ou App Store).
2. No computador, dentro desta pasta:

   ```bash
   cd mobile
   npm install
   cp .env.example .env      # já aponta para https://gestaoparaclinicas.vercel.app
   npx expo start
   ```

3. Leia o QR code com a câmera (iPhone) ou com o app Expo Go (Android).
   - O celular e o PC precisam estar na mesma rede Wi-Fi.
   - Se não estiverem, use `npx expo start --tunnel`.

> O backend precisa estar com a versão que tem o login mobile (`/api/mobile/login`). Faça o deploy no Vercel antes de testar contra produção.

### Testar contra o servidor local

Para usar o `npm run dev` da raiz em vez do Vercel, troque no `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://SEU_IP_NA_REDE:5000
```

Depois rode `npx expo start --clear`.

## Publicar para usar sem o computador ligado

Com uma conta em [expo.dev](https://expo.dev), publique o app pelo EAS Update. Depois disso, ele abre direto pelo Expo Go, sem o PC ligado:

```bash
npx eas-cli@latest login
npx eas-cli@latest update:configure
npx eas-cli@latest update --branch production --message "Primeira versão"
```

O link e o QR code do update aparecem no painel do projeto em expo.dev.

## Como funciona o login

- O app chama `POST /api/mobile/login` e recebe o id da sessão (o mesmo tipo de sessão do web, guardada na tabela `session` do Neon, com validade de 30 dias).
- Esse token fica guardado de forma segura no aparelho (`expo-secure-store`).
- Ele vai em cada requisição como `Authorization: Bearer <token>`. O servidor converte isso no cookie de sessão de sempre, então as rotas da API são as mesmas do web.
- **Login com Google:** abre `/auth/google?mobile_redirect=...` no navegador do sistema. O servidor devolve o token para o app pelo link `exp://` (no Expo Go) ou `consultapsi://`.

## Estrutura

```
src/
  app/                  rotas (expo-router)
    (auth)/             login, criar conta, recuperar senha
    (app)/(tabs)/       Início, Agenda, Pacientes, Financeiro, Mais
    (app)/...           telas empilhadas (consultas, prontuário, notas, reuniões...)
    (app)/admin/        telas só de administrador (com proteção no layout)
  api/                  cliente HTTP (URL base + Bearer) e hooks do React Query
  auth/                 sessão (SecureStore)
  components/           UI (botões, campos, folhas, gráficos) e componentes de domínio
  theme/tokens.ts       cores e fontes do visual "acolhimento"
  types/                formatos das respostas da API
  utils/                formatação, arquivos (download/compartilhar/upload), toasts
```

## Comandos úteis

```bash
npx tsc --noEmit        # checagem de tipos
npx expo lint           # lint
npx expo-doctor         # confere versões das dependências com o SDK
npx expo install <pkg>  # sempre use este para instalar pacotes nativos
```

## O que continua só no web

As telas que o paciente usa continuam só no web, por link: responder questionário (`/responder/:token`), agendamento rápido (`/quick-booking`) e o link de redefinição de senha. O app gera e compartilha esses links.
