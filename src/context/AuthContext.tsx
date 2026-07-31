"use client";

import { createContext, useEffect, useRef, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { usuariosService } from "@/services/usuarios/usuarios.service";
import api from "@/services/core/api";

interface Rol {
  rol_id: number | null;
  nombre: string;
  descripcion: string;
}

interface DatosCliente {
  cliente_id?: number;
  cliente_nombre?: string;
  cliente_razon_social?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  cliente_nit_documento?: string;
  cliente_tipo_identificacion?: string;
  cliente_numero_identificacion?: string;
  cliente_sitio_web?: string;
}

interface User {
  usr_id: number;
  rol_id?: number | null;
  nombre: string;
  email: string;
  activo: boolean;
  rol: Rol;
  cliente_id?: number | null;
  ejng_id?: number | null;
  datosCliente?: DatosCliente;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sesionCambiadaEnOtraPestana, setSesionCambiadaEnOtraPestana] =
    useState(false);
  // Recuerda el token que ESTA pestaña cree tener activo, para poder
  // comparar contra localStorage cuando otra pestaña lo cambia.
  const tokenRef = useRef<string | null>(null);

  // Cargar usuario desde localStorage al inicio
  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      const token = localStorage.getItem("token");
      tokenRef.current = token;
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      // 🔹 Primero revisar localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser: User = {
          ...parsedUser,
          rol:
            typeof parsedUser.rol === "string"
              ? {
                  nombre: parsedUser.rol.toUpperCase(),
                  rol_id:
                    typeof parsedUser.rol_id === "number"
                      ? parsedUser.rol_id
                      : null,
                  descripcion: "",
                }
              : parsedUser.rol,
          rol_id:
            typeof parsedUser.rol_id === "number"
              ? parsedUser.rol_id
              : (parsedUser.rol?.rol_id ?? null),
          cliente_id: parsedUser.cliente_id ?? parsedUser.cli_id ?? null,
          ejng_id: parsedUser.ejng_id ?? null,
        };

        if (mounted) {
          setUser(normalizedUser);
          localStorage.setItem("user", JSON.stringify(normalizedUser));
          setLoading(false);
        }
        return;
      }

      // 🔹 Si tenemos token pero no user, confiamos en que el token es válido
      // No hacemos getMe() porque puede fallar y limpiar el token válido
      // console.log("[AuthContext] Token encontrado pero sin user en localStorage. Asumiendo token válido.");

      if (mounted) {
        // Crear un user placeholder para permitir que el interceptor haga su trabajo
        const placeholderUser: User = {
          usr_id: 0,
          nombre: "Usuario",
          email: "",
          activo: true,
          rol: {
            rol_id: null,
            nombre: "USER",
            descripcion: "",
          },
          cliente_id: null,
        };
        setUser(placeholderUser);
        localStorage.setItem("user", JSON.stringify(placeholderUser));
        setLoading(false);
      }
    }

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Detecta si otra pestaña de este navegador inició sesión con otra cuenta
  // o cerró sesión (localStorage/cookies se comparten por origen, no por
  // pestaña). Sin esto, esta pestaña seguía mostrando al usuario viejo en
  // pantalla mientras el interceptor de axios (services/core/interceptors.ts)
  // ya mandaba el token nuevo en cada request — es decir, actuaba en
  // silencio como la cuenta de la otra pestaña. El evento "storage" solo se
  // dispara en las pestañas QUE NO hicieron el cambio, así que es la señal
  // correcta para avisarle a esta.
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      // key === null ocurre con localStorage.clear() (ver logout más abajo).
      if (e.key !== "token" && e.key !== null) return;

      const tokenActual = localStorage.getItem("token");
      if (tokenActual !== tokenRef.current) {
        setSesionCambiadaEnOtraPestana(true);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Login: guardar token y usuario
  const login = (token: string, userData: any) => {
    // console.log("[AuthContext] login", userData);

    localStorage.setItem("token", token);
    tokenRef.current = token;
    // Nombre propio del portal: las cookies de localhost no distinguen
    // puerto, y otra app local con una cookie "token" la sobrescribiría
    Cookies.set("pc_token", token, { expires: 7 });

    const normalizedUser: User = {
      ...userData,
      rol:
        typeof userData.rol === "string"
          ? {
              nombre: userData.rol.toUpperCase(),
              rol_id:
                typeof userData.rol_id === "number" ? userData.rol_id : null,
              descripcion: "",
            }
          : userData.rol,
      rol_id:
        typeof userData.rol_id === "number"
          ? userData.rol_id
          : (userData.rol?.rol_id ?? null),
      cliente_id: userData.cliente_id ?? userData.cli_id ?? null,
      ejng_id: userData.ejng_id ?? null,
    };

    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  // Logout: revoca la sesión del lado del servidor (invalida cualquier
  // JWT ya emitido, no solo este) y limpia todo el estado local. Es la
  // única implementación de logout de la app — antes había una segunda
  // copia en Header.tsx que solo limpiaba el navegador sin avisarle al
  // backend, dejando el JWT viejo utilizable hasta su expiración.
  const logout = () => {
    api.post("/auth/logout").catch(() => {
      // Best-effort: si falla (token ya vencido, red caída, etc.) igual
      // se limpia la sesión local — no debe bloquear el logout del usuario.
    });

    setUser(null);
    localStorage.clear();
    tokenRef.current = null;
    Cookies.remove("pc_token");
    Cookies.remove("token");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {sesionCambiadaEnOtraPestana && (
        <div className="fixed top-0 inset-x-0 z-[200] flex flex-wrap items-center justify-center gap-3 bg-[#0f172a] px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
          <span>
            La sesión cambió en otra pestaña de este navegador. Recarga esta
            pestaña para seguir de forma segura.
          </span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-[#0f172a] hover:bg-gray-100"
          >
            Recargar ahora
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
