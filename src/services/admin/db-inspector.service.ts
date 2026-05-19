import api from "@/services/core/api";

export const dbInspectorService = {
  getTables: async () => {
    const res = await api.get("/admin/db/tables");
    return res.data;
  },

  getColumns: async (tableName: string) => {
    const res = await api.get(`/admin/db/columns/${tableName}`);
    return res.data;
  },
};
