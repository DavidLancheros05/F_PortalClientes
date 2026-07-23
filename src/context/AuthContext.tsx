"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { setNavigate } from "@/services/core/navigation";
import { usuariosService } from "@/services/usuarios/usuarios.service";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Inyectar router en navigation helper para 401 redirects
  useEffect(() => {
    setNavigate((path) => router.push(path));
  }, [router]);

  // Cargar usuario desde localStorage al inicio
  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      const token = localStorage.getItem("token");
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

  // Login: guardar token y usuario
  const login = (token: string, userData: any) => {
    // console.log("[AuthContext] login", userData);

    localStorage.setItem("token", token);
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
    };

    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  // Logout: limpiar todo
  const logout = () => {
    // console.log("[AuthContext] logout");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("modulos");
    Cookies.remove("pc_token");
    Cookies.remove("token");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
