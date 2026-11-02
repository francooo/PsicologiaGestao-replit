import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { FileText, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

// Public pages (no login): the Google OAuth review and the psychologists open them from the consent screen.
const OPERATOR = "AF TECH SERVICOS DE TECNOLOGIA LTDA";
const CNPJ = "60.311.539/0001-93";
const CITY = "Porto Alegre/RS";
const CONTACT = "andrewsfranco93@gmail.com";
const UPDATED = "2 de novembro de 2026";

function LegalShell({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} – ConsultaPsi`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cp-bg">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cp-sage-soft" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-80 rounded-full bg-cp-lavender-soft" />

      <header className="relative px-4 pt-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link href="/auth" aria-label="Ir para a página de entrada">
            <BrandLogo size="sm" />
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/privacidade" className="text-cp-action hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="text-cp-action hover:underline">
              Termos de Uso
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 px-4 py-6 sm:py-8">
        <article className="mx-auto max-w-3xl rounded-2xl border border-cp-divider bg-white p-6 shadow-[0_10px_40px_-20px_rgba(36,54,71,0.18)] md:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cp-sage-soft text-cp-sage-ink">{icon}</div>
            <div>
              <h1 className="text-2xl font-semibold text-cp-ink md:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-cp-muted">Última atualização: {UPDATED}</p>
            </div>
          </div>
          <div className="space-y-8 text-[15px] leading-relaxed text-cp-ink">{children}</div>
        </article>
      </main>

      <footer className="relative px-4 pb-6 text-center text-xs text-cp-muted">
        {OPERATOR} · CNPJ {CNPJ} · {CITY}
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-cp-ink">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-cp-sage">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const ExternalLink = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-cp-action hover:underline">
    {href}
  </a>
);

const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-cp-action hover:underline">
    {CONTACT}
  </a>
);

export function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade" icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}>
      <p>
        Esta Política explica como o ConsultaPsi ("Sistema"), operado por {OPERATOR}, inscrito no CNPJ {CNPJ}, com sede em{" "}
        {CITY} ("nós"), coleta, usa, armazena e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 – LGPD).
      </p>

      <Section title="1. Quem usa o Sistema">
        <p>
          O Sistema é uma ferramenta de gestão para clínicas e profissionais de psicologia. Ele é usado por administradores da clínica e
          por profissionais cadastrados ("Usuários").
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <Bullets
          items={[
            <><strong>Dados de cadastro dos Usuários:</strong> nome, e-mail, telefone e dados profissionais (como número de registro no CRP).</>,
            <><strong>Dados de agendamento:</strong> data, horário, duração e descrição dos atendimentos registrados no Sistema.</>,
            <>
              <strong>Dados da Conta Google</strong> (somente se o Usuário conectar a agenda): endereço de e-mail da conta Google e um token
              de acesso que permite criar e editar eventos na agenda do Usuário.
            </>,
            <><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e registros de acesso, usados para segurança e funcionamento do Sistema.</>,
          ]}
        />
      </Section>

      <Section title="3. Integração com o Google Calendar">
        <p>A conexão com o Google Calendar é opcional e feita pelo próprio Usuário, pelo botão "Conectar".</p>
        <Bullets
          items={[
            <>
              <strong>Permissão solicitada:</strong> <ExternalLink href="https://www.googleapis.com/auth/calendar.events" />, que permite
              criar, editar e excluir eventos.
            </>,
            <>
              <strong>Como usamos:</strong> apenas para criar e atualizar, na agenda Google do Usuário, os eventos correspondentes aos
              atendimentos agendados no Sistema. O administrador da clínica pode agendar e editar atendimentos de qualquer profissional da
              clínica; o profissional pode agendar e editar apenas os seus.
            </>,
            <>
              <strong>O que não fazemos:</strong> não lemos, analisamos nem copiamos outros eventos da agenda do Usuário; não acessamos
              e-mails, contatos, arquivos ou outros dados da Conta Google.
            </>,
            <>
              <strong>Armazenamento:</strong> guardamos somente o token de acesso (de forma criptografada) e os identificadores dos eventos
              criados pelo Sistema, para poder atualizá-los depois.
            </>,
            <>
              <strong>Desconexão:</strong> o Usuário pode desconectar a agenda a qualquer momento no Sistema ou em{" "}
              <ExternalLink href="https://myaccount.google.com/permissions" />. Ao desconectar, apagamos o token armazenado.
            </>,
          ]}
        />
        <div className="rounded-xl border border-cp-divider bg-cp-sage-soft/40 p-4">
          <p>
            <strong>Uso limitado (Google API Services User Data Policy).</strong> O uso e a transferência, para qualquer outro aplicativo,
            das informações recebidas das APIs do Google seguem a{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cp-action hover:underline"
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado. Os dados do Google não são vendidos, não são usados para publicidade e não são usados
            para treinar modelos de inteligência artificial. Nenhuma pessoa lê esses dados, exceto com o consentimento do Usuário, quando
            necessário por segurança ou para cumprir a lei.
          </p>
        </div>
      </Section>

      <Section title="4. Para que usamos os dados">
        <Bullets
          items={[
            "Prestar o serviço de gestão de agenda e atendimentos.",
            "Sincronizar atendimentos com o Google Calendar, quando autorizado.",
            "Garantir a segurança do Sistema e prevenir fraudes.",
            "Cumprir obrigações legais e regulatórias.",
          ]}
        />
      </Section>

      <Section title="5. Base legal">
        <p>
          Tratamos os dados com base na execução de contrato com a clínica e o Usuário, no consentimento (para a integração com o Google
          Calendar), no legítimo interesse (segurança) e no cumprimento de obrigação legal, conforme os artigos 7º e 11 da LGPD.
        </p>
      </Section>

      <Section title="6. Compartilhamento">
        <p>Não vendemos dados pessoais. Compartilhamos dados apenas com:</p>
        <Bullets
          items={[
            "Google, para criar e editar eventos na agenda do Usuário, quando autorizado;",
            "provedores de hospedagem e infraestrutura (como Vercel), que processam dados em nosso nome e sob obrigação de confidencialidade;",
            "autoridades, quando exigido por lei ou ordem judicial.",
          ]}
        />
      </Section>

      <Section title="7. Armazenamento e segurança">
        <p>
          Os dados são armazenados em servidores com acesso restrito, conexão criptografada (HTTPS) e controle de permissões por perfil.
          Mantemos os dados enquanto a conta estiver ativa ou pelo prazo exigido em lei. Depois disso, eles são excluídos ou anonimizados.
        </p>
      </Section>

      <Section title="8. Direitos do titular">
        <p>
          Você pode, a qualquer momento, pedir: confirmação e acesso aos seus dados; correção; anonimização, bloqueio ou exclusão;
          portabilidade; informações sobre compartilhamento; e revogação do consentimento. Para isso, escreva para <Mail />. Respondemos em
          até 15 dias.
        </p>
      </Section>

      <Section title="9. Alterações">
        <p>
          Podemos atualizar esta Política. Mudanças relevantes serão avisadas no Sistema, e a data de atualização no topo será alterada.
        </p>
      </Section>

      <Section title="10. Contato">
        <p>
          Encarregado de dados (DPO): {OPERATOR} – <Mail />.
        </p>
        <p>
          Veja também os{" "}
          <Link href="/termos" className="text-cp-action hover:underline">
            Termos de Uso
          </Link>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Termos de Uso" icon={<FileText className="h-6 w-6" aria-hidden="true" />}>
      <p>
        Estes Termos regulam o uso do ConsultaPsi ("Sistema"), oferecido por {OPERATOR}, CNPJ {CNPJ}. Ao acessar o Sistema, você
        concorda com estes Termos e com a{" "}
        <Link href="/privacidade" className="text-cp-action hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <Section title="1. O serviço">
        <p>
          O Sistema permite que clínicas e profissionais de psicologia gerenciem agendas, atendimentos e cadastros, com sincronização
          opcional com o Google Calendar.
        </p>
      </Section>

      <Section title="2. Contas e perfis">
        <Bullets
          items={[
            "O acesso é feito com login individual. Você é responsável por manter sua senha em sigilo.",
            <><strong>Administrador:</strong> gerencia a clínica e pode criar e editar agendamentos de todos os profissionais.</>,
            <><strong>Profissional:</strong> pode criar e editar apenas os próprios agendamentos.</>,
            "As informações de cadastro devem ser verdadeiras e mantidas atualizadas.",
          ]}
        />
      </Section>

      <Section title="3. Integração com o Google Calendar">
        <p>
          Ao clicar em "Conectar", você autoriza o Sistema a criar e editar eventos na sua agenda Google, conforme a Política de
          Privacidade. A conexão pode ser revogada a qualquer momento. O uso do Google Calendar também está sujeito aos termos do Google.
        </p>
      </Section>

      <Section title="4. Uso adequado">
        <p>Você se compromete a não:</p>
        <Bullets
          items={[
            "usar o Sistema para fins ilícitos ou contrários ao Código de Ética Profissional do Psicólogo;",
            "acessar dados de outros usuários sem autorização;",
            "tentar violar a segurança, copiar ou modificar o Sistema.",
          ]}
        />
      </Section>

      <Section title="5. Dados de pacientes">
        <p>
          A clínica e os profissionais são responsáveis pelos dados de pacientes que inserem no Sistema e por ter base legal para tratá-los.
          Recomendamos não incluir informações clínicas sensíveis nas descrições dos eventos enviados ao Google Calendar.
        </p>
      </Section>

      <Section title="6. Disponibilidade">
        <p>
          Buscamos manter o Sistema disponível e seguro, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (como
          hospedagem ou serviços do Google). Não nos responsabilizamos por danos indiretos decorrentes dessas interrupções.
        </p>
      </Section>

      <Section title="7. Propriedade intelectual">
        <p>O Sistema, sua marca e seu código pertencem a {OPERATOR}. Estes Termos não transferem nenhum direito sobre eles.</p>
      </Section>

      <Section title="8. Encerramento">
        <p>
          Você pode encerrar sua conta a qualquer momento. Podemos suspender contas que violem estes Termos. Após o encerramento, os dados
          são tratados conforme a Política de Privacidade.
        </p>
      </Section>

      <Section title="9. Alterações">
        <p>Podemos alterar estes Termos. Mudanças relevantes serão avisadas no Sistema.</p>
      </Section>

      <Section title="10. Lei e foro">
        <p>Estes Termos seguem a legislação brasileira. Fica eleito o foro da comarca de {CITY}.</p>
      </Section>

      <Section title="11. Contato">
        <p>
          Dúvidas: <Mail />.
        </p>
      </Section>
    </LegalShell>
  );
}
