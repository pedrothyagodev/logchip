import Link from "next/link";
import { ReactNode } from "react";

function IconTicket() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M13 6v12" strokeDasharray="2 3" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 7h11v10H2z" />
      <path d="M13 10h4l3 3v4h-7z" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function IconId() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 10h4M14 14h4M5 17c0-1.7 1.8-3 4-3s4 1.3 4 3" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 15 15 9" />
      <path d="M11 6l1.5-1.5a3.5 3.5 0 0 1 5 5L16 11" />
      <path d="M13 18l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 13" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function IconFuel() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
      <path d="M4 12h10" />
      <path d="M16 8l3 2v6a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
    </svg>
  );
}

const MODULES: { href: string; title: string; description: string; icon: ReactNode }[] = [
  {
    href: "/infractions",
    title: "Multas (FICI)",
    description:
      "Atribui automaticamente cada multa ao condutor responsável, cruzando o histórico de uso do veículo.",
    icon: <IconTicket />,
  },
  {
    href: "/vehicles",
    title: "Veículos",
    description: "Cadastro da frota da prefeitura, por secretaria/órgão responsável.",
    icon: <IconTruck />,
  },
  {
    href: "/drivers",
    title: "Condutores",
    description: "Cadastro dos servidores que dirigem os veículos da frota.",
    icon: <IconId />,
  },
  {
    href: "/driver-assignments",
    title: "Vínculos condutor-veículo",
    description: "Registra qual condutor ficou com qual veículo em cada período.",
    icon: <IconLink />,
  },
  {
    href: "/fuel-logs",
    title: "Combustível",
    description: "Registra abastecimentos e sinaliza volume incompatível com o km rodado.",
    icon: <IconFuel />,
  },
  {
    href: "/import",
    title: "Importar planilha",
    description: "Envia o Excel da prefeitura com validação linha a linha antes de importar.",
    icon: <IconUpload />,
  },
];

export default function Home() {
  return (
    <div className="relative flex-1 overflow-hidden bg-bg px-6 py-16">
      <div className="hero-scene">
        <div className="lane" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Logchip</h1>
          <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
            Gestão de frotas municipais
          </span>
        </div>
        <p className="mt-2 text-muted">
          Menos multas não atribuídas, menos desvio de combustível, menos tempo ocioso.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-center gap-2 text-accent">
                {mod.icon}
                <h2 className="font-medium text-foreground">{mod.title}</h2>
              </div>
              <p className="mt-2 text-sm text-muted">{mod.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
