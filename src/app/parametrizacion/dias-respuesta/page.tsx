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
} from "lucide-react";
import {
  diasRespuestaService,
  DiaRespuesta,
  Area,
} from "@/services/admin/parametrizacion/dias-respuesta.service";
import ConfirmModal from "@/components/modals/ConfirmModal";
import SuccessModal from "@/components/modals/SuccessModal";

export default function DiasRespuestaPage() {
  const [items, setItems] = useState<DiaRespuesta[]>([]);
  const [itemsFiltrados, setItemsFiltrados] = useState<DiaRespuesta[]>([]);
  const [area, setArea] = useState<Area>("COMERCIAL");
  const [dias, setDias] = useState<number>(1);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [filtroArea, setFiltroArea] = useState<"TODAS" | Area>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVO" | "INACTIVO">("TODOS");
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
    type: 'error' | 'success' | 'confirm';
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
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
        console.error('Error loading areas:', error);
      }
    };
    loadAreas();
  }, []);

  const crear = async () => {
    if (dias <= 0) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Datos inválidos',
        message: 'Los días deben ser mayores a 0',
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
        type: 'success',
        title: 'Creado exitosamente',
        message: 'El parámetro de días de respuesta ha sido creado',
      });
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al crear el parámetro',
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
        type: 'success',
        title: 'Actualizado exitosamente',
        message: 'El parámetro ha sido actualizado',
      });
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al actualizar el parámetro',
      });
    }
  };

  const toggleEstado = (item: DiaRespuesta) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: item.pdr_estado ? 'Inactivar parámetro' : 'Activar parámetro',
      message: `¿Deseas ${item.pdr_estado ? "inactivar" : "activar"} este parámetro?`,
      isDangerous: item.pdr_estado,
      confirmText: item.pdr_estado ? 'Inactivar' : 'Activar',
      action: async () => {
        try {
          await diasRespuestaService.toggleEstado(
            item.pdr_id,
            !item.pdr_estado
          );
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: 'success',
            title: 'Operación exitosa',
            message: `El parámetro ha sido ${item.pdr_estado ? 'inactivado' : 'activado'}`,
          });
        } catch (e) {
          console.error(e);
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Error al cambiar el estado del parámetro',
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
        type: 'error',
        title: 'Error',
        message: 'Error al buscar parámetros',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                    Días de respuesta de solicitudes
                  </p>
                  <p className="text-gray-600 mt-2">
                    Configura los tiempos objetivo para el flujo de solicitudes
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarNuevo(true);
                    limpiarFormulario();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Área
                  </label>
                  <select
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value as "TODAS" | Area)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODAS">Todas</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) =>
                      setFiltroEstado(
                        e.target.value as "TODOS" | "ACTIVO" | "INACTIVO"
                      )
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Días
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={filtroDias}
                    onChange={(e) => setFiltroDias(e.target.value)}
                    placeholder="Ej: 5"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => aplicarFiltros(items)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>

                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              </div>
            </div>
          </div>

        {mostrarNuevo && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Agregar parámetro
            </h2>
            <p className="text-sm text-gray-600">
              Define el área y la cantidad de días de respuesta
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as Area)}
                className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar área</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Días"
              />

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={crear}
                    disabled={submitting}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      submitting
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <X className="h-4 w-4" />
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {!hasSearched ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">🔍</span>
            </div>
            <p className="text-gray-600">
              Selecciona los filtros y haz clic en "Buscar" para ver los resultados.
            </p>
          </div>
        ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-800">
                  Parámetros registrados
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cargarDatos}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-600">No hay resultados para los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-100">
                <thead className="bg-gradient-to-r from-indigo-100 via-blue-100 to-cyan-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                      Área
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                      Días
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsFiltrados.map((item) => (
                    <tr key={item.pdr_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {item.pdr_area}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editandoId === item.pdr_id ? (
                          <input
                            type="number"
                            min={1}
                            value={editandoDias}
                            onChange={(e) =>
                              setEditandoDias(Number(e.target.value))
                            }
                            className="border border-gray-300 px-2 py-1 rounded w-24 text-sm"
                          />
                        ) : (
                          item.pdr_dias
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            item.pdr_estado
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.pdr_estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {editandoId === item.pdr_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={guardarEdicion}
                              className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              <Save className="mr-1 h-3.5 w-3.5" />
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => iniciarEdicion(item)}
                              className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => toggleEstado(item)}
                              className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
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
          )}
        </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total
            </p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">{total}</p>
          </div>
          <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-semibold">
              Activos
            </p>
            <p className="text-2xl font-semibold text-emerald-700 mt-1">{activos}</p>
          </div>
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Inactivos
            </p>
            <p className="text-2xl font-semibold text-slate-700 mt-1">{inactivos}</p>
          </div>
        </div>
        </div>
      </div>

      {/* Modals */}
      {modalState.type === 'error' && (
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

      {modalState.type === 'success' && (
        <SuccessModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          actionText="Aceptar"
          onAction={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === 'confirm' && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText || 'Confirmar'}
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
