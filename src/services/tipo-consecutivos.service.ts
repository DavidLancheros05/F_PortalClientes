import api from '@/services/core/api';

const API_URL = 'consecutivos/tipos';

export const tipoConsecutivosService = {
  async getAll() {
    const response = await api.get(`${API_URL}/all`);
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`${API_URL}/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post(API_URL, data);
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await api.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`${API_URL}/${id}`);
    return response.data;
  },
};
