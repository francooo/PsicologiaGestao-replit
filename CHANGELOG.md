# Changelog

## [28/10/2026] Multi-empresa e Assistente

### Multi-empresa (SaaS multi-clínica)
- Cada clínica (empresa) tem dados isolados: pacientes, agenda, salas, financeiro, notas, comissões, reuniões e cuidados.
- Um usuário pode pertencer a várias clínicas, com um papel em cada uma, e troca de clínica pelo menu ("Trocar").
- Os dados que já existiam viraram a "Empresa 1". Renomeie em Configurações → Dados da empresa.
- Super admin (`PLATFORM_ADMIN_EMAILS`): tela **Empresas** para criar, renomear e suspender clínicas, convidar administradores e entrar numa clínica para dar suporte.
- Tela **Empresas → Contas sem clínica**: quem se cadastrou sem convite aparece ali e pode ser vinculado a uma clínica, com papel, ou desativado.
- Dados da clínica (nome, CNPJ, logo) nas Configurações; nome e logo aparecem no menu e nas páginas públicas.

### Assistente
- Botão flutuante no canto inferior direito (web e app) abre um chat com o assistente de IA (Groq).
- Responde perguntas sobre agenda, reservas de sala, salas livres, pacientes (só nomes) e, para administradores, financeiro e repasses.
- Prepara reservas e cancelamentos de sala; nada é gravado antes do clique em **Confirmar** no cartão.
- Aceita mensagens de voz (transcrição pelo Whisper da Groq) e lê as respostas em voz alta.
- Respeita o papel de cada pessoa: a psicóloga só vê e reserva para si mesma.
- Limite de 40 mensagens por usuário por hora (`AGENT_HOURLY_LIMIT`).

### Correções
- Reservas de sala encostadas (uma termina 10:00, outra começa 10:00) não são mais tratadas como conflito.

## [August 14, 2025] - Recent Updates

### Fixed
- **Psychologist Creation**: Resolved validation errors for `hourlyRate` field by implementing proper string-to-number conversion in schema validation
- **Financial Transactions**: Fixed `amount` field validation errors that prevented saving financial records
- **Modal UI Issues**: Corrected visibility problems with "Save" buttons in financial transaction modals

### Enhanced
- **Modal Design**: Improved modal sizing and button visibility with:
  - Increased maximum height to 90% of viewport
  - Added proper padding and spacing
  - Made save buttons full-width and more prominent
  - Added visual separators for better UX

### Technical Changes
- Updated `shared/schema.ts` to handle string/number conversion for decimal fields
- Enhanced `client/src/pages/financial.tsx` modal components
- Improved form validation and error handling
- Maintained existing functionality while fixing critical bugs

### User Experience
- Psychologist profiles can now be created successfully for existing users
- Financial transactions (income/expenses) can be saved without validation errors
- All modal dialogs now display save buttons clearly
- Forms are more responsive and user-friendly

## System Status
- ✅ Authentication system working
- ✅ Psychologist management functional
- ✅ Financial tracking operational
- ✅ Room booking system active
- ✅ Appointment scheduling working
- 🔄 WhatsApp integration configured (requires API keys)
- 🔄 Google Calendar integration configured (requires OAuth setup)