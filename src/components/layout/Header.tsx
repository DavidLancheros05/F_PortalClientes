"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useContext } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Search } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { LoadingModal } from "@/components/modals";
import { useMenuModel, isModuloActivo, type Modulo } from "@/components/layout/useMenuModel";
import { MenuSearchPanel } from "@/components/layout/MenuSearchPanel";

export type { Modulo };

// Props del header
interface Props {
  modulos: Modulo[];
  rol: string;
  nombreUsuario: string;
  /** "top" (default): nav completo de escritorio en la barra superior.
   * "left": la barra superior queda solo con logo/usuario — el árbol de
   * módulos lo muestra <Sidebar> aparte. El menú móvil (hamburguesa) se
   * mantiene igual en ambos casos, ya sigue siendo la mejor UX en pantallas
   * angostas. */
  layout?: "top" | "left";
}

export default function Header({ modulos, rol, nombreUsuario, layout = "top" }: Props) {
  const { logout: logoutSesion } = useContext(AuthContext);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<number | null>(null);
  const [activeNestedSubMenu, setActiveNestedSubMenu] = useState<number | null>(
    null,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isAdmin = ["ADMIN", "ADMINISTRACION", "ADMINISTRACIÓN"].includes(
    String(rol || "")
      .trim()
      .toUpperCase(),
  );
  const logout = async () => {
    // Se muestra antes de tocar nada más: bloquea la UI de inmediato para
    // que no se pueda navegar a otra parte mientras el logout está en
    // curso (antes, sin feedback visual, el usuario alcanzaba a hacer clic
    // en el menú y entraba a una página protegida con la sesión a medio
    // cerrar).
    setLoggingOut(true);
    // Espera a que termine (llamada al backend + limpieza local) antes de
    // navegar — la cookie httpOnly solo se borra cuando llega la respuesta
    // de /auth/logout; si se navega antes, el navegador puede abortar esa
    // petición a mitad de camino y la cookie queda sin limpiar.
    await logoutSesion();
    // Recarga completa (no router.push): limpia cualquier estado en memoria
    // y cache de navegación del cliente, y garantiza que la siguiente
    // petición pase de nuevo por proxy.ts en vez de arriesgarse a servir
    // una página protegida ya cacheada con el AuthContext en null.
    window.location.href = "/login";
  };

  const toggleSubMenu = (id: number) => {
    setActiveNestedSubMenu(null);
    setActiveSubMenu(activeSubMenu === id ? null : id);
  };

  const toggleNestedSubMenu = (id: number) =>
    setActiveNestedSubMenu(activeNestedSubMenu === id ? null : id);

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

  // Cerrar submenu cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveSubMenu(null);
        setActiveNestedSubMenu(null);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <header
      className={`bg-brand-600 shadow-md sticky top-0 z-50 ${
        layout === "left" ? "md:hidden" : ""
      }`}
    >
      <div className="max-w-full h-15 px-4 flex items-center justify-between">
        {/* Logo + Nombre — en layout "left" el Sidebar ya lo muestra, así
            que acá solo hace falta en mobile (el Sidebar está oculto por
            debajo de md). */}
        <div
          className={`items-center space-x-4 min-w-0 ${
            layout === "left" ? "flex md:hidden" : "flex"
          }`}
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src="/logo.jpg"
              alt="Logo Cartonera Nacional S.A."
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block font-black text-xs uppercase tracking-tighter text-white truncate">
            Cartonera Nacional S.A.
          </div>
        </div>

        {/* Menú escritorio — en layout "left" el árbol de módulos lo
            muestra <Sidebar> aparte, acá solo queda el espaciador para que
            el usuario/logout se mantengan pegados a la derecha. */}
        {layout === "left" ? (
          <div className="hidden md:block flex-1 mx-6" />
        ) : (
        <nav className="hidden md:flex space-x-4 items-center flex-1 mx-6" ref={navRef}>
          {mostrarRolDirecto ? (
            <div className="px-3 py-2 rounded-lg bg-white/20 text-white font-semibold">
              {rol || "Usuario"}
            </div>
          ) : (
            topLevelModulos.map((m, idx) => (
            <div key={`${m.mod_id}-${idx}`} className="relative group">
              {getSubModulosConFallback(m).length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(m.mod_id)}
                    className={`flex items-center px-3 py-2 rounded-lg text-white text-sm transition-colors ${
                      activeSubMenu === m.mod_id
                        ? "bg-white/14 hover:bg-white/20"
                        : "hover:bg-white/14"
                    }`}
                  >
                    {m.mod_nombre}
                    <ChevronDown
                      className={`ml-1 w-4 h-4 transition-transform ${
                        activeSubMenu === m.mod_id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`absolute top-full left-0 mt-2 w-60 md:w-72 max-h-96 overflow-y-auto bg-white border border-[#e5e7eb] rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.16)] transition-all ${
                      activeSubMenu === m.mod_id ? "block" : "hidden"
                    }`}
                  >
                    {sortModulosByOrden(getSubModulosConFallback(m))
                      .filter((s) => s.mod_activo !== false && (s.permisos.ver || tieneHijosConPermiso(s)))
                      .map((sub, subIdx) => (
                        <div key={`${sub.mod_id}-${subIdx}`}>
                          {Array.isArray(sub.subModulos) &&
                          sortModulosByOrden(sub.subModulos).filter(
                            (n) => n.mod_activo !== false && (n.permisos.ver || tieneHijosConPermiso(n)),
                          ).length > 0 ? (
                            <>
                              <button
                                onClick={() => toggleNestedSubMenu(sub.mod_id)}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#f1f5f9] text-[#0f172a] transition-colors"
                              >
                                <span>{sub.mod_nombre}</span>
                                <ChevronDown
                                  className={`w-4 h-4 text-[#64748b] transition-transform ${
                                    activeNestedSubMenu === sub.mod_id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>
                              {activeNestedSubMenu === sub.mod_id && (
                                <div className="ml-2.5 mr-2 mb-2 border-l-2 border-[#eef1f6] pl-2.25">
                                  {sortModulosByOrden(sub.subModulos || [])
                                    ?.filter((n) => n.mod_activo !== false && (n.permisos.ver || tieneHijosConPermiso(n)))
                                    .map((nested, nIdx) => {
                                      const rutaAnidada = resolveModuloRoute(nested);
                                      return rutaAnidada ? (
                                        <Link
                                          key={`${nested.mod_id}-${nIdx}`}
                                          href={rutaAnidada}
                                          onClick={() => {
                                            console.log(`[Header DESKTOP] Click en link: "${nested.mod_nombre}" → href="${rutaAnidada}"`);
                                            setActiveSubMenu(null);
                                            setActiveNestedSubMenu(null);
                                          }}
                                          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                                            isModuloActivo(pathname, rutaAnidada)
                                              ? "bg-[#e7edfb] text-brand-600 font-semibold"
                                              : "hover:bg-[#f1f5f9] text-[#0f172a]"
                                          }`}
                                        >
                                          {nested.mod_nombre}
                                        </Link>
                                      ) : (
                                        <span key={`${nested.mod_id}-${nIdx}`} className="block rounded-md px-3 py-2 text-sm text-[#0f172a]">
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
                              onClick={() => {
                                const rutaUsada = resolveModuloRoute(sub);
                                console.log(`[Header DESKTOP DIRECTO] Click en link: "${sub.mod_nombre}" → href="${rutaUsada}"`);
                                setActiveSubMenu(null);
                                setActiveNestedSubMenu(null);
                              }}
                              className={`block px-4 py-2.5 text-sm transition-colors ${
                                isModuloActivo(pathname, resolveModuloRoute(sub))
                                  ? "bg-[#e7edfb] text-brand-600 font-semibold"
                                  : "hover:bg-[#f1f5f9] text-[#0f172a]"
                              }`}
                            >
                              {sub.mod_nombre}
                            </Link>
                          ) : (
                            <span className="block px-4 py-2.5 text-sm text-[#0f172a]">
                              {sub.mod_nombre}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              ) : resolveModuloRoute(m) ? (
                <Link
                  href={resolveModuloRoute(m)!}
                  className={`px-2 py-1 rounded-lg text-sm transition-colors ${
                    isModuloActivo(pathname, resolveModuloRoute(m))
                      ? "bg-white/20 text-white"
                      : "hover:bg-white/14 text-white"
                  }`}
                >
                  {m.mod_nombre}
                </Link>
              ) : (
                <span className="px-2 py-1 text-white text-sm">
                  {m.mod_nombre}
                </span>
              )}
            </div>
            ))
          )}
        </nav>
        )}

        {/* Usuario, botón cerrar y menú móvil */}
        <div className="flex items-center space-x-4">
          {layout === "top" && (
            <div className="hidden md:block relative" ref={searchRef}>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                title="Buscar en el menú"
                className={`p-2 rounded-lg transition-colors ${
                  searchOpen ? "bg-white/14 hover:bg-white/20" : "hover:bg-white/14"
                }`}
              >
                <Search className="w-4 h-4 text-white" />
              </button>

              {searchOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.16)] p-3 z-50">
                  <MenuSearchPanel
                    modulos={modulos}
                    isAdmin={isAdmin}
                    pathname={pathname}
                    variant="light"
                    onNavigate={() => setSearchOpen(false)}
                  />
                </div>
              )}
            </div>
          )}
          <div
            className={`relative ${layout === "left" ? "hidden" : "hidden md:block"}`}
            ref={userMenuRef}
          >
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                userMenuOpen ? "bg-white/14 hover:bg-white/20" : "hover:bg-white/14"
              }`}
            >
              <span className="w-8 h-8 rounded-full bg-white text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
                {iniciales}
              </span>
              <span className="text-white text-sm font-medium max-w-40 truncate">
                {nombreUsuario}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-white transition-transform ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.16)] overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#eef1f6]">
                  <p className="text-sm font-bold text-[#0f172a] truncate">
                    {nombreUsuario}
                  </p>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {rol || "Usuario"}
                  </p>
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
          </div>
          <button
            onClick={logout}
            className="md:hidden px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold transition-all"
          >
            Cerrar
          </button>

          <button
            className="md:hidden p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gradient-to-b from-brand-600 to-brand-500 p-4 space-y-2">
          <div className="px-3 py-2 text-white text-sm font-medium border-b border-brand-500">
            {nombreUsuario}
          </div>
          {topLevelModulos.map((m, idx) => (
            <div key={`${m.mod_id}-${idx}`}>
              {getSubModulosConFallback(m).length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(m.mod_id)}
                    className="flex justify-between w-full px-3 py-2 rounded-lg hover:bg-brand-500 text-white transition"
                  >
                    {m.mod_nombre}
                    <ChevronDown
                      className={`ml-2 w-4 h-4 transition-transform ${
                        activeSubMenu === m.mod_id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {activeSubMenu === m.mod_id && (
                    <div className="ml-2 sm:ml-4 mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 rounded-lg border border-white/20 bg-white/10 p-1.5 sm:p-2">
                      {sortModulosByOrden(getSubModulosConFallback(m))
                        .filter((s) => s.permisos.ver || tieneHijosConPermiso(s))
                        .map((sub, subIdx) => (
                          <div key={`${sub.mod_id}-${subIdx}`}>
                            {Array.isArray(sub.subModulos) &&
                            sortModulosByOrden(sub.subModulos || []).filter(
                              (n) => n.permisos.ver || tieneHijosConPermiso(n),
                            ).length > 0 ? (
                              <>
                                <button
                                  onClick={() =>
                                    toggleNestedSubMenu(sub.mod_id)
                                  }
                                  className="flex justify-between w-full px-3 py-2 rounded-lg hover:bg-brand-500 text-white transition"
                                >
                                  <span>{sub.mod_nombre}</span>
                                  <ChevronDown
                                    className={`ml-2 w-4 h-4 transition-transform ${
                                      activeNestedSubMenu === sub.mod_id
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </button>

                                {activeNestedSubMenu === sub.mod_id && (
                                  <div className="ml-3 mt-1 space-y-1 border-l border-white/30 pl-2">
                                    {sortModulosByOrden(sub.subModulos || [])
                                      ?.filter((n) => n.permisos.ver || tieneHijosConPermiso(n))
                                      .map((nested, nIdx) => {
                                        const rutaMobil = resolveModuloRoute(nested);
                                        return rutaMobil ? (
                                          <Link
                                            key={`${nested.mod_id}-${nIdx}`}
                                            href={rutaMobil}
                                            onClick={() => {
                                              console.log(`[Header MOBILE] Click en link: "${nested.mod_nombre}" → href="${rutaMobil}"`);
                                              setMobileMenuOpen(false);
                                              setActiveSubMenu(null);
                                              setActiveNestedSubMenu(null);
                                            }}
                                            className={`block px-3 py-2 rounded-lg text-white transition ${
                                              isModuloActivo(pathname, rutaMobil)
                                                ? "bg-brand-500 font-semibold"
                                                : "hover:bg-brand-500"
                                            }`}
                                          >
                                            {nested.mod_nombre}
                                          </Link>
                                        ) : (
                                          <span key={`${nested.mod_id}-${nIdx}`} className="block px-3 py-2 rounded-lg text-white">
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
                                onClick={() => {
                                  const rutaUsada = resolveModuloRoute(sub);
                                  console.log(`[Header MOBILE DIRECTO] Click en link: "${sub.mod_nombre}" → href="${rutaUsada}"`);
                                  setMobileMenuOpen(false);
                                  setActiveSubMenu(null);
                                  setActiveNestedSubMenu(null);
                                }}
                                className={`block px-3 py-2 rounded-lg text-white transition ${
                                  isModuloActivo(pathname, resolveModuloRoute(sub))
                                    ? "bg-brand-500 font-semibold"
                                    : "hover:bg-brand-500"
                                }`}
                              >
                                {sub.mod_nombre}
                              </Link>
                            ) : (
                              <span className="block px-3 py-2 rounded-lg text-white">
                                {sub.mod_nombre}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={resolveModuloRoute(m)!}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-white transition ${
                    isModuloActivo(pathname, resolveModuloRoute(m))
                      ? "bg-brand-500 font-semibold"
                      : "hover:bg-brand-500"
                  }`}
                >
                  {m.mod_nombre}
                </Link>
              )}
            </div>
          ))}

          <Link
            href="/perfil"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full px-3 py-2 mt-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all text-center"
          >
            Mi Perfil
          </Link>

          <button
            onClick={logout}
            className="w-full px-3 py-2 mt-4 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      <LoadingModal isOpen={loggingOut} message="Cerrando sesión..." />
    </header>
  );
}
