import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "logchip_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

export type SessionPayload = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  name: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não configurado");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { userId, tenantId, tenantSlug, role, name } = payload as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof tenantId !== "string" ||
      typeof tenantSlug !== "string" ||
      typeof role !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }
    return { userId, tenantId, tenantSlug, role, name };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
