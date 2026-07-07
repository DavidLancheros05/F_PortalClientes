import api from "@/services/core/api";

export const getOpcionesByPregunta = async (fp_id: number) => {
  const res = await api.get(`/parametrizacion/formulario-preguntas/${fp_id}/opciones`);
  return res;
};

export const createOpcion = async (fp_id: number, data: any) => {
  const res = await api.post(
    `/parametrizacion/formulario-preguntas/${fp_id}/opciones`,
    data,
  );
  return res.data;
};

export const updateOpcion = async (fp_id: number, id: number, data: any) => {
  const res = await api.put(
    `/parametrizacion/formulario-preguntas/${fp_id}/opciones/${id}`,
    data,
  );
  return res.data;
};

export const deleteOpcion = async (fp_id: number, id: number) => {
  const res = await api.delete(
    `/parametrizacion/formulario-preguntas/${fp_id}/opciones/${id}`,
  );
  return res.data;
};
