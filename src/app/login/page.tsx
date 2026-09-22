"use client";

import { Suspense, useState, useContext, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { AuthContext } from "@/context/AuthContext";
import { loginService } from "@/services/auth/login.service";
import { AlertCircle, Eye, EyeOff, User, Users } from "lucide-react";

// Mientras no se configure esta env var (ver B_PortalClientes/.env,
// RECAPTCHA_SECRET_KEY), el widget no se muestra y el login sigue
// funcionando sin captcha.
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type AccessType = "cliente" | "usuario";

// Solo se acepta un "next" que sea una ruta interna (empieza en "/" y no en
// "//") — evita que alguien arme un link de login con ?next=https://sitio-malicioso
// y lo use como open redirect tras autenticarse.
function destinoSeguro(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useContext(AuthContext);

  const [accessType, setAccessType] = useState<AccessType>("cliente");
  const [identifier, setIdentifier] = useState(""); // cli_nro_identificacion o usr_usuario
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState("");
  const recaptchaRef = useRef<ReCAPTCHA>(null);

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

    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setCaptchaError("Confirma que no eres un robot");
      return;
    }
    setCaptchaError("");

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
        captchaToken: captchaToken || undefined,
      });
      // console.log("[LoginPage] login response:", data);

      if (!data.user) {
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

      login(usuario);

      if (data.modulos && Array.isArray(data.modulos)) {
        localStorage.setItem("modulos", JSON.stringify(data.modulos));
      } else {
        console.log("[LoginPage] Sin módulos en response:", data);
      }

      const next = destinoSeguro(searchParams.get("next"));
      router.replace(next || "/inicio");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        "Error al conectar con el servidor";
      setLoginError(errorMessage);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ─── Panel izquierdo: branding + imagen de planta ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-[#003366] via-[#004080] to-[#002244]">
        {/* Patrón geométrico decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Imagen de planta de fondo */}
        <div className="absolute inset-0">
          <img
            src="/planta.png"
            alt=""
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
        </div>

        {/* Contenido del panel */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img
              src="/logo.jpg"
              alt="Cartonera Nacional S.A."
              className="w-20 h-20 rounded-xl object-contain bg-white/10 p-2 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              CARTONERA
              <br />
              NACIONAL S.A.
            </h1>
            <div className="w-16 h-1 bg-[#0072C6] rounded-full" />
            <p className="text-white/80 text-lg font-medium leading-relaxed max-w-xs">
              Comprometidos con la calidad y el desarrollo del país
            </p>
          </div>

          <div />
        </div>
      </div>

      {/* ─── Panel derecho: formulario ─── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#f0f4f8] via-white to-[#e8eef5] relative overflow-hidden">
        {/* Formas geométricas decorativas */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#0072C6]/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#003366]/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-[#0072C6]/5 rounded-full rotate-45" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/60">
            {/* Logo + título */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img
                  src="/logo.jpg"
                  alt="Cartonera Nacional S.A."
                  className="w-32 h-auto object-contain"
                />
              </div>
              <div className="w-12 h-1 bg-[#0072C6] rounded-full mx-auto mb-5" />
              <h2 className="text-2xl font-bold text-[#003366]">
                Iniciar Sesión
              </h2>
              <p className="text-[#003366]/50 mt-1.5 text-sm">
                Accede a tu cuenta para continuar
              </p>
            </div>

            {/* Tabs Cliente / Usuario Interno */}
            <div className="flex gap-2 mb-7 bg-[#f1f5f9] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAccessType("cliente")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  accessType === "cliente"
                    ? "bg-white text-[#003366] shadow-md"
                    : "text-[#003366]/50 hover:text-[#003366]/70"
                }`}
              >
                <User className="w-4 h-4" />
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setAccessType("usuario")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  accessType === "usuario"
                    ? "bg-[#003366] text-white shadow-md"
                    : "text-[#003366]/50 hover:text-[#003366]/70"
                }`}
              >
                <Users className="w-4 h-4" />
                Usuario Interno
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Campo usuario */}
              <div>
                <label className="block text-sm font-semibold text-[#003366] mb-1.5">
                  {accessType === "cliente"
                    ? "Número de Identificación"
                    : "Usuario"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003366]/30">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    placeholder={
                      accessType === "cliente" ? "Ej: 1234567890" : "Tu usuario"
                    }
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (identifierError) setIdentifierError("");
                      if (loginError) setLoginError("");
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-[#003366]/15 rounded-xl text-sm text-[#003366] placeholder-[#003366]/30 focus:ring-2 focus:ring-[#0072C6]/30 focus:border-[#0072C6] outline-none transition-all"
                  />
                </div>
                {identifierError && (
                  <p className="mt-1.5 text-xs text-red-600">{identifierError}</p>
                )}
              </div>

              {/* Campo contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#003366]">
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#0072C6] hover:text-[#003366] transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#003366]/30">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                      if (loginError) setLoginError("");
                    }}
                    className="w-full pl-11 pr-11 py-3 bg-[#f8fafc] border border-[#003366]/15 rounded-xl text-sm text-[#003366] placeholder-[#003366]/30 focus:ring-2 focus:ring-[#0072C6]/30 focus:border-[#0072C6] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003366]/30 hover:text-[#003366]/60 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-600">{passwordError}</p>
                )}
              </div>

              {/* reCAPTCHA */}
              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => {
                      setCaptchaToken(token);
                      if (captchaError) setCaptchaError("");
                    }}
                    onExpired={() => setCaptchaToken(null)}
                  />
                </div>
              )}
              {captchaError && (
                <p className="text-xs text-red-600 text-center">{captchaError}</p>
              )}

              {/* Error de login */}
              {loginError && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{loginError}</p>
                </div>
              )}

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#003366] to-[#0072C6] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#003366]/25 disabled:opacity-50 transition-all duration-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Iniciando sesión..."
                ) : (
                  <>
                    Iniciar Sesión
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
