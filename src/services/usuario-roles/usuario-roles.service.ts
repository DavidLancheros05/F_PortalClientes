import api from "@/services/core/api";

export interface Usuario {
  usr_id: number;
  nombre: string;
  usuario_correo?: string;
  usuario_login?: string;
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

export interface Asignacion {
  usuarioId: number;
  usuarioNombre: string;
  usuarioCorreo?: string;
  usuarioLogin?: string;
  rolId: number;
  rolNombre: string;
  rolCodigo: string;
}

export const usuarioRolesService = {
  getAllUsuarios: async (): Promise<Usuario[]> => {
    const res = await api.get(`/usuario-roles/usuarios`);
    return res.data.map((u: any) => ({
      usr_id: u.usr_id,
      nombre: u.usr_nombre,
      usuario_correo: u.usr_correo,
      usuario_login: u.usr_usuario,
    }));
  },

  getByUsuario: async (usuarioId: number): Promise<UsuarioRol[]> => {
    const res = await api.get(`/usuario-roles/${usuarioId}`);
    return res.data;
  },

  getAllAsignaciones: async (): Promise<Asignacion[]> => {
    const res = await api.get(`/usuario-roles/asignaciones`);
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
