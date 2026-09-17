"use client";

import { ChangeEvent, useState } from "react";
import { DEFAULT_TENANT } from "@/lib/config";
import {
  EntityImportConfig,
  IMPORT_CONFIGS,
  RowResult,
  mapAndValidateRow,
  parseSpreadsheet,
} from "@/lib/import";

type ImportOutcome = RowResult & { status: "pending" | "success" | "error"; apiError?: string };

export default function ImportPage() {
  const [activeId, setActiveId] = useState(IMPORT_CONFIGS[0].id);
  const config = IMPORT_CONFIGS.find((c) => c.id === activeId) as EntityImportConfig;

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportOutcome[]>([]);
  const [importing, setImporting] = useState(false);

  function selectConfig(id: string) {
    setActiveId(id);
    setFileName(null);
    setRows([]);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const rawRows = await parseSpreadsheet(file);
    const parsed = rawRows.map((rawRow, index) => {
      const result = mapAndValidateRow(config, rawRow, index + 2); // +2: linha 1 é o cabeçalho
      const status: ImportOutcome["status"] = result.errors.length > 0 ? "error" : "pending";
      return { ...result, status };
    });
    setRows(parsed);
    event.target.value = "";
  }

  const validCount = rows.filter((r) => r.status !== "error").length;
  const errorCount = rows.length - validCount;

  async function handleImport() {
    setImporting(true);
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === "error") continue;
      try {
        const res = await fetch(config.apiPath, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-tenant-slug": DEFAULT_TENANT },
          body: JSON.stringify(config.buildPayload(updated[i].values)),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          updated[i] = { ...updated[i], status: "error", apiError: body.error ?? "falha ao importar" };
        } else {
          updated[i] = { ...updated[i], status: "success" };
        }
      } catch {
        updated[i] = { ...updated[i], status: "error", apiError: "falha de conexão" };
      }
      setRows([...updated]);
    }
    setImporting(false);
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const failedCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Importar planilha
        </h1>
        <p className="mt-1 text-sm text-muted">
          Envie o arquivo Excel (.xlsx) da prefeitura — o sistema confere cada linha antes de
          importar de verdade.
        </p>

        <div className="mt-6 flex gap-2 border-b border-line">
          {IMPORT_CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConfig(c.id)}
              className={`px-3 py-2 text-sm font-medium ${
                c.id === activeId
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">{config.description}</p>
          {config.requiresBeforeImport && (
            <p className="mt-1 text-sm text-accent">⚠ {config.requiresBeforeImport}</p>
          )}

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover">
            Escolher arquivo (.xlsx)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </label>
          {fileName && <span className="ml-3 text-sm text-muted">{fileName}</span>}
        </div>

        {rows.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted">
                {rows.length} linhas lidas — {validCount} prontas para importar, {errorCount} com erro
                {successCount + failedCount > 0 &&
                  ` · resultado: ${successCount} importadas, ${failedCount} falharam`}
              </p>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="rounded-md bg-success px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {importing ? "Importando..." : `Confirmar importação (${validCount})`}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-hover text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Linha</th>
                    {config.fields.map((f) => (
                      <th key={f.key} className="px-4 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className="text-foreground">
                      <td className="px-4 py-2">{row.rowNumber}</td>
                      {config.fields.map((f) => (
                        <td key={f.key} className="px-4 py-2">
                          {row.values[f.key] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        {row.status === "error" && (
                          <span className="text-danger">{row.apiError ?? row.errors.join("; ")}</span>
                        )}
                        {row.status === "pending" && <span className="text-muted">Pronta</span>}
                        {row.status === "success" && (
                          <span className="text-success">Importada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
