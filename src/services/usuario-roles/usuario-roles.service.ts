import api from "@/services/core/api";

export interface Usuario {
  usr_id: number;
  usuario_nombre: string;
  usuario_correo?: string;
}

export interface Rol {
  rol_id: number;
  rol_nombre: string;
  rol_codigo: string;
}

export interface UsuarioRol {
  usuarioId: number;
  rolId: number;
  rolNombre: string;
  rolCodigo: string;
  activo: boolean;
  createdAt: string;
}

export const usuarioRolesService = {
  getAllUsuarios: async (): Promise<Usuario[]> => {
    const res = await api.get(`/usuario-roles/usuarios`);
    return res.data;
  },

  getByUsuario: async (usuarioId: number): Promise<UsuarioRol[]> => {
    const res = await api.get(`/usuario-roles/${usuarioId}`);
    return res.data;
  },

  assignRole: async (usuarioId: number, rolId: number): Promise<UsuarioRol> => {
    const res = await api.post(`/usuario-roles/${usuarioId}/${rolId}`);
    return res.data;
  },

  removeRole: async (usuarioId: number, rolId: number): Promise<void> => {
    await api.delete(`/usuario-roles/${usuarioId}/${rolId}`);
  },

  toggleRole: async (usuarioId: number, rolId: number): Promise<UsuarioRol> => {
    const res = await api.post(`/usuario-roles/${usuarioId}/${rolId}/toggle`);
    return res.data;
  },
};
