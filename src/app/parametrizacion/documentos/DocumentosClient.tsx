"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Search } from "lucide-react";
import DocumentosTable from "./components/DocumentosTable";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { FileStack } from "lucide-react";

export default function DocumentosClient() {
  const router = useRouter();
  const [items, setItems] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombreFiltroInput, setNombreFiltroInput] = useState("");
  const [estadoFiltroInput, setEstadoFiltroInput] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");

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
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={FileStack}
          eyebrow="Parametrización"
          title="Tipos de documentos"
          subtitle="Administra los tipos de documentos disponibles para el formulario de vinculación."
          actions={
            <button
              onClick={() => router.push("/parametrizacion/documentos/nuevo")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FilterField label="Nombre del documento" className="lg:col-span-2">
              <input
                type="text"
                value={nombreFiltroInput}
                onChange={(event) =>
                  setNombreFiltroInput(event.target.value)
                }
                placeholder="Buscar por nombre..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </FilterField>

            <FilterField label="Estado">
              <select
                value={estadoFiltroInput}
                onChange={(event) =>
                  setEstadoFiltroInput(
                    event.target.value as "todos" | "activos" | "inactivos",
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={handleLimpiar}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">
                Documentos registrados
              </h2>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
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
                onEdit={(item) =>
                  router.push(
                    `/parametrizacion/documentos/${item.tipoDocumentoId}/editar`,
                  )
                }
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
  );
}
