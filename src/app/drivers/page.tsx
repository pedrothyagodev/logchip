"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_TENANT } from "@/lib/config";

type Driver = {
  id: string;
  name: string;
  cpf: string;
  cnh: string | null;
  department: string | null;
};

async function fetchDrivers(): Promise<Driver[]> {
  const res = await fetch("/api/drivers", {
    headers: { "x-tenant-slug": DEFAULT_TENANT },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar condutores");
  const data = await res.json();
  return data.drivers;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnh, setCnh] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchDrivers()
      .then((data) => {
        if (!cancelled) setDrivers(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "erro desconhecido");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-slug": DEFAULT_TENANT },
        body: JSON.stringify({ name, cpf, cnh: cnh || undefined, department: department || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao cadastrar condutor");
      setName("");
      setCpf("");
      setCnh("");
      setDepartment("");
      setDrivers(await fetchDrivers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Condutores</h1>
        <p className="mt-1 text-sm text-muted">
          Cadastro dos servidores que dirigem os veículos da frota.
        </p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Nome
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-48 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="João da Silva"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            CPF
            <input
              required
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
              className="w-36 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="12345678900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            CNH
            <input
              value={cnh}
              onChange={(e) => setCnh(e.target.value.replace(/\D/g, ""))}
              className="w-36 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="98765432100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Secretaria/órgão
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-48 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="Secretaria de Obras"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Adicionar"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">CPF</th>
                <th className="px-4 py-2 font-medium">CNH</th>
                <th className="px-4 py-2 font-medium">Secretaria/órgão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && drivers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Nenhum condutor cadastrado.
                  </td>
                </tr>
              )}
              {drivers.map((driver) => (
                <tr key={driver.id} className="text-foreground">
                  <td className="px-4 py-2">{driver.name}</td>
                  <td className="px-4 py-2">{driver.cpf}</td>
                  <td className="px-4 py-2">{driver.cnh ?? "—"}</td>
                  <td className="px-4 py-2">{driver.department ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
