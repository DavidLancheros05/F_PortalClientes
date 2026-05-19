import api from "@/services/core/api";

export const authService = {
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const res = await api.patch("/usuarios/change-password", data);
    return res.data;
  },
};
