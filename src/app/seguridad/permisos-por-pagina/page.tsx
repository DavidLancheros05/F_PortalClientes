"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Shield, Search } from "lucide-react";
import { rolesService } from "@/services/seguridad/roles.service";

interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string;
  mod_padre_id?: number | null;
  permisos: Permisos;
  subModulos?: Modulo[];
}

interface Rol {
  rol_id: number;
  rol_nombre: string;
  modulos: Modulo[];
}

interface RolConAcceso {
  rol_id: number;
  rol_nombre: string;
  permisos: Permisos;
}

interface PaginaAcceso {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string;
  jerarquia: string;
  nivel: number;
  roles: RolConAcceso[];
}

const hasAnyPermiso = (p: Permisos) =>
  Boolean(p?.ver || p?.crear || p?.editar || p?.eliminar || p?.aprobar);

export default function PermisosPorPaginaPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data: Rol[] = await rolesService.getAll();
        setRoles(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const paginas = useMemo(() => {
    const meta = new Map<
      number,
      {
        mod_id: number;
        mod_nombre: string;
        mod_ruta: string;
        jerarquia: string;
        nivel: number;
      }
    >();
    const accessMap = new Map<number, RolConAcceso[]>();

    const walk = (
      rol: Rol,
      items: Modulo[],
      parentPath: string,
      level: number,
    ) => {
      items.forEach((m) => {
        const path = parentPath
          ? `${parentPath} > ${m.mod_nombre}`
          : m.mod_nombre;

        if (!meta.has(m.mod_id)) {
          meta.set(m.mod_id, {
            mod_id: m.mod_id,
            mod_nombre: m.mod_nombre,
            mod_ruta: m.mod_ruta,
            jerarquia: path,
            nivel: level,
          });
        }

        if (hasAnyPermiso(m.permisos)) {
          const list = accessMap.get(m.mod_id) || [];
          list.push({
            rol_id: rol.rol_id,
            rol_nombre: rol.rol_nombre,
            permisos: m.permisos,
          });
          accessMap.set(m.mod_id, list);
        }

        if (Array.isArray(m.subModulos) && m.subModulos.length > 0) {
          walk(rol, m.subModulos, path, level + 1);
        }
      });
    };

    roles.forEach((rol) => {
      walk(rol, rol.modulos || [], "", 0);
    });

    return Array.from(meta.values())
      .map((m) => ({
        ...m,
        roles: (accessMap.get(m.mod_id) || []).sort((a, b) =>
          a.rol_nombre.localeCompare(b.rol_nombre),
        ),
      }))
      .sort((a, b) => {
        if (a.nivel !== b.nivel) return a.nivel - b.nivel;
        return a.jerarquia.localeCompare(b.jerarquia);
      });
  }, [roles]);

  const paginasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paginas;

    return paginas.filter((p) => {
      const enPagina =
        p.mod_nombre.toLowerCase().includes(q) ||
        p.mod_ruta.toLowerCase().includes(q) ||
        p.jerarquia.toLowerCase().includes(q);
      const enRoles = p.roles.some((r) =>
        r.rol_nombre.toLowerCase().includes(q),
      );
      return enPagina || enRoles;
    });
  }, [paginas, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Permisos por Pagina
              </h1>
              <p className="text-sm text-slate-500">
                Vista inversa: por cada pagina, que roles tienen acceso.
              </p>
            </div>
          </div>

          <Link
            href="/seguridad/roles"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-white"
          >
            Volver a Roles
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pagina, ruta o rol"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            Cargando informacion...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {paginasFiltradas.map((pagina) => (
              <div
                key={pagina.mod_id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-slate-800">
                      {pagina.mod_nombre}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pagina.mod_ruta}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {pagina.jerarquia}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                    {pagina.roles.length} rol(es) con acceso
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {pagina.roles.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Sin roles con acceso
                    </span>
                  ) : (
                    pagina.roles.map((rol) => (
                      <div
                        key={`${pagina.mod_id}-${rol.rol_id}`}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100"
                        title={`Permisos: ${
                          Object.entries(rol.permisos)
                            .filter(([, v]) => !!v)
                            .map(([k]) => k)
                            .join(", ") || "ninguno"
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700">
                          {rol.rol_nombre}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {paginasFiltradas.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                No se encontraron resultados para la busqueda.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
