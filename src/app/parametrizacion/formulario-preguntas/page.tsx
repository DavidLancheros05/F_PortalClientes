"use client";

import { useEffect, useState } from "react";
import FormularioPreguntaForm from "./components/FormularioPreguntaForm";
import FormularioPreguntaTable from "./components/FormularioPreguntaTable";
import {
  FormularioPregunta,
  formularioPreguntasService,
} from "@/services/parametrizacion/formulario-preguntas.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { TablePagination } from "@/components/tables/TablePagination";
import { HelpCircle, Plus, RefreshCw, Search, X } from "lucide-react";

export default function FormularioPreguntasPage() {
  const [items, setItems] = useState<FormularioPregunta[]>([]);
  const [editItem, setEditItem] = useState<FormularioPregunta | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [hasSearched, setHasSearched] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await formularioPreguntasService.getAll();
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

  const itemsFiltrados = items.filter((item) => {
    const texto = filtroTexto.trim().toLowerCase();
    const coincideTexto = !texto || item.fp_descripcion.toLowerCase().includes(texto);
    const coincideTipo = filtroTipo === "TODOS" || item.fp_tipo === filtroTipo;
    const coincideEstado = filtroEstado === "TODOS" || (filtroEstado === "ACTIVO" ? item.fp_estado : !item.fp_estado);
    return coincideTexto && coincideTipo && coincideEstado;
  });
  const indiceInicio = (paginaActual - 1) * pageSize;
  const itemsPagina = itemsFiltrados.slice(indiceInicio, indiceInicio + pageSize);

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroTipo("TODOS");
    setFiltroEstado("TODOS");
    setHasSearched(false);
    setPaginaActual(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeaderCard
          icon={HelpCircle}
          eyebrow="Parametrización"
          title="Preguntas del formulario"
          subtitle="Administra el catálogo de preguntas reutilizables del formulario de vinculación."
          actions={
            <button
              onClick={() => {
                setEditItem(null);
                setMostrarFormulario(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]">
              <Plus className="h-4 w-4" /> Nueva pregunta
            </button>
          }>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <FilterField label="Buscar por descripción" className="md:col-span-2">
              <input
                value={filtroTexto}
                onChange={(event) => setFiltroTexto(event.target.value)}
                placeholder="Ej: razón social"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Tipo">
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="TODOS">Todos</option>
                {[...new Set(items.map((item) => item.fp_tipo))].sort().map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Estado">
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="TODOS">Todos</option>
                <option value="ACTIVO">Activas</option>
                <option value="INACTIVO">Inactivas</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={() => {
                  setPaginaActual(1);
                  setHasSearched(true);
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Search className="h-4 w-4" /> Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                <X className="h-4 w-4" /> Limpiar
              </button>
              <button
                onClick={cargarDatos}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                <RefreshCw className="h-4 w-4" /> Actualizar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading ? (
          <div className="rounded-[22px] border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            Cargando preguntas...
          </div>
        ) : !hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title="Busca preguntas"
            subtitle="Usa los filtros para consultar las preguntas del formulario."
          />
        ) : itemsFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={HelpCircle}
            title="Sin resultados"
            subtitle="No hay preguntas que coincidan con los filtros seleccionados."
          />
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-[#e9ecf2] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
            <FormularioPreguntaTable
              items={itemsPagina}
              onEdit={(item) => {
                setEditItem(item);
                setMostrarFormulario(true);
              }}
              onReload={cargarDatos}
            />
            <TablePagination
              page={paginaActual}
              pageSize={pageSize}
              totalItems={itemsFiltrados.length}
              onPageChange={setPaginaActual}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPaginaActual(1);
              }}
            />
          </div>
        )}
      </div>

      {mostrarFormulario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pregunta-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMostrarFormulario(false);
          }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-600">Parametrización</p>
                <h2 id="pregunta-modal-title" className="text-lg font-bold text-gray-900">
                  {editItem ? "Editar pregunta" : "Nueva pregunta"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                title="Cerrar"
                onClick={() => setMostrarFormulario(false)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <FormularioPreguntaForm
                editItem={editItem || undefined}
                onSaved={() => {
                  setEditItem(null);
                  setMostrarFormulario(false);
                  cargarDatos();
                }}
                onCancel={() => setMostrarFormulario(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
