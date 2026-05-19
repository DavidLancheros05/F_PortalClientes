"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { loginService } from "@/services/auth/login.service";
import { AlertCircle } from "lucide-react";

type AccessType = "cliente" | "usuario";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useContext(AuthContext);

  const [accessType, setAccessType] = useState<AccessType>("cliente");
  const [identifier, setIdentifier] = useState(""); // cli_nro_identificacion o usr_usuario
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");

  const validateForm = () => {
    let isValid = true;

    if (!identifier) {
      setIdentifierError(
        accessType === "cliente"
          ? "El número de identificación es requerido"
          : "El usuario es requerido"
      );
      isValid = false;
    } else {
      setIdentifierError("");
    }

    if (!password) {
      setPasswordError("La contraseña es requerida");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Mínimo 6 caracteres");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // console.log("[LoginPage] Intentando login con:", {
      //   identifier,
      //   password: "********",
      //   accessType,
      // });
      const data = await loginService.login({
        identifier,
        password,
        accessType,
      });
      // console.log("[LoginPage] login response:", data);

      if (!data.token || !data.user) {
        setLoginError("Error al iniciar sesión");
        return;
      }

      const usuario = {
        ...data.user,
        rol_id: data.user.rol_id ?? data.user.rol?.rol_id ?? null,
        rol:
          typeof data.user.rol === "object"
            ? data.user.rol
            : {
                nombre: data.user.rol,
                rol_id: data.user.rol_id ?? null,
                descripcion: "",
              },
      };

      login(data.token, usuario);

      if (data.modulos && Array.isArray(data.modulos)) {
        localStorage.setItem("modulos", JSON.stringify(data.modulos));
        // console.log("[LoginPage] Módulos guardados:", data.modulos);
      }

      router.replace("/inicio");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        "Error al conectar con el servidor";
      setLoginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fdfffe] via-white to-[#fffffe]">
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-sm p-10 rounded-3xl shadow-2xl border border-[#003366]/20">
        <div className="text-center mb-10">
          {/* LOGO DE CARTONERA NACIONAL S.A. - IMAGEN */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative">
              {/* Círculo decorativo azul claro */}
              <div className="absolute inset-0 bg-[#0072C6]/10 rounded-full blur-xl"></div>
              {/* Contenedor de la imagen */}
              <div className="relative bg-white p-4 rounded-2xl shadow-lg border border-[#003366]/10">
                <img
                  src="/logo.jpg"
                  alt="Cartonera Nacional S.A. Logo"
                  className="w-48 h-auto object-contain"
                />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#003366] to-[#0072C6]">
            Iniciar Sesión
          </h1>
          <p className="text-[#003366]/70 mt-2 text-sm font-medium">
            Accede a tu cuenta para continuar
          </p>
        </div>

        {/* Selector de tipo de acceso */}
        <div className="flex gap-2 mb-6">
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

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-[#003366] mb-2">
              {accessType === "cliente"
                ? "Número de Identificación"
                : "Usuario"}
            </label>
            <input
              type={accessType === "cliente" ? "text" : "text"}
              placeholder={
                accessType === "cliente"
                  ? "Ej: 1234567890"
                  : "Tu usuario"
              }
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (identifierError) setIdentifierError("");
                if (loginError) setLoginError("");
              }}
              className="block w-full pl-3 pr-4 py-3.5 bg-white border-2 border-[#003366]/20 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-[#0072C6] outline-none transition-all duration-200 text-[#003366] placeholder-[#003366]/40"
            />
            {identifierError && (
              <p className="mt-2 text-sm text-[#003366] bg-[#003366]/10 px-3 py-2 rounded-lg">
                {identifierError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003366] mb-2">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
                if (loginError) setLoginError("");
              }}
              className="block w-full pl-3 pr-4 py-3.5 bg-white border-2 border-[#003366]/20 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-[#0072C6] outline-none transition-all duration-200 text-[#003366] placeholder-[#003366]/40"
            />
            {passwordError && (
              <p className="mt-2 text-sm text-[#003366] bg-[#003366]/10 px-3 py-2 rounded-lg">
                {passwordError}
              </p>
            )}
          </div>

          {loginError && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{loginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#003366] to-[#0072C6] text-white rounded-xl shadow-lg font-semibold disabled:opacity-50 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
