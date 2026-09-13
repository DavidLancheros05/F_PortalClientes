"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Shield, Search, X } from "lucide-react";
import {
  rolesService,
  type Rol,
  type Modulo,
} from "@/services/seguridad/roles.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";

interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

interface RolConAcceso {
  rolId: number;
  rolNombre: string;
  permisos: Permisos;
}

interface PaginaAcceso {
  mod_id: number;
  mod_nombre: string;
  mod_ruta?: string;
  jerarquia: string;
  nivel: number;
  roles: RolConAcceso[];
}

const hasAnyPermiso = (p: Permisos) =>
  Boolean(p?.ver || p?.crear || p?.editar || p?.eliminar || p?.aprobar);

export default function PermisosPorPaginaPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
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
        mod_ruta?: string;
        jerarquia: string;
        nivel: number;
        roles: RolConAcceso[];
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
          const pagina: PaginaAcceso = {
            mod_id: m.mod_id,
            mod_nombre: m.mod_nombre,
            mod_ruta: m.mod_ruta,
            jerarquia: path,
            nivel: level,
            roles: [],
          };
          meta.set(m.mod_id, pagina);
        }

        if (hasAnyPermiso(m.permisos)) {
          const list = accessMap.get(m.mod_id) || [];
          list.push({
            rolId: rol.rolId,
            rolNombre: rol.rolNombre,
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
          a.rolNombre.localeCompare(b.rolNombre),
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
        (p.mod_ruta?.toLowerCase().includes(q) ?? false) ||
        p.jerarquia.toLowerCase().includes(q);
      const enRoles = p.roles.some((r) =>
        r.rolNombre.toLowerCase().includes(q),
      );
      return enPagina || enRoles;
    });
  }, [paginas, search]);

  const handleBuscar = () => setSearch(searchInput.trim());
  const handleLimpiar = () => {
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={ArrowLeftRight}
          eyebrow="Seguridad"
          title="Permisos por Página"
          subtitle="Vista inversa: por cada página, qué roles tienen acceso"
          onBack={() => router.push("/seguridad/roles")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterField label="Buscar" className="md:col-span-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                placeholder="Página, ruta o rol"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </FilterField>

            <FilterActions className="md:col-span-1 flex md:items-end">
              <button
                onClick={handleLimpiar}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500">Cargando información...</p>
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
                  <span className="text-xs font-medium px-2 py-1 rounded bg-[#eef3ff] text-brand-700">
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
                        key={`${pagina.mod_id}-${rol.rolId}`}
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
                          {rol.rolNombre}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {paginasFiltradas.length === 0 && (
              <EmptyStateCard
                icon={Search}
                title="No se encontraron resultados"
                subtitle="Ajusta la búsqueda e intenta de nuevo"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
