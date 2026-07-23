import { AxiosInstance } from "axios";
import { navigate } from "./navigation";
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
        navigate("/login");
      }
      return Promise.reject(error);
    }
  );
};
