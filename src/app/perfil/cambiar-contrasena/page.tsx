"use client";

import { authService } from "@/services/auth/auth.service";
import { clientesService } from "@/services/clientes/clientes.service";
import { useContext, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { ErrorModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";

export default function ChangePasswordPage() {
  const { user } = useContext(AuthContext);
  const esCliente = user?.rol?.nombre === "CLIENTE";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const isFormValid = currentPassword.trim().length > 0 && newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = esCliente
        ? await clientesService.cambiarPasswordPerfil({
            currentPassword,
            newPassword,
          })
        : await authService.changePassword({ currentPassword, newPassword });
      setIsError(false);
      setMessage(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err?.message || "Error cambiando la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <PageHeaderCard
          icon={KeyRound}
          eyebrow="Seguridad"
          title="Cambiar contraseña"
          subtitle="Ingresa tu contraseña actual y la nueva"
          onBack={() => (window.location.href = "/perfil")}
        />

        <div className="bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-11 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-11 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-[11px] text-red-500 mt-1">Mínimo 6 caracteres</p>
              )}
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-11 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
              disabled={loading || !isFormValid}>
              <KeyRound className="w-4 h-4" />
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </button>

            <SuccessModal
              isOpen={Boolean(message) && !isError}
              title="Contraseña actualizada"
              message={message}
              onAction={() => setMessage("")}
            />
            <ErrorModal isOpen={Boolean(message) && isError} message={message} onAction={() => setMessage("")} />
          </form>
        </div>
      </div>
    </div>
  );
}
