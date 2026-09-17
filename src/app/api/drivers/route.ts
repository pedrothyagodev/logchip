import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSlug } from "@/lib/tenant";
import { isValidCpf } from "@/lib/validators";

// GET /api/drivers — lista condutores do tenant
export async function GET(request: NextRequest) {
  const tenantSlug = await getTenantSlug(request);
  if (!tenantSlug) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "tenant não encontrado" }, { status: 404 });
  }

  const drivers = await prisma.driver.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ drivers });
}

// POST /api/drivers — cadastra um condutor (servidor)
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
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }
  if (typeof body.cpf !== "string") {
    return NextResponse.json({ error: "cpf é obrigatório" }, { status: 400 });
  }

  const cpf = body.cpf.replace(/\D/g, "");
  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: "cpf inválido" }, { status: 400 });
  }

  const name = body.name.trim();
  const cnh = typeof body.cnh === "string" ? body.cnh : undefined;
  const department = typeof body.department === "string" ? body.department : undefined;

  const existing = await prisma.driver.findUnique({
    where: { tenantId_cpf: { tenantId: tenant.id, cpf } },
  });
  if (existing) {
    return NextResponse.json({ error: "já existe um condutor com esse CPF" }, { status: 409 });
  }

  const driver = await prisma.driver.create({
    data: { tenantId: tenant.id, name, cpf, cnh, department },
  });

  return NextResponse.json({ driver }, { status: 201 });
}
