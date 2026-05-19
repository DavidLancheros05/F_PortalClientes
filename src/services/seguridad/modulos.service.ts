import api from "@/services/core/api";

export interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string;
  mod_icono?: string;
  mod_padre_id?: number;
  permisos?: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
  };
  subModulos?: Modulo[];
}

export const modulosService = {
  getAll: async (): Promise<Modulo[]> => {
    const res = await api.get("/seguridad/modulos");
    return res.data;
  },
};
