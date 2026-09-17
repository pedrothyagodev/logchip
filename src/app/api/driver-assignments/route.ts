import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSlug } from "@/lib/tenant";

// GET /api/driver-assignments — lista vínculos condutor-veículo do tenant
export async function GET(request: NextRequest) {
  const tenantSlug = getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenant não identificado" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const assignments = await prisma.driverAssignment.findMany({
    where: { tenantId: tenant.id },
    include: { driver: true, vehicle: true },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ assignments });
}

// POST /api/driver-assignments — registra qual condutor ficou com qual veículo num período
// (base de dados que o FICI usa para casar a multa com o condutor responsável)
export async function POST(request: NextRequest) {
  const tenantSlug = getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenant não identificado" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.vehiclePlate !== "string" || typeof body.driverCpf !== "string") {
    return NextResponse.json({ error: "placa e cpf são obrigatórios" }, { status: 400 });
  }
  if (typeof body.startsAt !== "string") {
    return NextResponse.json({ error: "início do vínculo é obrigatório" }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "data de início inválida" }, { status: 400 });
  }
  let endsAt: Date | undefined;
  if (body.endsAt) {
    endsAt = new Date(body.endsAt);
    if (isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "data de fim inválida" }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: "fim do vínculo deve ser depois do início" }, { status: 400 });
    }
  }

  const plate = body.vehiclePlate.toUpperCase().replace(/[\s-]/g, "");
  const cpf = body.driverCpf.replace(/\D/g, "");

  const vehicle = await prisma.vehicle.findUnique({
    where: { tenantId_plate: { tenantId: tenant.id, plate } },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "veículo não encontrado" }, { status: 404 });
  }

  const driver = await prisma.driver.findUnique({
    where: { tenantId_cpf: { tenantId: tenant.id, cpf } },
  });
  if (!driver) {
    return NextResponse.json({ error: "condutor não encontrado" }, { status: 404 });
  }

  const assignment = await prisma.driverAssignment.create({
    data: {
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startsAt,
      endsAt,
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
