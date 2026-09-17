"use client";

import { useEffect, useState } from "react";

type Infraction = {
  id: string;
  autoNumber: string;
  code: string;
  description: string;
  occurredAt: string;
  location: string | null;
  status: string;
  deadlineAt: string | null;
  vehicle: { plate: string; model: string | null };
  driver: { name: string; cpf: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando atribuição",
  ASSIGNED: "Condutor identificado",
  SUBMITTED: "FICI enviado",
  CONFIRMED: "Confirmada",
  DISPUTED: "Contestada",
  UNASSIGNABLE: "Condutor não encontrado",
};

export default function InfractionsPage() {
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchInfractions(): Promise<Infraction[]> {
    const res = await fetch("/api/infractions");
    if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar multas");
    const data = await res.json();
    return data.infractions;
  }

  useEffect(() => {
    let cancelled = false;
    fetchInfractions()
      .then((data) => {
        if (!cancelled) setInfractions(data);
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

  async function handleAssign(id: string) {
    setAssigningId(id);
    setError(null);
    try {
      const res = await fetch(`/api/infractions/${id}/assign`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao atribuir condutor");
      setInfractions(await fetchInfractions());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Multas — módulo FICI
        </h1>
        <p className="mt-1 text-sm text-muted">
          Prefeitura de Ribeira do Amparo — atribuição de multas ao condutor responsável.
        </p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Auto</th>
                <th className="px-4 py-2 font-medium">Veículo</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Condutor</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && infractions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhuma multa cadastrada.
                  </td>
                </tr>
              )}
              {infractions.map((infraction) => (
                <tr key={infraction.id} className="text-foreground">
                  <td className="px-4 py-2">{infraction.autoNumber}</td>
                  <td className="px-4 py-2">{infraction.vehicle.plate}</td>
                  <td className="px-4 py-2">
                    {new Date(infraction.occurredAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2">{infraction.driver?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    {STATUS_LABEL[infraction.status] ?? infraction.status}
                  </td>
                  <td className="px-4 py-2">
                    {infraction.status === "PENDING" && (
                      <button
                        onClick={() => handleAssign(infraction.id)}
                        disabled={assigningId === infraction.id}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        {assigningId === infraction.id ? "Atribuindo..." : "Atribuir condutor"}
                      </button>
                    )}
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
