/**
 * Servicio para acceder a los módulos del usuario
 */
import api from "@/services/core/api";

interface Permiso {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

export interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta?: string;
  mod_icono?: string;
  mod_posicion: number;
  mod_padre_id?: number | null;
  mod_activo: boolean;
  permisos: Permiso;
  subModulos?: Modulo[];
}

interface ModuloManagement {
  mod_id: number;
  mod_codigo?: string;
  mod_nombre: string;
  mod_ruta: string;
  mod_icono?: string;
  mod_posicion?: number;
  mod_padre_id?: number | null;
  mod_activo?: boolean;
  subModulos: ModuloManagement[];
}

export const modulosService = {
  /**
   * Obtener todos los módulos del usuario desde localStorage
   */
  getAll(): Modulo[] {
    if (typeof window === "undefined") return [];
    const modulos = localStorage.getItem("modulos");
    return modulos ? JSON.parse(modulos) : [];
  },

  /**
   * Obtener un módulo por ID
   */
  getById(moduloId: number): Modulo | null {
    const modulos = this.getAll();
    return this.buscarEnArbol(modulos, moduloId) || null;
  },

  /**
   * Verificar si el usuario tiene un permiso en un módulo
   */
  tienePermiso(moduloId: number, permiso: keyof Permiso): boolean {
    const modulo = this.getById(moduloId);
    return modulo ? modulo.permisos[permiso] : false;
  },

  /**
   * Obtener submódulos de un módulo padre
   */
  getSubModulos(moduloId: number): Modulo[] {
    const modulo = this.getById(moduloId);
    return modulo?.subModulos || [];
  },

  /**
   * Buscar módulo en árbol recursivamente (privado)
   */
  buscarEnArbol(modulos: Modulo[], id: number): Modulo | null {
    for (const m of modulos) {
      if (m.mod_id === id) return m;
      if (m.subModulos) {
        const encontrado = this.buscarEnArbol(m.subModulos, id);
        if (encontrado) return encontrado;
      }
    }
    return null;
  },

  /**
   * Limpiar módulos (logout)
   */
  clear(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("modulos");
    }
  },
};

// Servicio para gestión de módulos (administración)
export const modulosManagementService = {
  async getAllModulos(): Promise<ModuloManagement[]> {
    try {
      console.log("[modulosManagementService] Llamando a /seguridad/modulos");
      console.log("[modulosManagementService] BaseURL:", api.defaults.baseURL);
      const response = await api.get("/seguridad/modulos");
      console.log("[modulosManagementService] Respuesta exitosa:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[modulosManagementService] Error:", error.message);
      console.error("[modulosManagementService] URL intentada:", error.config?.url);
      console.error("[modulosManagementService] Status:", error.response?.status);
      throw error;
    }
  },

  async createModulo(data: {
    nombre: string;
    ruta: string;
    padre_id: number | null;
    icono: string;
    orden: number;
  }): Promise<ModuloManagement> {
    try {
      const response = await api.post("/seguridad/modulos", data);
      return response.data;
    } catch (error) {
      console.error("[modulosManagementService] Error creando modulo:", error);
      throw error;
    }
  },

  async updateModulo(
    id: number,
    data: {
      nombre: string;
      ruta: string;
      padre_id: number | null;
      icono: string;
      orden: number;
    },
  ): Promise<ModuloManagement> {
    try {
      const response = await api.put(`/seguridad/modulos/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("[modulosManagementService] Error actualizando modulo:", error);
      throw error;
    }
  },

  async deleteModulo(id: number): Promise<void> {
    try {
      await api.delete(`/seguridad/modulos/${id}`);
    } catch (error) {
      console.error("[modulosManagementService] Error eliminando modulo:", error);
      throw error;
    }
  },

  async activarModulo(id: number): Promise<ModuloManagement> {
    try {
      const response = await api.put(`/seguridad/modulos/${id}/activar`);
      return response.data;
    } catch (error) {
      console.error("[modulosManagementService] Error activando modulo:", error);
      throw error;
    }
  },
};
