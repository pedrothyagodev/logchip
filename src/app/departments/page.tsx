import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const NO_DEPARTMENT = "Sem secretaria";

type DeptStats = {
  department: string;
  vehicles: number;
  pendingInfractions: number;
  suspiciousFuelLogs: number;
  excessiveIdleEvents: number;
};

function departmentKey(department: string | null): string {
  return department?.trim() || NO_DEPARTMENT;
}

async function loadDeptKpis(tenantId: string): Promise<DeptStats[]> {
  const [vehicles, infractions, fuelLogs, idleEvents] = await Promise.all([
    prisma.vehicle.findMany({ where: { tenantId }, select: { department: true } }),
    prisma.infraction.findMany({
      where: { tenantId, status: { in: ["PENDING", "UNASSIGNABLE"] } },
      select: { vehicle: { select: { department: true } } },
    }),
    prisma.fuelLog.findMany({
      where: { tenantId, status: "SUSPICIOUS" },
      select: { vehicle: { select: { department: true } } },
    }),
    prisma.idleEvent.findMany({
      where: { tenantId, status: "EXCESSIVE" },
      select: { vehicle: { select: { department: true } } },
    }),
  ]);

  const stats = new Map<string, DeptStats>();
  function bucket(department: string | null): DeptStats {
    const key = departmentKey(department);
    let entry = stats.get(key);
    if (!entry) {
      entry = { department: key, vehicles: 0, pendingInfractions: 0, suspiciousFuelLogs: 0, excessiveIdleEvents: 0 };
      stats.set(key, entry);
    }
    return entry;
  }

  vehicles.forEach((v) => bucket(v.department).vehicles++);
  infractions.forEach((i) => bucket(i.vehicle.department).pendingInfractions++);
  fuelLogs.forEach((f) => bucket(f.vehicle.department).suspiciousFuelLogs++);
  idleEvents.forEach((e) => bucket(e.vehicle.department).excessiveIdleEvents++);

  return [...stats.values()].sort((a, b) => a.department.localeCompare(b.department, "pt-BR"));
}

export default async function DepartmentsPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const stats = session ? await loadDeptKpis(session.tenantId) : [];

  return (
    <div className="flex-1 bg-bg px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          KPIs por secretaria/órgão
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cruza os indicadores dos três módulos pelo órgão responsável de cada veículo.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Secretaria/órgão</th>
                <th className="px-4 py-2 font-medium">Veículos</th>
                <th className="px-4 py-2 font-medium">Multas sem condutor</th>
                <th className="px-4 py-2 font-medium">Abastecimentos suspeitos</th>
                <th className="px-4 py-2 font-medium">Ociosidade excessiva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Nenhum veículo cadastrado.
                  </td>
                </tr>
              )}
              {stats.map((row) => (
                <tr key={row.department} className="text-foreground">
                  <td className="px-4 py-2 font-medium">{row.department}</td>
                  <td className="px-4 py-2">{row.vehicles}</td>
                  <td className={`px-4 py-2 ${row.pendingInfractions > 0 ? "text-danger" : ""}`}>
                    {row.pendingInfractions}
                  </td>
                  <td className={`px-4 py-2 ${row.suspiciousFuelLogs > 0 ? "text-danger" : ""}`}>
                    {row.suspiciousFuelLogs}
                  </td>
                  <td className={`px-4 py-2 ${row.excessiveIdleEvents > 0 ? "text-danger" : ""}`}>
                    {row.excessiveIdleEvents}
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
