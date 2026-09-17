import { NextRequest } from "next/server";
import { SESSION_COOKIE, SessionPayload, verifySessionToken } from "@/lib/session";

/**
 * Resolve a sessão autenticada da requisição a partir do cookie de sessão.
 * Retorna null se não houver sessão válida (usuário não autenticado).
 */
export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Resolve o slug do tenant da sessão autenticada da requisição. */
export async function getTenantSlug(request: NextRequest): Promise<string | null> {
  const session = await getSession(request);
  return session?.tenantSlug ?? null;
}
