import { AxiosInstance } from "axios";
import { transformSnakeToCamel } from "@/lib/case-transformers";

export const setupInterceptors = (api: AxiosInstance) => {
  // Ya no arma el header Authorization a mano: la cookie httpOnly pc_token
  // (Fase 1/2 de la migración de auth) viaja sola en cada request gracias a
  // `withCredentials: true` en api.ts — el navegador la manda, y como es
  // httpOnly, JS no puede leerla de todos modos (por diseño, para que un
  // XSS no la robe). El backend (JwtAuthGuard) sigue aceptando también
  // `Authorization: Bearer` para scripts/consumidores que no son este
  // frontend (mint-jwt.mjs, curl, etc.).
  api.interceptors.response.use(
    (response) => {
      // Mantener snake_case consistente de la API
      // if (response.data) {
      //   response.data = transformSnakeToCamel(response.data);
      // }
      return response;
    },
    (error) => {
      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url;
      console.error(
        `🔴 [API] ${method} ${url} → ${error.response?.status ?? "sin respuesta"}`,
        error.response?.data ?? error.message,
      );

      if (error.response?.status === 401) {
        // Limpiar el perfil cacheado antes de redirigir. La cookie
        // pc_token (httpOnly) no se puede borrar desde JS — no hace falta:
        // si el backend ya la rechazó (vencida/revocada), seguirá
        // rechazándola en cada request hasta que un login nuevo la
        // sobreescriba con un Set-Cookie fresco; no es un problema de
        // seguridad, solo queda "colgada" sin efecto. Recarga completa (no
        // router.push) para que la siguiente petición pase de nuevo por
        // proxy.ts en vez de arriesgarse a servir una página protegida ya
        // cacheada del lado del cliente.
        localStorage.clear();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};
