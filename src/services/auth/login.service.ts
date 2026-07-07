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

console.log("fronted services")

export const loginService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await api.post("/auth/login", payload);
    // console.log("[loginService] login response:", res);
    return res.data;
  },
};
