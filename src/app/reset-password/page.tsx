"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginService } from "@/services/auth/login.service";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  const isFormValid = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError("");

    try {
      await loginService.resetPassword({ token, newPassword });
      setOk(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "El link de recuperación es inválido o ya expiró",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">
          Falta el token de recuperación en el link. Solicita uno nuevo desde{" "}
          <Link href="/forgot-password" className="underline font-semibold">
            Recuperar contraseña
          </Link>
          .
        </p>
      </div>
    );
  }

  if (ok) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">
          Contraseña actualizada correctamente. Redirigiendo al login...
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-[#003366] mb-2">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (error) setError("");
            }}
            className="block w-full pl-3 pr-11 py-3.5 bg-white border-2 border-[#003366]/20 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-[#0072C6] outline-none transition-all duration-200 text-[#003366] placeholder-[#003366]/40"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[#003366]/40 hover:text-[#003366]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-[#003366]/50">Mínimo 6 caracteres</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#003366] mb-2">
          Confirmar contraseña
        </label>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError("");
          }}
          className="block w-full pl-3 pr-4 py-3.5 bg-white border-2 border-[#003366]/20 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-[#0072C6] outline-none transition-all duration-200 text-[#003366] placeholder-[#003366]/40"
        />
        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
          <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full py-3 px-4 bg-gradient-to-r from-[#003366] to-[#0072C6] text-white rounded-xl shadow-lg font-semibold disabled:opacity-50 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? "Guardando..." : "Restablecer contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fdfffe] via-white to-[#fffffe]">
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-sm p-10 rounded-3xl shadow-2xl border border-[#003366]/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#003366] to-[#0072C6]">
            Restablecer contraseña
          </h1>
          <p className="text-[#003366]/70 mt-2 text-sm font-medium">
            Elige tu nueva contraseña
          </p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
