// Claves de localStorage que pertenecen a la sesión (usuario/módulos
// cacheados) — se limpian al cerrar sesión o cuando el token expira (401).
// Deliberadamente NO incluye las preferencias "por dispositivo" que deben
// sobrevivir al logout: pc_menu_position, pc_sidebar_collapsed,
// pc_menu_favoritos (ver useMenuPosition/useSidebarCollapsed/useFavorites).
const SESSION_KEYS = ["user", "modulos"];

export function clearSessionStorage() {
  for (const key of SESSION_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage no disponible — no hay nada que limpiar.
    }
  }
}
