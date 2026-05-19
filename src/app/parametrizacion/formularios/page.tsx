"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  History,
  CheckCircle,
  Eye,
  Search,
  RefreshCw,
  X,
  Trash2,
} from "lucide-react";
import { formulariosService } from "@/services/parametrizacion/formularios.service";

interface Formulario {
  frm_id: number;
  frm_nombre: string;
  frm_descripcion: string;
  formulario_version: number;
  frm_activo: boolean;
  Formulario_versiones_totales: number;
  created_at: string;
}

export default function FormulariosPage() {
  const router = useRouter();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [formulariosFiltrados, setFormulariosFiltrados] = useState<
    Formulario[]
  >([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");
  const [loading, setLoading] = useState(true);

  const cargarFormularios = async (texto = "", estado = "TODOS") => {
    setLoading(true);
    const lista = await formulariosService.listar(texto, estado);
    setFormularios(lista);
    setFormulariosFiltrados(lista);
    setLoading(false);
  };

  useEffect(() => {
    cargarFormularios();
  }, []);

  const buscarFormularios = async () => {
    await cargarFormularios(filtroTexto, filtroEstado);
  };

  const limpiarFiltros = async () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    await cargarFormularios("", "TODOS");
  };

  const total = formularios.length;
  const activos = formularios.filter((f) => f.frm_activo).length;
  const inactivos = total - activos;

  const eliminarFormulario = async (formulario: Formulario) => {
    const confirmar = confirm(
      `¿Eliminar el formulario "${formulario.frm_nombre}"?\n\nEsta acción eliminará sus versiones y preguntas asociadas.`,
    );

    if (!confirmar) return;

    const exito = await formulariosService.eliminar(formulario.frm_id);
    if (exito) {
      await cargarFormularios();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formularios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="mb-3">
                <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                  Gestión de formularios
                </p>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Formularios y sus versiones
              </h1>
              <p className="text-gray-600 mt-1">
                Administra formularios, versiones y edición de contenido
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar formulario
                  </label>
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Nombre o descripción"
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
                    onClick={buscarFormularios}
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
                    Formularios registrados
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {total} formulario{total !== 1 ? "s" : ""} en el sistema
                  </p>
                </div>
                <button
                  onClick={() => cargarFormularios()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {formulariosFiltrados.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No hay resultados para los filtros aplicados
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {formulariosFiltrados.map((formulario) => (
                    <div
                      key={formulario.frm_id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                              {formulario.frm_nombre}
                            </h3>
                            {formulario.frm_activo ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                <CheckCircle className="h-4 w-4" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">
                            {formulario.frm_descripcion || "Sin descripción"}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>
                              Versión actual: v{formulario.formulario_version}
                            </span>
                            <span>•</span>
                            <span>
                              {formulario.Formulario_versiones_totales}{" "}
                              versiones totales
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/parametrizacion/formularios/${formulario.frm_id}/versiones`,
                              )
                            }
                            className="inline-flex min-w-[104px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                            title="Gestionar versiones"
                          >
                            <History className="h-4 w-4" />
                            Gestionar versiones
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                `/parametrizacion/formulario-editor?formulario_id=${formulario.frm_id}&version=${formulario.formulario_version}&readonly=true`,
                              )
                            }
                            className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                            title="Vista previa del formulario"
                          >
                            <Eye className="h-4 w-4" />
                            Vista previa
                          </button>
                          <button
                            onClick={() => eliminarFormulario(formulario)}
                            className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                            title="Eliminar formulario"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
