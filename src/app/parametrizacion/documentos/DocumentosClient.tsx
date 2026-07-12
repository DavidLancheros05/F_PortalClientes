"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, RotateCcw, Search, X } from "lucide-react";
import DocumentosForm from "./components/DocumentosForm";
import DocumentosTable from "./components/DocumentosTable";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";

export default function DocumentosClient() {
  const [items, setItems] = useState<TipoDocumento[]>([]);
  const [editItem, setEditItem] = useState<TipoDocumento | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nombreFiltroInput, setNombreFiltroInput] = useState("");
  const [estadoFiltroInput, setEstadoFiltroInput] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");

  const abrirFormulario = (item: TipoDocumento | null) => {
    setEditItem(item);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setEditItem(null);
    setMostrarFormulario(false);
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await documentosService.getAll();
      setItems(data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleBuscar = () => {
    setNombreFiltro(nombreFiltroInput.trim().toLowerCase());
    setEstadoFiltro(estadoFiltroInput);
  };

  const handleLimpiar = () => {
    setNombreFiltroInput("");
    setEstadoFiltroInput("todos");
    setNombreFiltro("");
    setEstadoFiltro("todos");
  };

  const documentosFiltrados = useMemo(() => {
    return items.filter((item) => {
      const matchNombre = nombreFiltro
        ? item.nombre.toLowerCase().includes(nombreFiltro) ||
          (item.descripcion || "").toLowerCase().includes(nombreFiltro)
        : true;

      const matchEstado =
        estadoFiltro === "todos"
          ? true
          : estadoFiltro === "activos"
            ? item.estado
            : !item.estado;

      return matchNombre && matchEstado;
    });
  }, [items, nombreFiltro, estadoFiltro]);

  const total = items.length;
  const activos = items.filter((item) => item.estado).length;
  const inactivos = total - activos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                <p className="text-lg md:text-xl font-bold text-blue-800 leading-tight">
                  Gestión de tipos de documentos
                </p>
                <button
                  onClick={() => abrirFormulario(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo
                </button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
              <h1 className="text-base md:text-lg font-semibold text-gray-800">
                Tipos de documentos para el formulario
              </h1>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nombre del documento
                  </label>
                  <input
                    type="text"
                    value={nombreFiltroInput}
                    onChange={(event) =>
                      setNombreFiltroInput(event.target.value)
                    }
                    placeholder="Buscar por nombre..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Estado
                  </label>
                  <select
                    value={estadoFiltroInput}
                    onChange={(event) =>
                      setEstadoFiltroInput(
                        event.target.value as "todos" | "activos" | "inactivos",
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="todos">Todos</option>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleBuscar}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Buscar
                  </button>
                  <button
                    onClick={handleLimpiar}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {mostrarFormulario &&
            typeof document !== "undefined" &&
            createPortal(
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-200 p-6">
                    <div className="flex items-center gap-2 text-slate-800">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h2 className="text-base font-semibold">
                        {editItem
                          ? "Editar tipo de documento"
                          : "Crear tipo de documento"}
                      </h2>
                    </div>
                    <button
                      onClick={cerrarFormulario}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6">
                    <DocumentosForm
                      editItem={editItem || undefined}
                      onSaved={() => {
                        cerrarFormulario();
                        cargarDatos();
                      }}
                      onCancel={cerrarFormulario}
                    />
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Documentos registrados
              </h2>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {documentosFiltrados.length} registros
              </span>
            </div>

            {loading ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Cargando...
              </p>
            ) : (
              <DocumentosTable
                items={documentosFiltrados}
                onEdit={(item) => abrirFormulario(item)}
                onReload={cargarDatos}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-6">
            <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">{total}</p>
            </div>
            <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Activos</p>
              <p className="text-xl font-bold text-emerald-600">{activos}</p>
            </div>
            <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Inactivos</p>
              <p className="text-xl font-bold text-red-500">{inactivos}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
