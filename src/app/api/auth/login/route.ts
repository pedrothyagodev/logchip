import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

const IP_LIMIT = 20;
const IP_WINDOW_SECONDS = 15 * 60;
const ACCOUNT_LIMIT = 5;
const ACCOUNT_WINDOW_SECONDS = 15 * 60;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// POST /api/auth/login — autentica um usuário dentro do tenant informado
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipCheck = checkRateLimit(`ip:${ip}`, IP_LIMIT, IP_WINDOW_SECONDS);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "muitas tentativas, tente novamente mais tarde" },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.tenantSlug !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "prefeitura, email e senha são obrigatórios" },
      { status: 400 }
    );
  }

  const tenantSlug = body.tenantSlug.trim().toLowerCase();
  const email = body.email.trim().toLowerCase();

  const accountCheck = checkRateLimit(
    `account:${tenantSlug}:${email}`,
    ACCOUNT_LIMIT,
    ACCOUNT_WINDOW_SECONDS
  );
  if (!accountCheck.allowed) {
    return NextResponse.json(
      { error: "muitas tentativas, tente novamente mais tarde" },
      { status: 429, headers: { "Retry-After": String(accountCheck.retryAfterSeconds) } }
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return NextResponse.json({ error: "credenciais inválidas" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!user) {
    return NextResponse.json({ error: "credenciais inválidas" }, { status: 401 });
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "credenciais inválidas" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: user.role,
    name: user.name,
  });

  const response = NextResponse.json({
    user: { name: user.name, email: user.email, role: user.role },
    tenant: { name: tenant.name, slug: tenant.slug },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
