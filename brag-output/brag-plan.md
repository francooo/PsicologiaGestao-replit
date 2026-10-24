# Brag plan — ConsultaPsi

**What:** ConsultaPsi é um sistema web + app Android para clínicas de psicologia que alugam salas para psicólogas: agenda, salas, prontuário, financeiro, notas fiscais e repasses.
**For whom:** donos(as) de clínica com várias salas e psicólogas parceiras, e as próprias psicólogas.
**Sets it apart:** feito para o modelo "clínica que aluga sala": reservas de sala + comissão/repasse calculado, junto com prontuário com resumo por IA.
**Most impressive claim:** anamnese em PDF vira resumo clínico em quatro blocos, salvo sem gastar IA de novo.
**Visual hook:** cinco tarefas da clínica explodem na tela como chips pastel e se fundem nas folhas do logo.
**Real UI shown:** Agenda de hoje (dashboard), modal "Resumo IA", reservas de salas + comissões. Recriadas com os tokens `cp-*`, o SVG do logo e as folhas do `auth-background.tsx`.
**Tone:** `polished` com a calma do visual "acolhimento", porém com ritmo.
**Share caption:** "Agenda, salas, prontuário com resumo por IA e repasse das psicólogas num lugar só. Organização também cuida."

**Privacy:** the dashboard mock shows the admin's real name; the video uses no real names. Patients/psychologists are fictional (Ana Martins, Carla Souza, Lucas Ferraz from the design mock; Beatriz Lima, Dra. Helena Prado invented). Money and dates are illustrative UI.

## Identity
Bg #FBFAF7, ink #243647, action #287EA5, sage #8BA798/#E3EBE5, lavender #DCD8EA/#5B5486, sand #EDE3D5/#8A6A45. Font DM Sans. Logo: leaf SVG from brand-logo.tsx.

## Format
Instagram Reels: 1080×1920 (9:16), 30fps, H.264 + AAC, 53.75s. Titles sit at y≈290–510 and product UI at y≈630–1500, inside the Reels safe area (top ~220px and bottom ~380px are covered by Instagram UI). No URL in the video.

## Music
96 BPM (beat 0.625s), F major (Fmaj7 · Am7 · B♭maj7 · C). Pad + plucked arpeggio + soft kick/rim/shaker; drums breathe in Cuidados (beats 40–48); bell motif enters at beat 48. Every click/tap/confirmation sound is on the grid and in key.

## Storyboard (86 beats = 53.75s)
| # | Beats | Time | Scene |
|---|---|---|---|
| 1 Hook | 0–6 | 0–3.75 | "Uma clínica de psicologia é…" + 5 chips pop, fly into the logo |
| 2 Reveal | 6–12 | 3.75–7.5 | Leaves bloom → ConsultaPsi, "Seu consultório, mais leve de organizar." |
| 3 Agendamento | 12–24 | 7.5–15 | Steps 1-2-3: share availability → "Gerar link do WhatsApp"; patient phone picks 14:00 → "Agendamento solicitado!"; agenda gets "Aguardando" → Confirmar → Primeira sessão |
| 4 Reuniões | 24–32 | 15–20 | Nova reunião (50 min, enviar link) → Meet link + e-mail → Iniciar sessão → live banner with timer |
| 5 Prontuário | 32–40 | 20–25 | Ana Martins record → Documentos → Resumo IA, 4 sections fill on beats |
| 6 Cuidados | 40–48 | 25–30 | Send Check-in Semanal → patient answers on her page → Enviado/Aberto/Respondido + answer |
| 7 Salas | 48–56 | 30–35 | Room becomes Ocupada, commission counts up, Marcar como pago |
| 8 Notas fiscais | 56–64 | 35–40 | NFS-e image scanned, IA fills fields, Registrar nota |
| 9 Financeiro | 64–70 | 40–43.75 | Fluxo de Caixa Diário: KPIs, bars, saldo line, Exportar CSV |
| 10 Mobile | 70–80 | 43.75–50 | Android app: Início → Agenda tab → Mais grid |
| 11 Outro | 80–86 | 50–53.75 | Logo, "Organização também cuida.", Web · App Android |
