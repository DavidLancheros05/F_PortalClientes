import api from "@/services/core/api";

interface LoginPayload {
  identifier: string;
  password: string;
  accessType: "cliente" | "usuario";
  captchaToken?: string;
}

interface LoginResponse {
  // Fase 4 de la migración de auth (ver
  // B_PortalClientes/documentacion/.../migracion-auth-httponly.md): el JWT
  // ya no viaja en el body de /auth/login, solo en la cookie httpOnly.
  user: any;
  modulos?: any[];
}

export const loginService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await api.post("/auth/login", payload);
    return res.data;
  },
  forgotPassword: async (payload: {
    identifier: string;
    accessType: "cliente" | "usuario";
  }): Promise<{ ok: boolean; mensaje: string; correoEnmascarado?: string }> => {
    const res = await api.post("/auth/forgot-password", payload);
    return res.data;
  },
  resetPassword: async (payload: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean; mensaje: string }> => {
    const res = await api.post("/auth/reset-password", payload);
    return res.data;
  },
};
