"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, RefreshCw, Search, Pencil, Power, Save, X, Inbox } from "lucide-react";
import {
  diasRespuestaService,
  DiaRespuesta,
  Area,
} from "@/services/admin/parametrizacion/dias-respuesta.service";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";

export default function DiasRespuestaPage() {
  const [items, setItems] = useState<DiaRespuesta[]>([]);
  const [itemsFiltrados, setItemsFiltrados] = useState<DiaRespuesta[]>([]);
  const [area, setArea] = useState<Area>("COMERCIAL");
  const [dias, setDias] = useState<number>(1);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [filtroArea, setFiltroArea] = useState<"TODAS" | Area>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");
  const [filtroDias, setFiltroDias] = useState<string>("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoDias, setEditandoDias] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action?: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await diasRespuestaService.getAll();
      setItems(data);
      // Si ya se había hecho una búsqueda, reaplicarla contra los datos
      // frescos — si no, cada recarga (crear/editar/activar-inactivar)
      // pisaba el resultado filtrado con la lista completa aunque los
      // filtros siguieran mostrando la búsqueda anterior.
      if (hasSearched) {
        await aplicarFiltros();
      } else {
        setItemsFiltrados(data);
      }
    } catch (e) {
      console.error(e);
      setItems([]);
      setItemsFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const loadAreas = async () => {
      try {
        const areasData = await diasRespuestaService.getAreas();
        setAreas(areasData);
      } catch (error) {
        console.error("Error loading areas:", error);
      }
    };
    loadAreas();
  }, []);

  const crear = () => {
    if (dias <= 0) {
      setErrorMessage("Los días deben ser mayores a 0");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Confirmar creación",
      message: `¿Deseas agregar ${dias} día${dias !== 1 ? "s" : ""} de respuesta para el área ${area}?`,
      confirmText: "Sí, agregar",
      action: async () => {
        setSubmitting(true);
        try {
          await diasRespuestaService.create({
            pdr_area: area,
            pdr_dias: dias,
            pdr_estado: true,
          });

          setDias(1);
          setArea("COMERCIAL");
          setMostrarNuevo(false);
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Creado exitosamente",
            message: "El parámetro de días de respuesta ha sido creado",
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage("Error al crear el parámetro");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const iniciarEdicion = (item: DiaRespuesta) => {
    setEditandoId(item.pdr_id);
    setEditandoDias(item.pdr_dias);
  };

  const guardarEdicion = () => {
    if (!editandoId || editandoDias <= 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Confirmar cambios",
      message: `¿Deseas guardar ${editandoDias} día${editandoDias !== 1 ? "s" : ""} de respuesta para este parámetro?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await diasRespuestaService.update(editandoId, {
            pdr_dias: editandoDias,
          });
          setEditandoId(null);
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Actualizado exitosamente",
            message: "El parámetro ha sido actualizado",
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage("Error al actualizar el parámetro");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const toggleEstado = (item: DiaRespuesta) => {
    setConfirmModal({
      isOpen: true,
      title: item.pdr_estado ? "Inactivar parámetro" : "Activar parámetro",
      message: `¿Deseas ${item.pdr_estado ? "inactivar" : "activar"} este parámetro?`,
      isDangerous: item.pdr_estado,
      confirmText: item.pdr_estado ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await diasRespuestaService.toggleEstado(
            item.pdr_id,
            !item.pdr_estado,
          );
          await cargarDatos();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setSuccessMessage({
            title: "Operación exitosa",
            message: `El parámetro ha sido ${item.pdr_estado ? "inactivado" : "activado"}`,
          });
        } catch (e) {
          console.error(e);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setErrorMessage("Error al cambiar el estado del parámetro");
        }
      },
    });
  };

  const limpiarFormulario = () => {
    setArea("COMERCIAL");
    setDias(1);
  };

  const aplicarFiltros = async (sourceItems: DiaRespuesta[] = items) => {
    setLoading(true);
    try {
      const params: any = {};

      if (filtroArea !== "TODAS") {
        params.area = filtroArea;
      }
      if (filtroEstado !== "TODOS") {
        params.estado = filtroEstado === "ACTIVO" ? true : false;
      }
      if (filtroDias.trim() !== "") {
        params.dias = Number(filtroDias);
      }

      const resultado = await diasRespuestaService.search(params);
      setItemsFiltrados(resultado);
      setHasSearched(true);
      setPaginaActual(1);
    } catch (e) {
      console.error(e);
      setErrorMessage("Error al buscar parámetros");
      setItemsFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroArea("TODAS");
    setFiltroEstado("TODOS");
    setFiltroDias("");
    setItemsFiltrados([]);
    setHasSearched(false);
  };

  const irAPagina = (page: number) => {
    setPaginaActual(page);
  };

  const cambiarPageSize = (size: number) => {
    setPageSize(size);
    irAPagina(1);
  };

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const itemsPagina = itemsFiltrados.slice(indiceInicio, indiceFin);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8 ${
        !hasSearched && !loading ? "flex items-center justify-center" : ""
      }`}
    >
      <div className="max-w-5xl w-full mx-auto">
        <PageHeaderCard
          icon={Clock}
          eyebrow="Parametrización"
          title="Días de respuesta"
          subtitle="Tiempos objetivo de respuesta para el flujo de solicitudes, por área"
          actions={
            <button
              onClick={() => {
                setMostrarNuevo(true);
                limpiarFormulario();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FilterField label="Área">
              <select
                value={filtroArea}
                onChange={(e) =>
                  setFiltroArea(e.target.value as "TODAS" | Area)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Estado">
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value as "TODOS" | "ACTIVO" | "INACTIVO",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </FilterField>

            <FilterField label="Días">
              <input
                type="number"
                min={1}
                value={filtroDias}
                onChange={(e) => setFiltroDias(e.target.value)}
                placeholder="Ej: 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={() => aplicarFiltros(items)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={cargarDatos}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {mostrarNuevo && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Nuevo parámetro de días de respuesta
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as Area)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar área</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días
                </label>
                <input
                  type="number"
                  min={1}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Días"
                />
              </div>

              <div className="flex items-end gap-2 md:col-span-2">
                <button
                  onClick={crear}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? "Guardando..." : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarNuevo(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : !hasSearched ? null : itemsFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay resultados para los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">{itemsFiltrados.length}</span>{" "}
                parámetro{itemsFiltrados.length !== 1 ? "s" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Área</Th>
                      <Th>Días</Th>
                      <Th>Estado</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemsPagina.map((item) => (
                      <Tr key={item.pdr_id}>
                        <Td className="whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-xs font-semibold text-gray-700">
                            {item.pdr_area}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap font-medium text-gray-900">
                          {editandoId === item.pdr_id ? (
                            <input
                              type="number"
                              min={1}
                              value={editandoDias}
                              onChange={(e) =>
                                setEditandoDias(Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.pdr_dias
                          )}
                        </Td>
                        <Td className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${
                              item.pdr_estado
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.pdr_estado ? "Activo" : "Inactivo"}
                          </span>
                        </Td>
                        <Td sticky align="right" className="whitespace-nowrap font-medium">
                          {editandoId === item.pdr_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={guardarEdicion}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => iniciarEdicion(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleEstado(item)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                  item.pdr_estado
                                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                <Power className="h-3.5 w-3.5" />
                                {item.pdr_estado ? "Inactivar" : "Activar"}
                              </button>
                            </div>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableContainer>

            <TablePagination
              page={paginaActual}
              pageSize={pageSize}
              totalItems={itemsFiltrados.length}
              onPageChange={irAPagina}
              onPageSizeChange={cambiarPageSize}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onAction={() => setErrorMessage("")}
      />

      <SuccessModal
        isOpen={!!successMessage}
        title={successMessage?.title || "Éxito"}
        message={successMessage?.message || ""}
        actionText="Aceptar"
        onAction={() => setSuccessMessage(null)}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || "Confirmar"}
        isDangerous={confirmModal.isDangerous}
        isLoading={submitting}
        onConfirm={async () => {
          if (confirmModal.action) await confirmModal.action();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
