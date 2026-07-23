"use client";

import { useEffect, useState, useContext } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
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
        mod_id: m.modId ?? m.mod_id,
        mod_nombre: m.modNombre ?? m.mod_nombre,
        mod_ruta: m.modRuta ?? m.mod_ruta,
        mod_icono: m.modIcono ?? m.mod_icono,
        mod_activo: m.modActivo ?? m.mod_activo ?? true,
        mod_posicion: m.modOrden ?? m.mod_orden ?? m.mod_posicion,
        mod_padre_id: m.modPadreId ?? m.mod_padre_id,
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

  // Gate de sesión al recargar: dura milisegundos (lee localStorage), pero
  // sin esto estilizado se veía una página en blanco con texto plano
  if (loading || loadingModulos)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Cargando…</p>
      </div>
    );

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
