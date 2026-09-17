import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSlug } from "@/lib/tenant";

// POST /api/infractions/:id/assign — identifica o condutor responsável (FICI)
// cruzando o histórico de uso do veículo com a data/hora da infração.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantSlug = getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenant não identificado" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const { id } = await params;
  const infraction = await prisma.infraction.findFirst({
    where: { id, tenantId: tenant.id },
  });
  if (!infraction) {
    return NextResponse.json({ error: "multa não encontrada" }, { status: 404 });
  }

  const assignment = await prisma.driverAssignment.findFirst({
    where: {
      tenantId: tenant.id,
      vehicleId: infraction.vehicleId,
      startsAt: { lte: infraction.occurredAt },
      OR: [{ endsAt: null }, { endsAt: { gte: infraction.occurredAt } }],
    },
    orderBy: { startsAt: "desc" },
  });

  if (!assignment) {
    const updated = await prisma.infraction.update({
      where: { id: infraction.id },
      data: { status: "UNASSIGNABLE" },
    });
    return NextResponse.json({
      infraction: updated,
      message: "nenhum condutor encontrado para o veículo no horário da infração",
    });
  }

  const updated = await prisma.infraction.update({
    where: { id: infraction.id },
    data: { driverId: assignment.driverId, status: "ASSIGNED" },
    include: { driver: true, vehicle: true },
  });

  return NextResponse.json({ infraction: updated });
}
