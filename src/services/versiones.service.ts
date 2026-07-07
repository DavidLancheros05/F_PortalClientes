import api from "@/services/core/api";

interface Version {
  version_id: number;
  version_numero: number;
  version_descripcion: string;
  created_at: string;
  created_by: number;
  total_preguntas: number;
}

interface Formulario {
  formulario_id: number;
  formulario_nombre: string;
  formulario_version: number;
  formulario_activo: boolean;
}

export const versionesService = {
  async obtenerVersiones(formularioId: number) {
    const response = await api.get(`/parametrizacion/formularios/${formularioId}/versiones`);
    return response.data as { formulario: Formulario; versiones: Version[] };
  },

  async activarVersion(formularioId: number, versionNumero: number) {
    const response = await api.patch(
      `/parametrizacion/formularios/${formularioId}/activar-version`,
      { versionNumero }
    );
    return response.data;
  },

  async eliminarVersion(formularioId: number, versionNumero: number) {
    const response = await api.delete(
      `/parametrizacion/formularios/${formularioId}/versiones/${versionNumero}`
    );
    return response.data;
  },
};
