"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Search } from "lucide-react";
import DocumentosTable from "./components/DocumentosTable";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";
import { TablePagination } from "@/components/tables/TablePagination";
import { FileStack } from "lucide-react";

const FILTROS_STORAGE_KEY = "parametrizacion:documentos:filtros";
// Marca de un solo uso: solo se restaura la búsqueda/página guardada si el
// usuario vuelve de crear/editar un tipo de documento (que es quien la deja
// puesta antes de navegar). Un reload de esta página o entrar desde
// cualquier otro lugar del sitio no la encuentra, así que arranca limpia.
const RETURN_MARKER_KEY = "parametrizacion:documentos:return-marker";

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

  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

    if (typeof window === "undefined") return;
    try {
      // Si no está la marca, esta carga no vino de "Editar"/"Nuevo" (fue un
      // reload o una navegación desde otra página) — arranca limpia.
      const hasReturnMarker = sessionStorage.getItem(RETURN_MARKER_KEY);
      if (!hasReturnMarker) return;
      sessionStorage.removeItem(RETURN_MARKER_KEY);

      const raw = sessionStorage.getItem(FILTROS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setNombreFiltroInput(saved.nombreFiltroInput ?? "");
      setEstadoFiltroInput(saved.estadoFiltroInput ?? "todos");
      setNombreFiltro(saved.nombreFiltro ?? "");
      setEstadoFiltro(saved.estadoFiltro ?? "todos");
      setPaginaActual(saved.paginaActual ?? 1);
      setPageSize(saved.pageSize ?? 10);
    } catch {
      // sessionStorage corrupto o no disponible: arranca limpio.
    }
  }, []);

  const skipNextPersistRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // La primera pasada (montaje) coincide con el efecto que restaura desde
    // sessionStorage; si escribimos aquí, guardamos los valores por defecto
    // (aún no actualizados) y pisamos lo que se acaba de restaurar.
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    sessionStorage.setItem(
      FILTROS_STORAGE_KEY,
      JSON.stringify({
        nombreFiltroInput,
        estadoFiltroInput,
        nombreFiltro,
        estadoFiltro,
        paginaActual,
        pageSize,
      }),
    );
  }, [
    nombreFiltroInput,
    estadoFiltroInput,
    nombreFiltro,
    estadoFiltro,
    paginaActual,
    pageSize,
  ]);

  // Deja la marca de "un solo uso" antes de ir a crear/editar un tipo de
  // documento, para que al volver el mount effect sepa que sí debe
  // restaurar el filtro/página guardados (ver RETURN_MARKER_KEY).
  const irA = (path: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RETURN_MARKER_KEY, "1");
    }
    router.push(path);
  };

  const handleBuscar = () => {
    setNombreFiltro(nombreFiltroInput.trim().toLowerCase());
    setEstadoFiltro(estadoFiltroInput);
    setPaginaActual(1);
  };

  const handleLimpiar = () => {
    setNombreFiltroInput("");
    setEstadoFiltroInput("todos");
    setNombreFiltro("");
    setEstadoFiltro("todos");
    setPaginaActual(1);
  };

  const cambiarPageSize = (size: number) => {
    setPageSize(size);
    setPaginaActual(1);
  };

  // Pool crudo de sugerencias — combina ambas columnas que también
  // consulta el filtro real (matchNombre).
  const nombreFiltroSugerencias = useMemo(
    () => items.flatMap((item) => [item.nombre ?? "", item.descripcion ?? ""]),
    [items],
  );

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

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const documentosPagina = documentosFiltrados.slice(indiceInicio, indiceFin);

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
              onClick={() => irA("/parametrizacion/documentos/nuevo")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SuggestField
              label="Nombre del documento"
              className="lg:col-span-2"
              placeholder="Buscar por nombre..."
              value={nombreFiltroInput}
              onChange={setNombreFiltroInput}
              suggestions={nombreFiltroSugerencias}
              onEnter={handleBuscar}
            />

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
              <>
                <DocumentosTable
                  items={documentosPagina}
                  onEdit={(item) =>
                    irA(
                      `/parametrizacion/documentos/${item.tipoDocumentoId}/editar`,
                    )
                  }
                  onReload={cargarDatos}
                />
                <TablePagination
                  page={paginaActual}
                  pageSize={pageSize}
                  totalItems={documentosFiltrados.length}
                  onPageChange={setPaginaActual}
                  onPageSizeChange={cambiarPageSize}
                />
              </>
            )}
          </div>
      </div>
    </div>
  );
}
