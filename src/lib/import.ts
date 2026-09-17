import * as XLSX from "xlsx";

// Remove acentos e normaliza espaços/caixa para casar cabeçalhos de planilha
// digitados de formas diferentes ("Placa", "PLACA", "Nº Placa").
function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type ImportFieldKind = "text" | "date";

export type ImportField = {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  kind: ImportFieldKind;
};

export type EntityImportConfig = {
  id: string;
  title: string;
  description: string;
  apiPath: string;
  requiresBeforeImport?: string;
  fields: ImportField[];
  buildPayload: (values: Record<string, string>) => Record<string, unknown>;
};

// Datas em planilha de prefeitura costumam vir como texto "10/02/2026 14:30"
// (formato brasileiro) em vez de células de data reais — tenta os dois.
export function parseFlexibleDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const brMatch = value
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (brMatch) {
    const [, day, month, year, hour = "0", minute = "0"] = brMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    );
    return isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export async function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
}

export type RowResult = {
  rowNumber: number;
  values: Record<string, string>;
  errors: string[];
};

export function mapAndValidateRow(
  config: EntityImportConfig,
  rawRow: Record<string, unknown>,
  rowNumber: number
): RowResult {
  const normalizedRow = new Map<string, unknown>();
  for (const [header, value] of Object.entries(rawRow)) {
    normalizedRow.set(normalizeHeader(header), value);
  }

  const values: Record<string, string> = {};
  const errors: string[] = [];

  for (const field of config.fields) {
    const rawValue = field.aliases
      .map((alias) => normalizedRow.get(alias))
      .find((value) => value !== undefined && String(value).trim() !== "");

    if (rawValue === undefined) {
      if (field.required) errors.push(`"${field.label}" não encontrado`);
      continue;
    }

    if (field.kind === "date") {
      const parsed = parseFlexibleDate(rawValue);
      if (!parsed) {
        errors.push(`"${field.label}" com data inválida: "${rawValue}"`);
        continue;
      }
      values[field.key] = parsed.toISOString();
    } else {
      values[field.key] = String(rawValue).trim();
    }
  }

  return { rowNumber, values, errors };
}

export const IMPORT_CONFIGS: EntityImportConfig[] = [
  {
    id: "vehicles",
    title: "Veículos",
    description: "Colunas esperadas: placa, modelo, secretaria",
    apiPath: "/api/vehicles",
    fields: [
      { key: "plate", label: "Placa", required: true, aliases: ["placa"], kind: "text" },
      { key: "model", label: "Modelo", required: false, aliases: ["modelo"], kind: "text" },
      {
        key: "department",
        label: "Secretaria",
        required: false,
        aliases: ["secretaria", "orgao", "departamento"],
        kind: "text",
      },
    ],
    buildPayload: (v) => ({ plate: v.plate, model: v.model, department: v.department }),
  },
  {
    id: "drivers",
    title: "Condutores",
    description: "Colunas esperadas: nome, cpf, cnh, secretaria",
    apiPath: "/api/drivers",
    fields: [
      { key: "name", label: "Nome", required: true, aliases: ["nome"], kind: "text" },
      { key: "cpf", label: "CPF", required: true, aliases: ["cpf"], kind: "text" },
      { key: "cnh", label: "CNH", required: false, aliases: ["cnh"], kind: "text" },
      {
        key: "department",
        label: "Secretaria",
        required: false,
        aliases: ["secretaria", "orgao", "departamento"],
        kind: "text",
      },
    ],
    buildPayload: (v) => ({ name: v.name, cpf: v.cpf.replace(/\D/g, ""), cnh: v.cnh, department: v.department }),
  },
  {
    id: "driver-assignments",
    title: "Vínculos condutor-veículo",
    description: "Colunas esperadas: placa, cpf, inicio, fim (opcional)",
    apiPath: "/api/driver-assignments",
    requiresBeforeImport: "Importe veículos e condutores antes dos vínculos.",
    fields: [
      { key: "vehiclePlate", label: "Placa", required: true, aliases: ["placa"], kind: "text" },
      { key: "driverCpf", label: "CPF", required: true, aliases: ["cpf"], kind: "text" },
      { key: "startsAt", label: "Início", required: true, aliases: ["inicio", "data inicio", "inicio da escala"], kind: "date" },
      { key: "endsAt", label: "Fim", required: false, aliases: ["fim", "data fim", "fim da escala"], kind: "date" },
    ],
    buildPayload: (v) => ({
      vehiclePlate: v.vehiclePlate,
      driverCpf: v.driverCpf.replace(/\D/g, ""),
      startsAt: v.startsAt,
      endsAt: v.endsAt || undefined,
    }),
  },
  {
    id: "infractions",
    title: "Multas",
    description: "Colunas esperadas: placa, auto, codigo, descricao, data, local, prazo (opcional)",
    apiPath: "/api/infractions",
    requiresBeforeImport: "Importe os veículos antes das multas.",
    fields: [
      { key: "vehiclePlate", label: "Placa", required: true, aliases: ["placa"], kind: "text" },
      { key: "autoNumber", label: "Nº do auto", required: true, aliases: ["auto", "numero do auto", "n do auto"], kind: "text" },
      { key: "code", label: "Código CTB", required: true, aliases: ["codigo", "codigo ctb"], kind: "text" },
      { key: "description", label: "Descrição", required: true, aliases: ["descricao"], kind: "text" },
      { key: "occurredAt", label: "Data da infração", required: true, aliases: ["data", "data da infracao"], kind: "date" },
      { key: "location", label: "Local", required: false, aliases: ["local"], kind: "text" },
      { key: "deadlineAt", label: "Prazo de indicação", required: false, aliases: ["prazo", "prazo de indicacao"], kind: "date" },
    ],
    buildPayload: (v) => ({
      vehiclePlate: v.vehiclePlate,
      autoNumber: v.autoNumber,
      code: v.code,
      description: v.description,
      occurredAt: v.occurredAt,
      location: v.location || undefined,
      deadlineAt: v.deadlineAt || undefined,
    }),
  },
];
