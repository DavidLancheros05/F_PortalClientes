import { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import { transformSnakeToCamel } from "@/lib/case-transformers";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export const setupInterceptors = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || getCookie("pc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

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
        // Limpiar credenciales inválidas antes de redirigir — si no, el
        // interceptor de request sigue reenviando el token vencido en cada
        // llamada siguiente, generando 401 repetidos hasta un login manual.
        // Recarga completa (no router.push) por la misma razón que el
        // logout explícito en Header.tsx: garantiza que la siguiente
        // petición pase de nuevo por proxy.ts en vez de arriesgarse a
        // servir una página protegida ya cacheada del lado del cliente.
        localStorage.clear();
        Cookies.remove("pc_token");
        Cookies.remove("token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};
