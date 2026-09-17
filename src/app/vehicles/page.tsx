"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_TENANT } from "@/lib/config";

type Vehicle = {
  id: string;
  plate: string;
  model: string | null;
  department: string | null;
};

async function fetchVehicles(): Promise<Vehicle[]> {
  const res = await fetch("/api/vehicles", {
    headers: { "x-tenant-slug": DEFAULT_TENANT },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "erro ao carregar veículos");
  const data = await res.json();
  return data.vehicles;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchVehicles()
      .then((data) => {
        if (!cancelled) setVehicles(data);
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
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-slug": DEFAULT_TENANT },
        body: JSON.stringify({ plate, model: model || undefined, department: department || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "erro ao cadastrar veículo");
      setPlate("");
      setModel("");
      setDepartment("");
      setVehicles(await fetchVehicles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Veículos</h1>
        <p className="mt-1 text-sm text-muted">Cadastro da frota da prefeitura.</p>

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
            Modelo
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-40 rounded border border-line bg-surface px-2 py-1.5 text-foreground"
              placeholder="Fiat Strada"
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
                <th className="px-4 py-2 font-medium">Placa</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Secretaria/órgão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Nenhum veículo cadastrado.
                  </td>
                </tr>
              )}
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="text-foreground">
                  <td className="px-4 py-2">{vehicle.plate}</td>
                  <td className="px-4 py-2">{vehicle.model ?? "—"}</td>
                  <td className="px-4 py-2">{vehicle.department ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
