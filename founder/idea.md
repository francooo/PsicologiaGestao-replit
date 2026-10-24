# ConsultaPsi

- What it is: um sistema web + app (Android) de gestão para clínicas de psicologia que alugam salas para psicólogas, cobrindo agenda, salas, pacientes, prontuário, financeiro e notas fiscais.
- Who it is for: o dono/administrador de uma clínica de psicologia com várias salas e psicólogas parceiras (que pagam pela locação), e as próprias psicólogas que atendem nela.
- What it sells, at what price: assinatura do sistema. Preço ainda NÃO definido (questão em aberto para /founder-pricing).
- Where and how: Brasil, 100% online (web em gestaoparaclinicas.vercel.app + app Expo/Android). Português.
- Budget and constraints: produto já construído e em uso; foco agora é comparar funcionalidades e decidir o que melhorar.

## Funcionalidades que existem hoje (outubro/2026)

- Agenda: semana/dia/mês por psicóloga, status (confirmado, aguardando, concluído, cancelado, primeira sessão), tipo de sessão, compartilhar disponibilidade por WhatsApp (link de agendamento rápido para o paciente).
- Salas: cadastro, reservas por sala e horário (sem dados de paciente), calendário de ocupação.
- Reuniões online: criação de sessão com link do Google Meet, envio do link por e-mail, integração Google Calendar.
- Pacientes e prontuário: dados pessoais, anamnese, evoluções, documentos (upload, resumo por IA de PDF/DOCX), avaliações, transferência de paciente entre psicólogas.
- "Cuidados": formulários enviados ao paciente por e-mail, com link público de resposta e histórico.
- Psicólogas (admin): perfis, áreas de atuação, ativar/desativar, indicadores.
- Financeiro: receitas/despesas, fluxo de caixa com gráficos, exportação CSV.
- Notas fiscais: registro de NFS-e já emitida com leitura por IA (imagem/PDF), gestão de notas por psicóloga e status de envio por mês.
- Comissões: cálculo e pagamento de repasse das locações de sala por psicóloga.
- Permissões por função (admin, psicóloga, recepcionista).
- App mobile (Android) com o mesmo backend.

## O que não existe hoje (para conferir contra concorrentes)

- Lembretes automáticos de sessão (WhatsApp/SMS/e-mail) e confirmação automática.
- Cobrança/pagamento online do paciente (Pix, cartão, link de pagamento) e recibos.
- Emissão de NFS-e ou Receita Saúde direto pelo sistema (hoje só registra a nota já emitida).
- Teleconsulta própria (hoje depende do Google Meet).
- Agenda online pública para o paciente marcar sozinho (só o link de agendamento rápido).
- Assinatura digital/ICP-Brasil de prontuário e documentos, convênios (TISS).
