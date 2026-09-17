"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TENANT } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_TENANT);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "falha ao entrar");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-bg px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-6"
      >
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse o Logchip da sua prefeitura.</p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <label className="mt-4 block text-sm font-medium text-foreground">
          Prefeitura
          <input
            type="text"
            required
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-foreground"
            placeholder="ribeira-do-amparo"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-foreground">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-foreground"
            placeholder="seu@email.gov.br"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-foreground">
          Senha
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-foreground"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
