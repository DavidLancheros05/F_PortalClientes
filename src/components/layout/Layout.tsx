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
              : user.rol?.nombre ?? ""
            : "Usuario"
        }
        nombreUsuario={user?.usuario_nombre || user?.email || "Usuario"}
      />
      <main className={isInicioPage ? "" : "p-0"}>{children}</main>
    </div>
  );
}

//     SELECT
//     TABLE_NAME,
//     COLUMN_NAME,
//     DATA_TYPE,
//     IS_NULLABLE
// FROM INFORMATION_SCHEMA.COLUMNS
// WHERE TABLE_NAME IN ('roles', 'rol_modulo', 'modulos')
// ORDER BY TABLE_NAME, ORDINAL_POSITION;

// TABLE_NAME	COLUMN_NAME	DATA_TYPE	IS_NULLABLE
// modulos	mod_id	int	NO
// modulos	mod_codigo	varchar	NO
// modulos	mod_nombre	varchar	NO
// modulos	mod_ruta	varchar	NO
// modulos	mod_icono	varchar	YES
// modulos	mod_orden	int	NO
// modulos	mod_padre_id	int	YES
// modulos	mod_activo	bit	NO
// modulos	created_at	datetime2	YES
// modulos	updated_at	datetime2	YES
// rol_modulo	rm_rol_id	int	NO
// rol_modulo	rm_mod_id	int	NO
// rol_modulo	rm_created_at	datetime2	YES
// rol_modulo	rm_ver	bit	NO
// rol_modulo	rm_crear	bit	NO
// rol_modulo	rm_editar	bit	NO
// rol_modulo	rm_eliminar	bit	NO
// rol_modulo	rm_aprobar	bit	NO
// rol_modulo	rm_activo	bit	NO
// rol_modulo	created_by	int	YES
// rol_modulo	updated_at	datetime2	YES
// roles	rol_id	int	NO
// roles	rol_nombre	varchar	NO
// roles	rol_descripcion	varchar	YES
// roles	rol_codigo	varchar	NO
// roles	rol_activo	bit	NO
// roles	rol_created_at	datetime2	NO
// roles	rol_updated_at	datetime2	YES
