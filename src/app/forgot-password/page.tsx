"use client";

import { useState } from "react";
import Link from "next/link";
import { loginService } from "@/services/auth/login.service";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

type AccessType = "cliente" | "usuario";

export default function ForgotPasswordPage() {
  const [accessType, setAccessType] = useState<AccessType>("cliente");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError("");

    try {
      await loginService.forgotPassword({ identifier, accessType });
      // Respuesta siempre genérica (exista o no la cuenta) — el backend
      // nunca revela si el identificador existe, así que la UI tampoco.
      setEnviado(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Error al conectar con el servidor",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fdfffe] via-white to-[#fffffe]">
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-sm p-10 rounded-3xl shadow-2xl border border-[#003366]/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#003366] to-[#0072C6]">
            Recuperar contraseña
          </h1>
          <p className="text-[#003366]/70 mt-2 text-sm font-medium">
            Te enviaremos un link para restablecerla
          </p>
        </div>

        {enviado ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              Si la cuenta existe, enviamos un correo con instrucciones para
              restablecer la contraseña. Revisa tu bandeja de entrada (y spam).
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAccessType("cliente")}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  accessType === "cliente"
                    ? "bg-gradient-to-r from-[#003366] to-[#0072C6] text-white shadow-lg"
                    : "bg-[#003366]/10 text-[#003366] hover:bg-[#003366]/20"
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setAccessType("usuario")}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  accessType === "usuario"
                    ? "bg-gradient-to-r from-[#003366] to-[#0072C6] text-white shadow-lg"
                    : "bg-[#003366]/10 text-[#003366] hover:bg-[#003366]/20"
                }`}
              >
                Usuario Interno
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#003366] mb-2">
                {accessType === "cliente" ? "Número de Identificación" : "Usuario"}
              </label>
              <input
                type="text"
                placeholder={
                  accessType === "cliente" ? "Ej: 1234567890" : "Tu usuario"
                }
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError("");
                }}
                className="block w-full pl-3 pr-4 py-3.5 bg-white border-2 border-[#003366]/20 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-[#0072C6] outline-none transition-all duration-200 text-[#003366] placeholder-[#003366]/40"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#003366] to-[#0072C6] text-white rounded-xl shadow-lg font-semibold disabled:opacity-50 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-[#003366]/70 hover:text-[#003366]"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
