"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_TENANT } from "@/lib/config";

type Assignment = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  vehicle: { plate: string };
  driver: { name: string };
};

async function fetchAssignments(): Promise<Assignment[]> {
  const res = await fetch("/api/driver-assignments", {
    headers: { "x-tenant-slug": DEFAULT_TENANT },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar vínculos");
  const data = await res.json();
  return data.assignments;
}

export default function DriverAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverCpf, setDriverCpf] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAssignments()
      .then((data) => {
        if (!cancelled) setAssignments(data);
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
      const res = await fetch("/api/driver-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-slug": DEFAULT_TENANT },
        body: JSON.stringify({
          vehiclePlate,
          driverCpf,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao registrar vínculo");
      setVehiclePlate("");
      setDriverCpf("");
      setStartsAt("");
      setEndsAt("");
      setAssignments(await fetchAssignments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Vínculos condutor-veículo
        </h1>
        <p className="mt-1 text-sm text-muted">
          Registra qual condutor ficou com qual veículo em cada período — é essa base que o
          módulo de multas usa para identificar o responsável.
        </p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Placa do veículo
            <input
              required
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
              className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="ABC1D23"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            CPF do condutor
            <input
              required
              value={driverCpf}
              onChange={(e) => setDriverCpf(e.target.value.replace(/\D/g, ""))}
              className="w-36 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="12345678900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Início
            <input
              required
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="rounded border border-line bg-surface px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Fim (opcional)
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="rounded border border-line bg-surface px-2 py-1.5 text-foreground"
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
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Condutor</th>
                <th className="px-4 py-2 font-medium">Início</th>
                <th className="px-4 py-2 font-medium">Fim</th>
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
              {!loading && assignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Nenhum vínculo cadastrado.
                  </td>
                </tr>
              )}
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="text-foreground">
                  <td className="px-4 py-2">{assignment.vehicle.plate}</td>
                  <td className="px-4 py-2">{assignment.driver.name}</td>
                  <td className="px-4 py-2">
                    {new Date(assignment.startsAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2">
                    {assignment.endsAt ? new Date(assignment.endsAt).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
