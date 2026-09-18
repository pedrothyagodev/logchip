import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getTenantSlug } from "@/lib/tenant";
import { canMutate } from "@/lib/authz";

// GET /api/infractions — lista multas do tenant, com filtro opcional por status (módulo FICI)
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

  const infractions = await prisma.infraction.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status: status as never } : {}),
    },
    include: { vehicle: true, driver: true },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ infractions });
}

// POST /api/infractions — registra uma nova multa recebida para atribuição (FICI)
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
    typeof body.autoNumber !== "string" ||
    typeof body.code !== "string" ||
    typeof body.description !== "string"
  ) {
    return NextResponse.json(
      { error: "placa, número do auto, código e descrição são obrigatórios" },
      { status: 400 }
    );
  }
  if (typeof body.occurredAt !== "string") {
    return NextResponse.json({ error: "data da infração é obrigatória" }, { status: 400 });
  }

  const occurredAt = new Date(body.occurredAt);
  if (isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "data da infração inválida" }, { status: 400 });
  }
  let deadlineAt: Date | undefined;
  if (body.deadlineAt) {
    deadlineAt = new Date(body.deadlineAt);
    if (isNaN(deadlineAt.getTime())) {
      return NextResponse.json({ error: "prazo de indicação inválido" }, { status: 400 });
    }
  }

  const plate = body.vehiclePlate.toUpperCase().replace(/[\s-]/g, "");

  const vehicle = await prisma.vehicle.findUnique({
    where: { tenantId_plate: { tenantId: tenant.id, plate } },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "veículo não encontrado" }, { status: 404 });
  }

  const existing = await prisma.infraction.findUnique({
    where: { tenantId_autoNumber: { tenantId: tenant.id, autoNumber: body.autoNumber } },
  });
  if (existing) {
    return NextResponse.json({ error: "já existe uma multa com esse número de auto" }, { status: 409 });
  }

  const location = typeof body.location === "string" ? body.location : undefined;

  const infraction = await prisma.infraction.create({
    data: {
      tenantId: tenant.id,
      vehicleId: vehicle.id,
      autoNumber: body.autoNumber,
      code: body.code,
      description: body.description,
      occurredAt,
      location,
      deadlineAt,
    },
  });

  return NextResponse.json({ infraction }, { status: 201 });
}
