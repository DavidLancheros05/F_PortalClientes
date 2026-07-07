"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Cookies from "js-cookie";

// Interfaz para los permisos
interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

// Interfaz de módulo
export interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string; // Viene del backend
  mod_icono?: string; // Opcional
  mod_posicion?: number;
  mod_padre_id?: number | null;
  mod_activo?: boolean; // Estado del módulo
  permisos: Permisos;
  subModulos?: Modulo[]; // Puede tener submódulos
}

// Props del header
interface Props {
  modulos: Modulo[];
  rol: string;
  nombreUsuario: string;
}

export default function Header({ modulos, rol, nombreUsuario }: Props) {
  const router = useRouter();

  modulos.forEach((m) => {
    if (m.subModulos?.length) {
      m.subModulos.forEach((sub) => {
        if (sub.subModulos?.length) {
          sub.subModulos.forEach((nested) => {
          });
        }
      });
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<number | null>(null);
  const [activeNestedSubMenu, setActiveNestedSubMenu] = useState<number | null>(
    null,
  );
  const navRef = useRef<HTMLDivElement>(null);
  const isAdmin = ["ADMIN", "ADMINISTRACION", "ADMINISTRACIÓN"].includes(
    String(rol || "")
      .trim()
      .toUpperCase(),
  );

  const logout = () => {
    localStorage.clear();
    Cookies.remove("token");
    router.push("/login");
  };

  const toggleSubMenu = (id: number) => {
    setActiveNestedSubMenu(null);
    setActiveSubMenu(activeSubMenu === id ? null : id);
  };

  const toggleNestedSubMenu = (id: number) =>
    setActiveNestedSubMenu(activeNestedSubMenu === id ? null : id);

  const normalizeText = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const getSubModulosConFallback = (modulo: Modulo): Modulo[] => {
    const subModulos = Array.isArray(modulo.subModulos)
      ? modulo.subModulos
      : [];
    const moduloNombre = String(modulo.mod_nombre || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    const esParametrizacion = moduloNombre === "parametrizacion";
    const resolverJerarquiaSolicitudes = (items: Modulo[]): Modulo[] => {
      const esSolicitudes = normalizeText(modulo.mod_nombre) === "solicitudes";
      if (!esSolicitudes) {
        return items;
      }

      const childrenByName = new Map(
        items.map((item) => [normalizeText(item.mod_nombre), item]),
      );

      const categoriaSolicitudesExistente = childrenByName.get("solicitudes");
      const categoriaDocumentosExistente = childrenByName.get("documentos");
      const categoriaIndicadoresExistente = childrenByName.get("indicadores");

      if (
        categoriaSolicitudesExistente?.subModulos?.length ||
        categoriaDocumentosExistente?.subModulos?.length ||
        categoriaIndicadoresExistente?.subModulos?.length
      ) {
        return items;
      }

      const nuevos: Modulo[] = [];

      const solicitudesHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        if (!ruta)
          return nombre.includes("solicitud") && !nombre.includes("document");
        return (
          ruta.startsWith("/solicitudes") &&
          !ruta.includes("documento") &&
          !ruta.includes("indicador")
        );
      });

      const documentosHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        return (
          ruta.startsWith("/documentos") ||
          ruta.includes("documento") ||
          nombre.includes("documento")
        );
      });

      const indicadoresHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        return (
          ruta.startsWith("/indicadores") ||
          ruta.startsWith("/admin/indicadores") ||
          nombre.includes("indicador")
        );
      });

      const buildVirtualNode = (
        id: number,
        nombre: string,
        ruta: string,
        hijos: Modulo[],
      ): Modulo => ({
        mod_id: id,
        mod_nombre: nombre,
        mod_ruta: ruta,
        permisos: {
          ver: true,
          crear: false,
          editar: false,
          eliminar: false,
          aprobar: false,
        },
        subModulos: hijos,
      });

      if (categoriaSolicitudesExistente || solicitudesHijos.length > 0) {
        nuevos.push(
          categoriaSolicitudesExistente ||
            buildVirtualNode(
              -2101,
              "Solicitudes",
              "/solicitudes/solicitudes",
              solicitudesHijos,
            ),
        );
      }

      if (categoriaDocumentosExistente || documentosHijos.length > 0) {
        nuevos.push(
          categoriaDocumentosExistente ||
            buildVirtualNode(
              -2102,
              "Documentos",
              "/solicitudes/documentos",
              documentosHijos,
            ),
        );
      }

      if (categoriaIndicadoresExistente || indicadoresHijos.length > 0) {
        const hijosIndicadores = indicadoresHijos.length > 0
          ? indicadoresHijos
          : [
              buildVirtualNode(-2110, "Por área", "/solicitudes/indicadores", []),
              buildVirtualNode(-2111, "Por solicitud", "/solicitudes/indicadores/solicitud", []),
            ];
        nuevos.push(
          categoriaIndicadoresExistente ||
            buildVirtualNode(-2103, "Indicadores", "/solicitudes/indicadores", hijosIndicadores),
        );
      }

      return nuevos.length > 0 ? nuevos : items;
    };

    if (!isAdmin || !esParametrizacion) {
      return resolverJerarquiaSolicitudes(subModulos);
    }

    const yaExisteNotificaciones = subModulos.some(
      (s) =>
        String(s.mod_ruta || "")
          .trim()
          .toLowerCase() === "/parametrizacion/formatos-de-correos" ||
        String(s.mod_nombre || "")
          .trim()
          .toLowerCase() === "notificaciones",
    );

    if (yaExisteNotificaciones) {
      return resolverJerarquiaSolicitudes(subModulos);
    }

    return resolverJerarquiaSolicitudes([
      ...subModulos,
      {
        mod_id: -1001,
        mod_nombre: "Notificaciones",
        mod_ruta: "/parametrizacion/formatos-de-correos",
        permisos: {
          ver: true,
          crear: false,
          editar: false,
          eliminar: false,
          aprobar: false,
        },
      },
    ]);
  };

  const resolveModuloRoute = (modulo: Modulo): string | undefined => {
    const nombre = modulo.mod_nombre?.trim().toLowerCase();
    if (nombre === "mis solicitudes") {
      return "/solicitudes/cliente";
    }
    return modulo.mod_ruta;
  };

  const sortModulosByOrden = (items: Modulo[]): Modulo[] => {
    return [...items].sort((a, b) => {
      const ordenA = Number(a.mod_posicion ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b.mod_posicion ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.mod_id - b.mod_id;
    });
  };

  const tieneHijosConPermiso = (modulo: Modulo): boolean => {
    const hijos = getSubModulosConFallback(modulo);
    return hijos.some((hijo) => {
      if (hijo.mod_activo === false) return false;
      if (hijo.permisos?.ver) return true;
      return tieneHijosConPermiso(hijo);
    });
  };

  const hasVisibleDescendants = (modulo: Modulo): boolean => {
    const subItems = getSubModulosConFallback(modulo);
    return subItems.some((item) => {
      if (item.mod_activo === false) return false; // Filtrar inactivos
      if (item.permisos?.ver) return true;
      if (!Array.isArray(item.subModulos) || item.subModulos.length === 0) {
        return false;
      }
      return item.subModulos.some((nested) => nested.permisos?.ver);
    });
  };

  const topLevelModulos = sortModulosByOrden(modulos).filter(
    (m) => (m.mod_activo !== false) && (m.permisos.ver || hasVisibleDescendants(m)),
  );

  const mostrarRolDirecto = topLevelModulos.length === 0;

  // Cerrar submenu cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveSubMenu(null);
        setActiveNestedSubMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <header className="bg-[#003d99] shadow-md sticky top-0 z-50">
      <div className="max-w-full px-4 py-3 flex items-center justify-between">
        {/* Logo + Nombre */}
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src="/logo.jpg"
              alt="Logo Cartonera Nacional S.A."
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden sm:block font-black text-sm uppercase tracking-tighter text-white truncate">
            Cartonera Nacional S.A.
          </div>
        </div>

        {/* Menú escritorio */}
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
                    className="flex items-center px-3 py-2 rounded-lg hover:bg-gradient-to-r hover:from-[#0052cc] hover:to-[#0052cc] text-white transition"
                  >
                    {m.mod_nombre}
                    <ChevronDown className="ml-1 w-4 h-4" />
                  </button>

                  <div
                    className={`absolute top-full left-0 mt-2 w-60 md:w-72 max-h-96 overflow-y-auto overflow-hidden bg-gradient-to-b from-[#0052cc] to-[#0052cc] border border-white/15 rounded-xl shadow-2xl transition-all ${
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
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/12 text-white transition"
                              >
                                <span>{sub.mod_nombre}</span>
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform ${
                                    activeNestedSubMenu === sub.mod_id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>
                              {activeNestedSubMenu === sub.mod_id && (
                                <div className="mx-2 mb-2 rounded-lg border border-white/20 bg-white/10 p-1">
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
                                          className="block rounded-md px-3 py-2 text-sm hover:bg-white/12 text-white transition"
                                        >
                                          {nested.mod_nombre}
                                        </Link>
                                      ) : (
                                        <span key={`${nested.mod_id}-${nIdx}`} className="block rounded-md px-3 py-2 text-sm text-white">
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
                              className="block px-4 py-2.5 text-sm hover:bg-white/12 text-white transition"
                            >
                              {sub.mod_nombre}
                            </Link>
                          ) : (
                            <span className="block px-4 py-2.5 text-sm text-white">
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
                  className="px-2 py-1 rounded-lg hover:bg-gradient-to-r hover:from-[#0052cc] hover:to-[#0052cc] text-white transition text-sm"
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

        {/* Usuario, botón cerrar y menú móvil */}
        <div className="flex items-center space-x-4">
          <span className="hidden md:block text-white text-sm font-medium">
            {nombreUsuario}
          </span>
          <button
            onClick={logout}
            className="hidden md:block px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Cerrar sesión
          </button>
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
        <div className="md:hidden bg-gradient-to-b from-[#003d99] to-[#0052cc] p-4 space-y-2">
          <div className="px-3 py-2 text-white text-sm font-medium border-b border-[#0052cc]">
            {nombreUsuario}
          </div>
          {topLevelModulos.map((m, idx) => (
            <div key={`${m.mod_id}-${idx}`}>
              {getSubModulosConFallback(m).length > 0 ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(m.mod_id)}
                    className="flex justify-between w-full px-3 py-2 rounded-lg hover:bg-[#0052cc] text-white transition"
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
                                  className="flex justify-between w-full px-3 py-2 rounded-lg hover:bg-[#0052cc] text-white transition"
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
                                            className="block px-3 py-2 rounded-lg hover:bg-[#0052cc] text-white transition"
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
                                className="block px-3 py-2 rounded-lg hover:bg-[#0052cc] text-white transition"
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
                  className="block px-3 py-2 rounded-lg hover:bg-[#0052cc] text-white transition"
                >
                  {m.mod_nombre}
                </Link>
              )}
            </div>
          ))}

          <button
            onClick={logout}
            className="w-full px-3 py-2 mt-4 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  );
}
