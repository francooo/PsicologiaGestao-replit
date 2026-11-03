# E-mail: Acesso de administração (proposta 1b, Editorial)

## Arquivos
- `template.html`: template com variáveis `{{...}}` para o sistema de envio
- `exemplo.html`: o mesmo template preenchido com dados de exemplo (para visualizar)
- `logo-consultapsi.png`: logo com fundo branco (268×60 px, exibido em 134×30)

## Variáveis
- `{{logo_url}}`: URL pública (https) do logo. E-mails não carregam imagens locais.
- `{{granted_by}}`: nome de quem concedeu o acesso
- `{{clinic_name}}`: nome da clínica
- `{{user_email}}`: e-mail da conta do usuário
- `{{access_url}}`: link de acesso (botão e link alternativo)
- `{{privacy_url}}` / `{{terms_url}}`: links do rodapé

## Fontes (seguras para e-mail, sem importação)
- Títulos e números da lista: `Georgia, 'Times New Roman', serif`
- Texto, rótulos e botão: `Helvetica, Arial, sans-serif`

## Tipografia
- Rótulo "ACESSO DE ADMINISTRAÇÃO": 12px, negrito, espaçamento 2px, #5d7a62
- Título H1: Georgia 36px / 43px, normal, #1f3344 ("pronto" em itálico #2a7fa6). No celular: 28px
- Parágrafo: 16px / 27px, #4a5560
- Subtítulo "O que você pode fazer": Georgia 18px, #1f3344
- Itens da lista: 15px, #1f3344; números Georgia 15px, #a99bc8
- Botão: 16px negrito, branco
- "Como entrar": 14px / 23px, #3d4752
- Link alternativo: 13px, #6b747c
- Rodapé: 12px / 20px, #6b747c

## Cores
- Fundo externo: #faf8f3 (creme)
- Cartão: #ffffff
- Azul-marinho (borda superior, botão, títulos): #1f3344
- Azul ConsultaPsi (destaque e links): #2a7fa6
- Verde-sálvia (rótulo): #5d7a62
- Verde-sálvia claro (barra "Como entrar"): #8fa88f
- Lilás (traço e números): #a99bc8
- Divisórias: #e6e2d8
- Texto secundário: #4a5560 / #3d4752 / #6b747c

## Medidas
- Largura do cartão: 552px (600px com a margem externa); 100% no celular
- Borda superior do cartão: 6px #1f3344; raio 4px
- Margens internas: 48px nas laterais (24px no celular)
- Botão: largura total, 56px de altura, raio 6px (versão VML incluída para o Outlook)
