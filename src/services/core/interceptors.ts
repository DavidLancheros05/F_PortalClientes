import { AxiosInstance } from "axios";
import { navigate } from "./navigation";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export const setupInterceptors = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || getCookie("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        navigate("/login");
      }
      return Promise.reject(error);
    }
  );
};
