"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Search, Pencil, Power, Save, X } from "lucide-react";
import {
  formularioTiposPreguntaService,
  TipoPregunta,
} from "@/services/parametrizacion/formulario-tipos-pregunta.service";

export default function FormularioTiposPreguntaPage() {
  const [items, setItems] = useState<TipoPregunta[]>([]);
  const [itemsFiltrados, setItemsFiltrados] = useState<TipoPregunta[]>([]);

  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoCodigo, setEditandoCodigo] = useState("");
  const [editandoDescripcion, setEditandoDescripcion] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const cargarTipos = async () => {
    setLoading(true);
    try {
      const data = await formularioTiposPreguntaService.getAll(true);
      setItems(data);
      setItemsFiltrados(data);
    } catch (error) {
      console.error(error);
      setItems([]);
      setItemsFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTipos();
  }, []);

  const aplicarFiltros = (sourceItems: TipoPregunta[] = items) => {
    const texto = filtroTexto.trim().toLowerCase();

    const resultado = sourceItems.filter((item) => {
      const textoOk =
        texto === "" ||
        item.fti_codigo.toLowerCase().includes(texto) ||
        item.fti_descripcion.toLowerCase().includes(texto);

      const estadoOk =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVO" ? item.fti_estado : !item.fti_estado);

      return textoOk && estadoOk;
    });

    setItemsFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setItemsFiltrados(items);
  };

  const limpiarFormulario = () => {
    setNuevoCodigo("");
    setNuevaDescripcion("");
  };

  const crearTipo = async () => {
    if (!nuevoCodigo.trim()) {
      alert("El código es obligatorio");
      return;
    }

    if (!nuevaDescripcion.trim()) {
      alert("La descripción es obligatoria");
      return;
    }

    setSubmitting(true);
    try {
      await formularioTiposPreguntaService.create({
        fti_codigo: nuevoCodigo.trim().toUpperCase(),
        fti_descripcion: nuevaDescripcion.trim(),
        fti_estado: true,
      });

      setMostrarNuevo(false);
      limpiarFormulario();
      await cargarTipos();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Error al crear el tipo de pregunta");
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (item: TipoPregunta) => {
    setEditandoId(item.fti_id);
    setEditandoCodigo(item.fti_codigo);
    setEditandoDescripcion(item.fti_descripcion);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoCodigo("");
    setEditandoDescripcion("");
  };

  const guardarEdicion = async (item: TipoPregunta) => {
    if (!editandoCodigo.trim()) {
      alert("El código es obligatorio");
      return;
    }

    if (!editandoDescripcion.trim()) {
      alert("La descripción es obligatoria");
      return;
    }

    try {
      await formularioTiposPreguntaService.update(item.fti_id, {
        fti_codigo: editandoCodigo.trim().toUpperCase(),
        fti_descripcion: editandoDescripcion.trim(),
        fti_estado: item.fti_estado,
      });

      cancelarEdicion();
      await cargarTipos();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Error al actualizar");
    }
  };

  const toggleEstado = async (item: TipoPregunta) => {
    const confirmar = confirm(
      `¿Deseas ${item.fti_estado ? "inactivar" : "activar"} este tipo de pregunta?`,
    );

    if (!confirmar) return;

    try {
      await formularioTiposPreguntaService.updateStatus(
        item.fti_id,
        !item.fti_estado,
      );

      await cargarTipos();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Error al cambiar estado");
    }
  };

  const total = items.length;
  const activos = items.filter((item) => item.fti_estado).length;
  const inactivos = total - activos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                  Gestión de tipos de pregunta
                </p>
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
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Catálogo de tipos de pregunta del formulario
              </h1>
              <p className="text-gray-600 mt-1">
                Administra los tipos disponibles para configurar preguntas.
              </p>
            </div>
          </div>

          {mostrarNuevo && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Agregar tipo
                </h2>
                <p className="text-sm text-gray-600">
                  Define código y descripción del nuevo tipo de pregunta
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    value={nuevoCodigo}
                    onChange={(event) =>
                      setNuevoCodigo(event.target.value.toUpperCase())
                    }
                    placeholder="Ej: TEXTO"
                    className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                  <input
                    value={nuevaDescripcion}
                    onChange={(event) =>
                      setNuevaDescripcion(event.target.value)
                    }
                    placeholder="Ej: Pregunta de texto libre"
                    className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                    disabled={submitting}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={crearTipo}
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
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar por código o descripción
                  </label>
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(event) => setFiltroTexto(event.target.value)}
                    placeholder="Ej: texto, selección"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(event) =>
                      setFiltroEstado(
                        event.target.value as "TODOS" | "ACTIVO" | "INACTIVO",
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
                    Tipos registrados
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {total} tipo{total !== 1 ? "s" : ""} en el sistema
                  </p>
                </div>
                <button
                  onClick={cargarTipos}
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
                  <p className="text-gray-600">Cargando tipos de pregunta...</p>
                </div>
              ) : itemsFiltrados.length === 0 ? (
                <div className="text-center py-12">
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
                        Código
                      </th>
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
                    {itemsFiltrados.map((item) => (
                      <tr
                        key={item.fti_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {editandoId === item.fti_id ? (
                            <input
                              value={editandoCodigo}
                              onChange={(event) =>
                                setEditandoCodigo(
                                  event.target.value.toUpperCase(),
                                )
                              }
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.fti_codigo
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900">
                          {editandoId === item.fti_id ? (
                            <input
                              value={editandoDescripcion}
                              onChange={(event) =>
                                setEditandoDescripcion(event.target.value)
                              }
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            item.fti_descripcion
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              item.fti_estado
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.fti_estado ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right text-sm">
                          {editandoId === item.fti_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => guardarEdicion(item)}
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
                                {item.fti_estado ? "Inactivar" : "Activar"}
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
