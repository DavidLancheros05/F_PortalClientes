import api from "@/services/core/api";

export interface Usuario {
  usr_id: number;
  nombre: string;
  usuario_email: string;
  usuario_activo: boolean;
  usuario_created_at: string;
  usuario_updated_at?: string;
  rol?: {
    rol_id: number;
    rol_nombre: string;
  };
}

export const usuariosService = {
  getAll: async (): Promise<Usuario[]> => {
    const res = await api.get("/usuarios");
    return res.data;
  },

  getMe: async (): Promise<Usuario> => {
    const res = await api.get("/usuarios/me");
    return {
      ...res.data,
      rol:
        typeof res.data.rol === "object"
          ? res.data.rol
          : { nombre: res.data.rol },
    };
  },

  create: async (payload: {
    nombre: string;
    usuario_email: string;
    usuario_password: string;
    usuario_rol_id: number;
    usuario_activo?: boolean;
  }): Promise<Usuario> => {
    const res = await api.post("/usuarios", payload);
    return res.data;
  },

  update: async (
    usuarioId: number,
    payload: {
      nombre?: string;
      usuario_email?: string;
      usuario_rol_id?: number;
      usuario_activo?: boolean;
      usuario_password?: string;
    },
  ): Promise<Usuario> => {
    const res = await api.post(`/usuarios/${usuarioId}`, payload);
    return res.data;
  },

  delete: async (usuarioId: number): Promise<void> => {
    await api.delete(`/usuarios/${usuarioId}`);
  },
};
