import api from "@/services/core/api";

interface LoginPayload {
  identifier: string;
  password: string;
  accessType: "cliente" | "usuario";
}

interface LoginResponse {
  token: string;
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
  }): Promise<{ ok: boolean; mensaje: string }> => {
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
