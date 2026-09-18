"use client";

import { FormEvent, useEffect, useState } from "react";

type IdleEvent = {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  location: string | null;
  status: string;
  vehicle: { plate: string; model: string | null };
  driver: { name: string; cpf: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  EXCESSIVE: "Ocioso excessivo",
};

const STATUS_CLASS: Record<string, string> = {
  NORMAL: "text-foreground",
  EXCESSIVE: "text-danger",
};

async function fetchIdleEvents(): Promise<IdleEvent[]> {
  const res = await fetch("/api/idle-events");
  if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar períodos ociosos");
  const data = await res.json();
  return data.idleEvents;
}

export default function IdleEventsPage() {
  const [idleEvents, setIdleEvents] = useState<IdleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plate, setPlate] = useState("");
  const [driverCpf, setDriverCpf] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchIdleEvents()
      .then((data) => {
        if (!cancelled) setIdleEvents(data);
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
      const res = await fetch("/api/idle-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiclePlate: plate,
          driverCpf: driverCpf || undefined,
          location: location || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao registrar período ocioso");
      setPlate("");
      setDriverCpf("");
      setLocation("");
      setStartsAt("");
      setEndsAt("");
      setIdleEvents(await fetchIdleEvents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tempo ocioso</h1>
        <p className="mt-1 text-sm text-muted">
          Registra períodos em que o veículo ficou ligado e parado, sinalizando quando passam de
          15 minutos.
        </p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Placa
            <input
              required
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="ABC1D23"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            CPF do condutor
            <input
              value={driverCpf}
              onChange={(e) => setDriverCpf(e.target.value)}
              className="w-36 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="opcional"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Local
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-40 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="opcional"
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
            Fim
            <input
              required
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
            {submitting ? "Salvando..." : "Registrar"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Placa</th>
                <th className="px-4 py-2 font-medium">Condutor</th>
                <th className="px-4 py-2 font-medium">Início</th>
                <th className="px-4 py-2 font-medium">Duração</th>
                <th className="px-4 py-2 font-medium">Local</th>
                <th className="px-4 py-2 font-medium">Status</th>
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
              {!loading && idleEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhum período ocioso registrado.
                  </td>
                </tr>
              )}
              {idleEvents.map((event) => (
                <tr key={event.id} className="text-foreground">
                  <td className="px-4 py-2">{event.vehicle.plate}</td>
                  <td className="px-4 py-2">{event.driver?.name ?? "—"}</td>
                  <td className="px-4 py-2">{new Date(event.startsAt).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2">{event.durationMinutes.toFixed(0)} min</td>
                  <td className="px-4 py-2">{event.location ?? "—"}</td>
                  <td className={`px-4 py-2 font-medium ${STATUS_CLASS[event.status] ?? ""}`}>
                    {STATUS_LABEL[event.status] ?? event.status}
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
