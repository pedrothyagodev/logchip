"use client";

import { FormEvent, useEffect, useState } from "react";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { canMutate } from "@/lib/authz";

type FuelLog = {
  id: string;
  odometerKm: number;
  liters: number;
  totalCost: number | null;
  station: string | null;
  occurredAt: string;
  status: string;
  expectedLiters: number | null;
  vehicle: { plate: string; model: string | null };
};

const STATUS_LABEL: Record<string, string> = {
  OK: "Normal",
  SUSPICIOUS: "Suspeito",
  UNVERIFIED: "Sem referência",
};

const STATUS_CLASS: Record<string, string> = {
  OK: "text-foreground",
  SUSPICIOUS: "text-danger",
  UNVERIFIED: "text-muted",
};

async function fetchFuelLogs(): Promise<FuelLog[]> {
  const res = await fetch("/api/fuel-logs");
  if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar abastecimentos");
  const data = await res.json();
  return data.fuelLogs;
}

export default function FuelLogsPage() {
  const role = useCurrentRole();
  const canEdit = role != null && canMutate(role);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plate, setPlate] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [liters, setLiters] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [station, setStation] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchFuelLogs()
      .then((data) => {
        if (!cancelled) setFuelLogs(data);
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
      const res = await fetch("/api/fuel-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiclePlate: plate,
          odometerKm: Number(odometerKm),
          liters: Number(liters),
          totalCost: totalCost ? Number(totalCost) : undefined,
          station: station || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao registrar abastecimento");
      setPlate("");
      setOdometerKm("");
      setLiters("");
      setTotalCost("");
      setStation("");
      setOccurredAt("");
      setFuelLogs(await fetchFuelLogs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Combustível</h1>
        <p className="mt-1 text-sm text-muted">
          Registra abastecimentos e sinaliza volume incompatível com o km rodado desde o
          abastecimento anterior. Cadastre o consumo médio (km/l) do veículo para habilitar a
          checagem.
        </p>

        {error && (
          <p className="mt-4 rounded border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {canEdit && (
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
            Hodômetro (km)
            <input
              required
              type="number"
              min="0"
              step="1"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              className="w-32 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Litros
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              className="w-24 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Valor (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="w-28 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Posto
            <input
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-40 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Data
            <input
              required
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
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
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Placa</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Hodômetro</th>
                <th className="px-4 py-2 font-medium">Litros</th>
                <th className="px-4 py-2 font-medium">Esperado</th>
                <th className="px-4 py-2 font-medium">Posto</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && fuelLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    Nenhum abastecimento registrado.
                  </td>
                </tr>
              )}
              {fuelLogs.map((log) => (
                <tr key={log.id} className="text-foreground">
                  <td className="px-4 py-2">{log.vehicle.plate}</td>
                  <td className="px-4 py-2">{new Date(log.occurredAt).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2">{log.odometerKm.toLocaleString("pt-BR")} km</td>
                  <td className="px-4 py-2">{log.liters.toLocaleString("pt-BR")} L</td>
                  <td className="px-4 py-2">
                    {log.expectedLiters != null ? `${log.expectedLiters.toFixed(1)} L` : "—"}
                  </td>
                  <td className="px-4 py-2">{log.station ?? "—"}</td>
                  <td className={`px-4 py-2 font-medium ${STATUS_CLASS[log.status] ?? ""}`}>
                    {STATUS_LABEL[log.status] ?? log.status}
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
