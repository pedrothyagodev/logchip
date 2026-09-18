import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getTenantSlug } from "@/lib/tenant";
import { canMutate } from "@/lib/authz";

// Tolerância acima do esperado antes de marcar como suspeito (30%).
const SUSPICION_TOLERANCE = 1.3;

// GET /api/fuel-logs — lista abastecimentos do tenant, com filtro opcional por status
export async function GET(request: NextRequest) {
  const tenantSlug = await getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  const fuelLogs = await prisma.fuelLog.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status: status as never } : {}),
    },
    include: { vehicle: true },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ fuelLogs });
}

// POST /api/fuel-logs — registra um abastecimento e avalia se o volume é compatível
// com o km rodado desde o abastecimento anterior do mesmo veículo.
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  if (!canMutate(session.role)) {
    return NextResponse.json({ error: "sem permissão para essa ação" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.vehiclePlate !== "string" ||
    typeof body.odometerKm !== "number" ||
    typeof body.liters !== "number"
  ) {
    return NextResponse.json(
      { error: "placa, hodômetro e litros são obrigatórios" },
      { status: 400 }
    );
  }
  if (body.odometerKm <= 0 || body.liters <= 0) {
    return NextResponse.json(
      { error: "hodômetro e litros devem ser maiores que zero" },
      { status: 400 }
    );
  }
  if (typeof body.occurredAt !== "string") {
    return NextResponse.json({ error: "data do abastecimento é obrigatória" }, { status: 400 });
  }

  const occurredAt = new Date(body.occurredAt);
  if (isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "data do abastecimento inválida" }, { status: 400 });
  }

  const plate = body.vehiclePlate.toUpperCase().replace(/[\s-]/g, "");
  const vehicle = await prisma.vehicle.findUnique({
    where: { tenantId_plate: { tenantId: tenant.id, plate } },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "veículo não encontrado" }, { status: 404 });
  }

  const totalCost = typeof body.totalCost === "number" ? body.totalCost : undefined;
  const station = typeof body.station === "string" ? body.station : undefined;

  // Abastecimento imediatamente anterior a este, pelo hodômetro (não pela ordem de
  // criação), já que a planilha pode ser importada fora de ordem cronológica.
  const previous = await prisma.fuelLog.findFirst({
    where: { vehicleId: vehicle.id, odometerKm: { lt: body.odometerKm } },
    orderBy: { odometerKm: "desc" },
  });

  let status: "OK" | "SUSPICIOUS" | "UNVERIFIED" = "UNVERIFIED";
  let expectedLiters: number | undefined;

  if (previous && vehicle.avgConsumptionKmPerLiter) {
    const kmDriven = body.odometerKm - previous.odometerKm;
    expectedLiters = kmDriven / vehicle.avgConsumptionKmPerLiter;
    status = body.liters > expectedLiters * SUSPICION_TOLERANCE ? "SUSPICIOUS" : "OK";
  }

  const fuelLog = await prisma.fuelLog.create({
    data: {
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      odometerKm: body.odometerKm,
      liters: body.liters,
      totalCost,
      station,
      occurredAt,
      status,
      expectedLiters,
    },
  });

  return NextResponse.json({ fuelLog }, { status: 201 });
}
