"use client";

import { changePassword } from "@/services/auth.service";
import { useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const isFormValid =
    currentPassword.trim().length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await changePassword({ currentPassword, newPassword });
      setIsError(false);
      setMessage(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cambiar Contraseña</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Contraseña actual</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Nueva contraseña</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          {newPassword.length > 0 && newPassword.length < 6 && (
            <p className="text-xs text-red-500 mt-1">Mínimo 6 caracteres</p>
          )}
        </div>
        <div>
          <label className="block mb-1">Confirmar nueva contraseña</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !isFormValid}
        >
          {loading ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-center text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
