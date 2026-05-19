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
  motivosRechazoService,
  MotivoRechazo,
} from "@/services/admin/parametrizacion/motivos-rechazo.service";

export default function MotivosRechazoPage() {
  const [motivos, setMotivos] = useState<MotivoRechazo[]>([]);
  const [motivosFiltrados, setMotivosFiltrados] = useState<MotivoRechazo[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoDescripcion, setEditandoDescripcion] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const cargarMotivos = async () => {
    setLoading(true);
    try {
      const data = await motivosRechazoService.getAll();
      setMotivos(data);
      setMotivosFiltrados(data);
    } catch (error) {
      console.error(error);
      setMotivos([]);
      setMotivosFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMotivos();
  }, []);

  const crearMotivo = async () => {
    if (!descripcion.trim()) {
      alert("Por favor ingresa una descripción para el motivo");
      return;
    }

    setSubmitting(true);
    try {
      await motivosRechazoService.create(descripcion);
      setDescripcion("");
      setMostrarNuevo(false);
      await cargarMotivos();
    } catch (error) {
      console.error(error);
      alert("Error al crear el motivo. Por favor, intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (motivo: MotivoRechazo) => {
    setEditandoId(motivo.id);
    setEditandoDescripcion(motivo.descripcion);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoDescripcion("");
  };

  const guardarEdicion = async (id: number) => {
    if (!editandoDescripcion.trim()) {
      alert("La descripción no puede estar vacía");
      return;
    }

    try {
      await motivosRechazoService.update(id, editandoDescripcion);
      setEditandoId(null);
      setEditandoDescripcion("");
      await cargarMotivos();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el motivo. Por favor, intenta nuevamente.");
    }
  };

  const toggleActivo = async (motivo: MotivoRechazo) => {
    if (
      confirm(
        `¿Estás seguro de ${motivo.activo ? "inactivar" : "activar"} este motivo?`,
      )
    ) {
      try {
        await motivosRechazoService.toggleActivo(motivo.id, !motivo.activo);
        await cargarMotivos();
      } catch (error) {
        console.error(error);
        alert("Error al cambiar el estado del motivo.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !submitting) {
      action();
    }
    if (e.key === "Escape" && editandoId) {
      cancelarEdicion();
    }
  };

  const limpiarFormulario = () => {
    setDescripcion("");
  };

  const aplicarFiltros = (sourceMotivos: MotivoRechazo[] = motivos) => {
    const texto = filtroTexto.trim().toLowerCase();

    const resultado = sourceMotivos.filter((motivo) => {
      const textoOk =
        texto === "" || motivo.descripcion.toLowerCase().includes(texto);
      const estadoOk =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVO" ? motivo.activo : !motivo.activo);

      return textoOk && estadoOk;
    });

    setMotivosFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setMotivosFiltrados(motivos);
  };

  const total = motivos.length;
  const activos = motivos.filter((motivo) => motivo.activo).length;
  const inactivos = total - activos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                  Gestión de motivos de rechazo de Solicitudes
                </p>
                <button
                  onClick={() => {
                    console.log("Botón Nuevo clickeado, mostrarNuevo actual:", mostrarNuevo);
                    setMostrarNuevo(true);
                    limpiarFormulario();
                    console.log("Estado actualizado a mostrarNuevo = true");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo
                </button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Motivos de rechazo por solicitud
              </h1>
              <p className="text-gray-600 mt-1">
                Administra los motivos disponibles para rechazar solicitudes
              </p>
            </div>
          </div>

          {mostrarNuevo && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-8" style={{border: "3px solid red"}}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Agregar motivo
                </h2>
                <p className="text-sm text-gray-600">
                  Ingresa la descripción del nuevo motivo de rechazo
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, crearMotivo)}
                    placeholder="Ej: Documentación incompleta"
                    className="md:col-span-2 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={crearMotivo}
                      disabled={!descripcion.trim() || submitting}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                        !descripcion.trim() || submitting
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {submitting ? "Agregando..." : "Agregar"}
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
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar por descripción
                  </label>
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Ej: documentación incompleta"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) =>
                      setFiltroEstado(
                        e.target.value as "TODOS" | "ACTIVO" | "INACTIVO",
                      )
                    }
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="INACTIVO">Inactivos</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => aplicarFiltros()}
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
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-800">
                    Motivos registrados
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {total} motivo{total !== 1 ? "s" : ""} en el sistema
                  </p>
                </div>
                <button
                  onClick={cargarMotivos}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Cargando motivos...</p>
                </div>
              ) : motivosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">📝</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay resultados para los filtros aplicados
                  </h3>
                  <p className="text-gray-500">
                    Ajusta los filtros o limpia la búsqueda
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gradient-to-r from-indigo-100 via-blue-100 to-cyan-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Descripción
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
                    {motivosFiltrados.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {editandoId === m.id ? (
                            <input
                              type="text"
                              value={editandoDescripcion}
                              onChange={(e) =>
                                setEditandoDescripcion(e.target.value)
                              }
                              onKeyPress={(e) =>
                                handleKeyPress(e, () => guardarEdicion(m.id))
                              }
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            m.descripcion
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              m.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {m.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right text-sm">
                          {editandoId === m.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => guardarEdicion(m.id)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                              >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                onClick={cancelarEdicion}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => iniciarEdicion(m)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleActivo(m)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                {m.activo ? "Inactivar" : "Activar"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Total
              </p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">
                {total}
              </p>
            </div>
            <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-semibold">
                Activos
              </p>
              <p className="text-2xl font-semibold text-emerald-700 mt-1">
                {activos}
              </p>
            </div>
            <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Inactivos
              </p>
              <p className="text-2xl font-semibold text-slate-700 mt-1">
                {inactivos}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
