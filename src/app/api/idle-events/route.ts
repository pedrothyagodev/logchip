import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSlug } from "@/lib/tenant";

// Acima desse limite, o período parado é sinalizado como ocioso excessivo.
const IDLE_LIMIT_MINUTES = 15;

// GET /api/idle-events — lista períodos ociosos do tenant, com filtro opcional por status
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

  const idleEvents = await prisma.idleEvent.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status: status as never } : {}),
    },
    include: { vehicle: true, driver: true },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ idleEvents });
}

// POST /api/idle-events — registra um período em que o veículo ficou ligado e parado
export async function POST(request: NextRequest) {
  const tenantSlug = await getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.vehiclePlate !== "string" ||
    typeof body.startsAt !== "string" ||
    typeof body.endsAt !== "string"
  ) {
    return NextResponse.json(
      { error: "placa, início e fim são obrigatórios" },
      { status: 400 }
    );
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "início ou fim inválido" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "fim deve ser depois do início" }, { status: 400 });
  }

  const plate = body.vehiclePlate.toUpperCase().replace(/[\s-]/g, "");
  const vehicle = await prisma.vehicle.findUnique({
    where: { tenantId_plate: { tenantId: tenant.id, plate } },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "veículo não encontrado" }, { status: 404 });
  }

  let driverId: string | undefined;
  if (typeof body.driverCpf === "string" && body.driverCpf.trim() !== "") {
    const cpf = body.driverCpf.replace(/\D/g, "");
    const driver = await prisma.driver.findUnique({
      where: { tenantId_cpf: { tenantId: tenant.id, cpf } },
    });
    if (!driver) {
      return NextResponse.json({ error: "condutor não encontrado" }, { status: 404 });
    }
    driverId = driver.id;
  }

  const location = typeof body.location === "string" ? body.location : undefined;

  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60000;
  const status = durationMinutes > IDLE_LIMIT_MINUTES ? "EXCESSIVE" : "NORMAL";

  const idleEvent = await prisma.idleEvent.create({
    data: {
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      driverId,
      startsAt,
      endsAt,
      durationMinutes,
      location,
      status,
    },
  });

  return NextResponse.json({ idleEvent }, { status: 201 });
}
