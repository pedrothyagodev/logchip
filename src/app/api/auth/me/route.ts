import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/tenant";

// GET /api/auth/me — retorna nome, role e tenant do usuário autenticado
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  return NextResponse.json({
    name: session.name,
    role: session.role,
    tenantSlug: session.tenantSlug,
  });
}
