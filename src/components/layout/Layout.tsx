"use client";

import { useEffect, useState, useContext } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import type { Modulo } from "@/components/layout/Header";
import { AuthContext } from "@/context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useContext(AuthContext);
  const pathname = usePathname();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);

  const readCachedModulos = (): Modulo[] => {
    try {
      const cached = localStorage.getItem("modulos");
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];

      const transformModulo = (m: any): Modulo => ({
        ...m,
        mod_posicion: m.mod_orden ?? m.mod_posicion,
        permisos: m.permisos || {
          ver: true,
          crear: false,
          editar: false,
          eliminar: false,
          aprobar: false,
        },
        subModulos: Array.isArray(m.subModulos)
          ? m.subModulos.map((c: any) => transformModulo(c))
          : Array.isArray(m.children)
            ? m.children.map((c: any) => transformModulo(c))
            : [],
      });

      const withPermisos = parsed.map((m: any) => transformModulo(m));

      return withPermisos;
    } catch (error) {
      console.error("Error leyendo módulos desde cache local:", error);
      return [];
    }
  };

  // No mostrar header/layout en login
  const isLoginPage = pathname === "/login";
  const isInicioPage = pathname === "/inicio";

  useEffect(() => {
    // First, try to use cached modules from login
    const cachedModulos = readCachedModulos();
    if (cachedModulos.length > 0) {
      setModulos(cachedModulos);
      return;
    }

    setLoadingModulos(false);
  }, [user, loading, pathname]);

  if (loading || loadingModulos) return <p>Cargando...</p>;

  // Si es página de login, renderizar sin header
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        modulos={modulos}
        rol={
          user
            ? typeof user.rol === "string"
              ? user.rol
              : (user.rol?.nombre ?? "")
            : "Usuario"
        }
        nombreUsuario={user?.nombre || user?.email || "Usuario"}
      />
      <main className={isInicioPage ? "" : "p-0"}>{children}</main>
    </div>
  );
}
