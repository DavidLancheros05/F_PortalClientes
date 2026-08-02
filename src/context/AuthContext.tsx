"use client";

import { createContext, useEffect, useRef, useState, ReactNode } from "react";
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
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sesionCambiadaEnOtraPestana, setSesionCambiadaEnOtraPestana] =
    useState(false);
  // Recuerda el JSON de `user` que ESTA pestaña cree tener activo, para
  // poder comparar contra localStorage cuando otra pestaña lo cambia. Ya no
  // hay `token` en localStorage (Fase 2 de la migración de auth — el JWT
  // real vive solo en la cookie httpOnly pc_token, invisible a JS por
  // diseño), así que `user` es ahora la única señal de "hay sesión".
  const userRef = useRef<string | null>(null);

  // Cargar usuario desde localStorage al inicio. No hay token que revisar
  // acá: la credencial real es la cookie httpOnly, que el navegador ya
  // manda sola en cada request (api.ts::withCredentials); si no es válida,
  // el backend responde 401 y el interceptor de respuesta se encarga. Este
  // efecto solo restaura el perfil cacheado para pintar la UI sin esperar
  // una llamada al backend.
  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      const storedUser = localStorage.getItem("user");
      userRef.current = storedUser;
      if (!storedUser) {
        if (mounted) setLoading(false);
        return;
      }

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
    }

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Detecta si otra pestaña de este navegador inició sesión con otra cuenta
  // o cerró sesión (localStorage se comparte por origen, no por pestaña).
  // Sin esto, esta pestaña seguía mostrando al usuario viejo en pantalla
  // mientras la cookie httpOnly ya era la de la otra cuenta — es decir,
  // actuaba en silencio como la cuenta de la otra pestaña. El evento
  // "storage" solo se dispara en las pestañas QUE NO hicieron el cambio,
  // así que es la señal correcta para avisarle a esta.
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      // key === null ocurre con localStorage.clear() (ver logout más abajo).
      if (e.key !== "user" && e.key !== null) return;

      const userActual = localStorage.getItem("user");
      if (userActual !== userRef.current) {
        setSesionCambiadaEnOtraPestana(true);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Login: guardar el perfil del usuario. El JWT ya no se guarda acá — el
  // backend lo manda como cookie httpOnly en la misma respuesta de
  // /auth/login (Fase 1 de documentacion/migracion-auth-httponly.md en
  // B_PortalClientes); `token` se mantiene en la firma solo por
  // compatibilidad con quien llama (login/page.tsx), sin usarlo.
  const login = (_token: string, userData: any) => {
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
    const userJson = JSON.stringify(normalizedUser);
    localStorage.setItem("user", userJson);
    userRef.current = userJson;
  };

  // Logout: revoca la sesión del lado del servidor (invalida cualquier
  // JWT ya emitido, no solo este — vía token_version) y le pide al backend
  // que limpie la cookie httpOnly (Set-Cookie con Max-Age=0), además de
  // limpiar el estado local. Es la única implementación de logout de la
  // app — antes había una segunda copia en Header.tsx que solo limpiaba el
  // navegador sin avisarle al backend, dejando el JWT viejo utilizable
  // hasta su expiración.
  //
  // `async`/`await` a propósito (antes era fire-and-forget): la cookie
  // httpOnly solo la puede borrar el backend vía Set-Cookie en la
  // respuesta — antes de este cambio, la limpieza síncrona del lado del
  // cliente (Cookies.remove) cubría el caso de que la página navegara a
  // /login antes de que la petición terminara; ahora, si el caller
  // (Header.tsx) navega sin esperar esta promesa, el navegador puede
  // abortar la petición a mitad de camino y la cookie queda sin limpiar
  // (verificado en vivo con Playwright: pasaba exactamente eso).
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best-effort: si falla (sesión ya vencida, red caída, etc.) igual
      // se limpia la sesión local — no debe bloquear el logout del usuario.
    }

    setUser(null);
    localStorage.clear();
    userRef.current = null;
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
