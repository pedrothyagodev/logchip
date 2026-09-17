import Link from "next/link";

const LINKS = [
  { href: "/infractions", label: "Multas (FICI)" },
  { href: "/vehicles", label: "Veículos" },
  { href: "/drivers", label: "Condutores" },
  { href: "/driver-assignments", label: "Vínculos" },
  { href: "/import", label: "Importar planilha" },
];

function RoadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3 4 21" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3l4 18" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 5v3M12 12v3M12 19v1" stroke="var(--color-foreground)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Nav() {
  return (
    <div>
      <nav className="bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <RoadIcon />
            Logchip
          </Link>
          <div className="flex gap-5 text-sm text-muted">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-accent">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="road-divider" />
    </div>
  );
}
