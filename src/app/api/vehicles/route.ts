import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSlug } from "@/lib/tenant";
import { isValidPlate } from "@/lib/validators";

// GET /api/vehicles — lista veículos do tenant
export async function GET(request: NextRequest) {
  const tenantSlug = await getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: tenant.id },
    orderBy: { plate: "asc" },
  });

  return NextResponse.json({ vehicles });
}

// POST /api/vehicles — cadastra um veículo da frota
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
  if (!body || typeof body.plate !== "string") {
    return NextResponse.json({ error: "placa é obrigatória" }, { status: 400 });
  }

  const plate = body.plate.toUpperCase().replace(/[\s-]/g, "");
  if (!isValidPlate(plate)) {
    return NextResponse.json({ error: "placa em formato inválido" }, { status: 400 });
  }

  const model = typeof body.model === "string" ? body.model : undefined;
  const department = typeof body.department === "string" ? body.department : undefined;
  const avgConsumptionKmPerLiter =
    typeof body.avgConsumptionKmPerLiter === "number" ? body.avgConsumptionKmPerLiter : undefined;

  const existing = await prisma.vehicle.findUnique({
    where: { tenantId_plate: { tenantId: tenant.id, plate } },
  });
  if (existing) {
    return NextResponse.json({ error: "já existe um veículo com essa placa" }, { status: 409 });
  }

  const vehicle = await prisma.vehicle.create({
    data: { tenantId: tenant.id, plate, model, department, avgConsumptionKmPerLiter },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
