// Texto de cuánto le falta a un bloqueo temporal de login (Acceso a
// Clientes / Usuarios). Ver documentacion/Portal Clientes/Login permisos/
// bloqueo-temporal-login.md.
export function formatMinutosRestantes(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return "se libera en breve";
  if (minutos < 60) return `faltan ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `faltan ${horas} h ${resto} min` : `faltan ${horas} h`;
}
