"use client";

import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, ChevronUp } from "lucide-react";
import { useMenuModel, isModuloActivo, type Modulo } from "@/components/layout/useMenuModel";
import { MenuSearchPanel } from "@/components/layout/MenuSearchPanel";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { AuthContext } from "@/context/AuthContext";
import { LoadingModal } from "@/components/modals";

interface Props {
  modulos: Modulo[];
  rol: string;
  nombreUsuario: string;
}

// Menú vertical fijo a la izquierda — alternativa a la barra superior
// (Header con layout="top") cuando el usuario elige "Izquierda" en /perfil.
// Reutiliza useMenuModel (mismo árbol/agrupaciones/orden/permisos que
// Header) para que ambos layouts muestren exactamente el mismo menú, solo
// que en shape distinto. Solo visible md+ — en mobile siempre se usa el
// menú hamburguesa de Header, con o sin esta preferencia (ver Header.tsx).
export default function Sidebar({ modulos, rol, nombreUsuario }: Props) {
  const pathname = usePathname();
  const { logout: logoutSesion } = useContext(AuthContext);
  const isAdmin = ["ADMIN", "ADMINISTRACION", "ADMINISTRACIÓN"].includes(
    String(rol || "")
      .trim()
      .toUpperCase(),
  );

  const [loggingOut, setLoggingOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const logout = async () => {
    // Mismo criterio que Header.tsx: bloquea la UI, espera el logout real
    // (limpia la cookie httpOnly) y recién ahí recarga — ver ese archivo
    // para el detalle de por qué no alcanza con router.push.
    setLoggingOut(true);
    await logoutSesion();
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const iniciales =
    String(nombreUsuario || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  const {
    getSubModulosConFallback,
    resolveModuloRoute,
    sortModulosByOrden,
    tieneHijosConPermiso,
    topLevelModulos,
    mostrarRolDirecto,
  } = useMenuModel(modulos, isAdmin);

  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [openNestedGroup, setOpenNestedGroup] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const toggleGroup = (id: number) => {
    setOpenNestedGroup(null);
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  const toggleNestedGroup = (id: number) =>
    setOpenNestedGroup((prev) => (prev === id ? null : id));

  const linkClass = (activo: boolean, extra = "") =>
    `block px-3 py-2 rounded-lg text-sm transition-colors ${extra} ${
      activo
        ? "bg-white text-brand-600 font-semibold"
        : "text-white/90 hover:bg-white/14 hover:text-white"
    }`;

  if (collapsed) {
    return (
      <aside className="hidden md:flex md:flex-col w-14 shrink-0 h-screen sticky top-0 bg-brand-600">
        <div className="flex items-center justify-center h-15 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
            <img
              src="/logo.jpg"
              alt="Logo Cartonera Nacional S.A."
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          title="Mostrar menú"
          className="flex items-center justify-center h-11 mx-2 mt-2 rounded-lg text-white hover:bg-white/14 transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-brand-600 overflow-y-auto">
      <div className="flex items-center gap-3 px-4 h-15 border-b border-white/10 shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img
            src="/logo.jpg"
            alt="Logo Cartonera Nacional S.A."
            className="w-full h-full object-contain"
          />
        </div>
        <div className="font-black text-[11px] uppercase tracking-tighter text-white truncate flex-1">
          Cartonera Nacional S.A.
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Ocultar menú"
          className="shrink-0 p-1.5 rounded-lg text-white/80 hover:bg-white/14 hover:text-white transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-white/10 shrink-0">
        <MenuSearchPanel modulos={modulos} isAdmin={isAdmin} pathname={pathname} />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {mostrarRolDirecto ? (
          <div className="px-3 py-2 rounded-lg bg-white/20 text-white font-semibold text-sm">
            {rol || "Usuario"}
          </div>
        ) : (
          topLevelModulos.map((m, idx) => (
            <div key={`${m.mod_id}-${idx}`}>
              {getSubModulosConFallback(m).length > 0 ? (
                <>
                  <button
                    onClick={() => toggleGroup(m.mod_id)}
                    className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-white text-sm transition-colors ${
                      openGroup === m.mod_id
                        ? "bg-white/14 hover:bg-white/20"
                        : "hover:bg-white/14"
                    }`}
                  >
                    <span>{m.mod_nombre}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform shrink-0 ${
                        openGroup === m.mod_id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openGroup === m.mod_id && (
                    <div className="mt-1 ml-2.5 pl-2.5 border-l-2 border-white/20 space-y-0.5">
                      {sortModulosByOrden(getSubModulosConFallback(m))
                        .filter(
                          (s) =>
                            s.mod_activo !== false &&
                            (s.permisos.ver || tieneHijosConPermiso(s)),
                        )
                        .map((sub, subIdx) => (
                          <div key={`${sub.mod_id}-${subIdx}`}>
                            {getSubModulosConFallback(sub).length > 0 &&
                            sortModulosByOrden(getSubModulosConFallback(sub)).filter(
                              (n) =>
                                n.mod_activo !== false &&
                                (n.permisos.ver || tieneHijosConPermiso(n)),
                            ).length > 0 ? (
                              <>
                                <button
                                  onClick={() => toggleNestedGroup(sub.mod_id)}
                                  className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/14 transition-colors"
                                >
                                  <span>{sub.mod_nombre}</span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                                      openNestedGroup === sub.mod_id ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                {openNestedGroup === sub.mod_id && (
                                  <div className="ml-2.5 pl-2.5 border-l-2 border-white/20 space-y-0.5">
                                    {sortModulosByOrden(getSubModulosConFallback(sub))
                                      ?.filter(
                                        (n) =>
                                          n.mod_activo !== false &&
                                          (n.permisos.ver || tieneHijosConPermiso(n)),
                                      )
                                      .map((nested, nIdx) => {
                                        const ruta = resolveModuloRoute(nested);
                                        return ruta ? (
                                          <Link
                                            key={`${nested.mod_id}-${nIdx}`}
                                            href={ruta}
                                            className={linkClass(isModuloActivo(pathname, ruta))}
                                          >
                                            {nested.mod_nombre}
                                          </Link>
                                        ) : (
                                          <span
                                            key={`${nested.mod_id}-${nIdx}`}
                                            className="block px-3 py-2 rounded-lg text-sm text-white/80"
                                          >
                                            {nested.mod_nombre}
                                          </span>
                                        );
                                      })}
                                  </div>
                                )}
                              </>
                            ) : resolveModuloRoute(sub) ? (
                              <Link
                                href={resolveModuloRoute(sub)!}
                                className={linkClass(
                                  isModuloActivo(pathname, resolveModuloRoute(sub)),
                                )}
                              >
                                {sub.mod_nombre}
                              </Link>
                            ) : (
                              <span className="block px-3 py-2 rounded-lg text-sm text-white/90">
                                {sub.mod_nombre}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : resolveModuloRoute(m) ? (
                <Link
                  href={resolveModuloRoute(m)!}
                  className={linkClass(isModuloActivo(pathname, resolveModuloRoute(m)))}
                >
                  {m.mod_nombre}
                </Link>
              ) : (
                <span className="block px-3 py-2 rounded-lg text-sm text-white">
                  {m.mod_nombre}
                </span>
              )}
            </div>
          ))
        )}
      </nav>

      <div className="relative border-t border-white/10 shrink-0 p-2" ref={userMenuRef}>
        {userMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.16)] overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[#eef1f6]">
              <p className="text-sm font-bold text-[#0f172a] truncate">{nombreUsuario}</p>
              <p className="text-xs text-[#64748b] mt-0.5">{rol || "Usuario"}</p>
            </div>
            <Link
              href="/perfil"
              onClick={() => setUserMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            >
              Mi perfil
            </Link>
            <button
              onClick={logout}
              className="block w-full text-left px-4 py-2.5 text-sm text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        )}
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className={`flex w-full items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
            userMenuOpen ? "bg-white/14 hover:bg-white/20" : "hover:bg-white/14"
          }`}
        >
          <span className="w-8 h-8 rounded-full bg-white text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
            {iniciales}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-white text-sm font-medium truncate">
              {nombreUsuario}
            </span>
          </span>
          <ChevronUp
            className={`w-4 h-4 text-white shrink-0 transition-transform ${
              userMenuOpen ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>

      <LoadingModal isOpen={loggingOut} message="Cerrando sesión..." />
    </aside>
  );
}
