"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Power,
  Save,
  X,
  Inbox,
  Loader2,
} from "lucide-react";
import {
  diasRespuestaService,
  DiaRespuesta,
  Area,
} from "@/services/admin/parametrizacion/dias-respuesta.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";

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

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "success" | "confirm";
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await diasRespuestaService.getAll();
      setItems(data);
      setItemsFiltrados(data);
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

  const crear = async () => {
    if (dias <= 0) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Datos inválidos",
        message: "Los días deben ser mayores a 0",
      });
      return;
    }

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
      setModalState({
        isOpen: true,
        type: "success",
        title: "Creado exitosamente",
        message: "El parámetro de días de respuesta ha sido creado",
      });
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Error al crear el parámetro",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (item: DiaRespuesta) => {
    setEditandoId(item.pdr_id);
    setEditandoDias(item.pdr_dias);
  };

  const guardarEdicion = async () => {
    if (!editandoId || editandoDias <= 0) return;

    try {
      await diasRespuestaService.update(editandoId, {
        pdr_dias: editandoDias,
      });
      setEditandoId(null);
      await cargarDatos();
      setModalState({
        isOpen: true,
        type: "success",
        title: "Actualizado exitosamente",
        message: "El parámetro ha sido actualizado",
      });
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Error al actualizar el parámetro",
      });
    }
  };

  const toggleEstado = (item: DiaRespuesta) => {
    setModalState({
      isOpen: true,
      type: "confirm",
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
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `El parámetro ha sido ${item.pdr_estado ? "inactivado" : "activado"}`,
          });
        } catch (e) {
          console.error(e);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al cambiar el estado del parámetro",
          });
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
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Error al buscar parámetros",
      });
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

  const total = items.length;
  const activos = items.filter((item) => item.pdr_estado).length;
  const inactivos = total - activos;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Parametrización
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Días de respuesta
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tiempos objetivo de respuesta para el flujo de solicitudes, por
              área
            </p>
          </div>

          <div className="flex items-center gap-5">
            <dl className="flex items-center gap-4 text-sm">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-slate-400">Total</dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  {total}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <dt className="text-slate-400">Activos</dt>
                <dd className="font-semibold tabular-nums text-emerald-700">
                  {activos}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <dt className="text-slate-400">Inactivos</dt>
                <dd className="font-semibold tabular-nums text-slate-500">
                  {inactivos}
                </dd>
              </div>
            </dl>

            <button
              onClick={() => {
                setMostrarNuevo(true);
                limpiarFormulario();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003d99] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc]"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Consola: filtros + alta + tabla */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
            <div className="flex min-w-[160px] flex-1 flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Área
              </label>
              <select
                value={filtroArea}
                onChange={(e) =>
                  setFiltroArea(e.target.value as "TODAS" | Area)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
              >
                <option value="TODAS">Todas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[160px] flex-1 flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(
                    e.target.value as "TODOS" | "ACTIVO" | "INACTIVO",
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>

            <div className="flex min-w-[120px] flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Días
              </label>
              <input
                type="number"
                min={1}
                value={filtroDias}
                onChange={(e) => setFiltroDias(e.target.value)}
                placeholder="Ej: 5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => aplicarFiltros(items)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003d99] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052cc]"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            </div>

            <button
              onClick={cargarDatos}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>

          {mostrarNuevo && (
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-[#003d99]/[0.04] px-5 py-4">
              <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Área
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as Area)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
                >
                  <option value="">Seleccionar área</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex min-w-[120px] flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Días
                </label>
                <input
                  type="number"
                  min={1}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
                  placeholder="Días"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={crear}
                  disabled={submitting}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    submitting
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-[#003d99] text-white hover:bg-[#0052cc]"
                  }`}
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {!hasSearched ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                Selecciona los filtros y haz clic en «Buscar» para ver los
                resultados.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#0052cc]" />
              <p className="text-sm text-slate-500">Cargando...</p>
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <Inbox className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                No hay resultados para los filtros aplicados.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3 text-sm text-slate-500">
                <span>
                  {itemsFiltrados.length} resultado
                  {itemsFiltrados.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[#003d99]">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                        Área
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                        Días
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                        Estado
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-white">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsFiltrados.map((item) => (
                      <tr key={item.pdr_id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 text-sm">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {item.pdr_area}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium tabular-nums text-slate-900">
                          {editandoId === item.pdr_id ? (
                            <input
                              type="number"
                              min={1}
                              value={editandoDias}
                              onChange={(e) =>
                                setEditandoDias(Number(e.target.value))
                              }
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0052cc]/40"
                            />
                          ) : (
                            item.pdr_dias
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.pdr_estado
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                              }`}
                            />
                            <span
                              className={
                                item.pdr_estado
                                  ? "text-emerald-700"
                                  : "text-slate-500"
                              }
                            >
                              {item.pdr_estado ? "Activo" : "Inactivo"}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm">
                          {editandoId === item.pdr_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={guardarEdicion}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-[#003d99] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0052cc]"
                              >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => iniciarEdicion(item)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleEstado(item)}
                                className={`inline-flex min-w-[92px] items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                  item.pdr_estado
                                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                {item.pdr_estado ? "Inactivar" : "Activar"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalState.type === "error" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Aceptar"
          isDangerous={true}
          onConfirm={() => setModalState({ ...modalState, isOpen: false })}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === "success" && (
        <SuccessModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          actionText="Aceptar"
          onAction={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === "confirm" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText || "Confirmar"}
          isDangerous={modalState.isDangerous}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
            setModalState({ ...modalState, isOpen: false });
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
