import api from "@/services/core/api";

export interface Pais {
  pais_id: number;
  pais_codigo: string;
  pais_nombre: string;
}

export interface Departamento {
  depto_id: number;
  pais_id: number;
  depto_nombre: string;
}

export interface Ciudad {
  ciudad_id: number;
  depto_id: number;
  ciudad_nombre: string;
}

export const maestrosService = {
  getPaises: async (): Promise<Pais[]> => {
    const res = await api.get("/maestros/paises");
    return Array.isArray(res.data) ? res.data : [];
  },

  getDepartamentos: async (pais_id: number): Promise<Departamento[]> => {
    const res = await api.get("/maestros/departamentos", {
      params: { pais_id },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  getCiudades: async (depto_id: number): Promise<Ciudad[]> => {
    const res = await api.get("/maestros/ciudades", { params: { depto_id } });
    return Array.isArray(res.data) ? res.data : [];
  },
};
