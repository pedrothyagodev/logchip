// VIEWER só pode ler; ADMIN e MANAGER podem cadastrar/alterar dados operacionais.
export function canMutate(role: string): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
