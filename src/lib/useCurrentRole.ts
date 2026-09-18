"use client";

import { useEffect, useState } from "react";

// Busca a role do usuário autenticado, pra telas esconderem ações que ele não pode fazer.
export function useCurrentRole(): string | null {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setRole(data.role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
