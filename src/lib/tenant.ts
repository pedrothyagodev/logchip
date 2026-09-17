import { NextRequest } from "next/server";

/**
 * Resolve o tenant da requisição. Por enquanto usa o header `x-tenant-slug`
 * (setado pelo middleware/subdomínio mais tarde); autenticação real entra
 * quando o login por prefeitura for implementado.
 */
export function getTenantSlug(request: NextRequest): string | null {
  return request.headers.get("x-tenant-slug");
}
