"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import {
  usuarioRolesService,
  type Asignacion,
} from "@/services/usuario-roles/usuario-roles.service";
import { rolesService, type Rol } from "@/services/seguridad/roles.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";

import {
  Shield,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  X,
  Search,
} from "lucide-react";

export default function RolesUsuariosPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);

  const [roles, setRoles] = useState<Rol[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandido, setExpandido] = useState<number | null>(null);

  // Filtros — igual patrón que usuario-roles: input "borrador" vs. término
  // aplicado, tabla oculta hasta el primer clic en Buscar.
  const [rolInput, setRolInput] = useState("");
  const [rolTerm, setRolTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesData, asignacionesData] = await Promise.all([
        rolesService.getAll(),
        usuarioRolesService.getAllAsignaciones(),
      ]);
      setRoles(rolesData);
      setAsignaciones(asignacionesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const handleBuscar = () => {
    setRolTerm(rolInput.trim());
    setHasSearched(true);
  };
  const handleLimpiarFiltros = () => {
    setRolInput("");
    setRolTerm("");
    setHasSearched(false);
  };

  const rolSugerencias = useMemo(
    () => roles.map((r) => r.rolNombre ?? ""),
    [roles],
  );

  // Usuarios por rol, agrupados de la única llamada a getAllAsignaciones —
  // a diferencia de usuario-roles (que pide los roles de un usuario recién
  // al expandirlo), acá ya tenemos todo de una vez, así el contador de cada
  // fila es siempre exacto sin importar si está expandida o no.
  const usuariosPorRol = useMemo(() => {
    const mapa = new Map<number, Asignacion[]>();
    for (const asignacion of asignaciones) {
      const lista = mapa.get(asignacion.rolId) ?? [];
      lista.push(asignacion);
      mapa.set(asignacion.rolId, lista);
    }
    return mapa;
  }, [asignaciones]);

  const rolesFiltrados = useMemo(() => {
    const term = rolTerm.toLowerCase();
    if (!term) return roles;
    return roles.filter(
      (rol) =>
        rol.rolNombre?.toLowerCase().includes(term) ||
        rol.rolCodigo?.toLowerCase().includes(term),
    );
  }, [roles, rolTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Shield}
          eyebrow="Seguridad"
          title="Usuarios por Rol"
          subtitle="Consulta qué usuarios tiene asignado cada rol"
          onBack={() => router.push("/seguridad/usuario-roles")}
          actions={
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SuggestField
              label="Rol"
              placeholder="Buscar por nombre o código..."
              value={rolInput}
              onChange={setRolInput}
              suggestions={rolSugerencias}
              onEnter={handleBuscar}
              className="md:col-span-2"
            />

            <FilterActions className="col-span-full">
              <button
                onClick={handleLimpiarFiltros}
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

        {loading && roles.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
            <div className="flex">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchData()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : roles.length === 0 ? (
          <EmptyStateCard icon={Shield} title="No hay roles disponibles" />
        ) : !hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title="Presiona Buscar para ver los roles."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : rolesFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Shield}
            title="Ningún rol coincide con los filtros"
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {rolesFiltrados.map((rol) => {
                const usuariosDelRol = usuariosPorRol.get(rol.rolId) ?? [];
                return (
                  <div key={rol.rolId}>
                    <button
                      onClick={() =>
                        setExpandido(
                          rol.rolId === expandido ? null : rol.rolId,
                        )
                      }
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center flex-1">
                        <div className="h-10 w-10 rounded-lg bg-[#eef3ff] flex items-center justify-center mr-4">
                          <Shield className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {rol.rolNombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rol.rolCodigo}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#eef3ff] text-brand-700 rounded-full text-xs font-medium">
                          {usuariosDelRol.length} usuario
                          {usuariosDelRol.length === 1 ? "" : "s"}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition ${
                            expandido === rol.rolId ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {expandido === rol.rolId && (
                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                          Usuarios con este rol:
                        </h4>
                        {usuariosDelRol.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            Ningún usuario tiene este rol asignado
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {usuariosDelRol.map((asignacion) => (
                              <div
                                key={asignacion.usuarioId}
                                className="flex items-center bg-white p-3 rounded-lg border border-gray-200"
                              >
                                <Users className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {asignacion.usuarioNombre}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {asignacion.usuarioCorreo ||
                                      asignacion.usuarioLogin ||
                                      "Sin correo registrado"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
