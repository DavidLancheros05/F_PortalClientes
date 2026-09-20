"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Power,
  Save,
  X,
  Inbox,
  Layers,
} from "lucide-react";
import {
  formularioSeccionesService,
  type FormularioSeccion,
} from "@/services/parametrizacion/formulario-secciones.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";

export default function FormularioSeccionesPage() {
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [seccionesFiltradas, setSeccionesFiltradas] = useState<
    FormularioSeccion[]
  >([]);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoOrden, setNuevoOrden] = useState<number>(1);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    "TODOS" | "ACTIVO" | "INACTIVO"
  >("TODOS");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [editandoDescripcion, setEditandoDescripcion] = useState("");
  const [editandoOrden, setEditandoOrden] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const data = await formularioSeccionesService.getAll();
      setSecciones(data);
      // Si ya se había hecho una búsqueda, reaplicarla contra los datos
      // frescos — si no, cada recarga (crear/editar/activar-inactivar)
      // pisaba el filtro aplicado. Si todavía no se ha buscado, la tabla
      // sigue oculta hasta que el usuario dé clic en "Buscar".
      if (hasSearched) {
        aplicarFiltros(data);
      }
    } catch (error) {
      console.error(error);
      setSecciones([]);
      setSeccionesFiltradas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Pool crudo de sugerencias — combina ambas columnas que también
  // consulta el filtro real (textoOk).
  const filtroTextoSugerencias = useMemo(
    () =>
      secciones.flatMap((seccion) => [
        seccion.fs_nombre ?? "",
        seccion.fs_descripcion ?? "",
      ]),
    [secciones],
  );

  const aplicarFiltros = (sourceSecciones: FormularioSeccion[] = secciones) => {
    const texto = filtroTexto.trim().toLowerCase();

    const resultado = sourceSecciones.filter((seccion) => {
      const textoOk =
        texto === "" ||
        seccion.fs_nombre.toLowerCase().includes(texto) ||
        (seccion.fs_descripcion || "").toLowerCase().includes(texto);

      const estadoOk =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVO" ? seccion.fs_activo : !seccion.fs_activo);

      return textoOk && estadoOk;
    });

    setSeccionesFiltradas(resultado);
    setHasSearched(true);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setSeccionesFiltradas([]);
    setHasSearched(false);
    setPaginaActual(1);
  };

  const irAPagina = (page: number) => {
    setPaginaActual(page);
  };

  const cambiarPageSize = (size: number) => {
    setPageSize(size);
    irAPagina(1);
  };

  const limpiarFormulario = () => {
    setNuevoNombre("");
    setNuevaDescripcion("");
    setNuevoOrden(1);
  };

  const crear = () => {
    if (!nuevoNombre.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "El nombre es obligatorio",
      });
      return;
    }

    if (!nuevoOrden || nuevoOrden <= 0) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "El orden debe ser mayor a 0",
      });
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar creación",
      message: `¿Deseas agregar la sección "${nuevoNombre.trim()}"?`,
      confirmText: "Sí, agregar",
      action: async () => {
        setSubmitting(true);
        try {
          await formularioSeccionesService.create({
            seccion_nombre: nuevoNombre.trim(),
            seccion_descripcion: nuevaDescripcion.trim() || undefined,
            seccion_orden: nuevoOrden,
          });

          setMostrarNuevo(false);
          limpiarFormulario();
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Sección creada",
            message: "La sección ha sido creada exitosamente",
          });
        } catch (error: any) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.message || "Error al crear la sección",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const iniciarEdicion = (seccion: FormularioSeccion) => {
    setEditandoId(seccion.fs_id);
    setEditandoNombre(seccion.fs_nombre);
    setEditandoDescripcion(seccion.fs_descripcion || "");
    setEditandoOrden(seccion.fs_orden);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre("");
    setEditandoDescripcion("");
    setEditandoOrden(1);
  };

  const guardarEdicion = () => {
    if (!editandoId || !editandoNombre.trim() || editandoOrden <= 0) return;

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar cambios",
      message: `¿Deseas guardar los cambios de la sección "${editandoNombre.trim()}"?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await formularioSeccionesService.update(editandoId, {
            seccion_nombre: editandoNombre.trim(),
            seccion_descripcion: editandoDescripcion.trim() || "",
            seccion_orden: editandoOrden,
          });

          cancelarEdicion();
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Sección actualizada",
            message: "La sección ha sido actualizada exitosamente",
          });
        } catch (error: any) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.message || "Error al actualizar",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const toggleEstado = (seccion: FormularioSeccion) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: seccion.fs_activo ? "Inactivar sección" : "Activar sección",
      message: `¿Deseas ${seccion.fs_activo ? "inactivar" : "activar"} esta sección?`,
      isDangerous: seccion.fs_activo,
      confirmText: seccion.fs_activo ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await formularioSeccionesService.toggleEstado(
            seccion.fs_id,
            !seccion.fs_activo,
          );
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `La sección ha sido ${seccion.fs_activo ? "inactivada" : "activada"}`,
          });
        } catch (error: any) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.message || "Error al actualizar estado",
          });
        }
      },
    });
  };

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const seccionesPagina = seccionesFiltradas.slice(indiceInicio, indiceFin);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8 ${
        !hasSearched && !loading ? "flex items-center justify-center" : ""
      }`}
    >
      <div className="max-w-7xl w-full mx-auto">
        <PageHeaderCard
          icon={Layers}
          eyebrow="Parametrización"
          title="Secciones del formulario"
          subtitle="Administra las secciones disponibles para agrupar preguntas."
          actions={
            <button
              onClick={() => {
                setMostrarNuevo(true);
                limpiarFormulario();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nueva
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SuggestField
              label="Buscar por nombre o descripción"
              className="md:col-span-2"
              placeholder="Ej: datos de identificación"
              value={filtroTexto}
              onChange={setFiltroTexto}
              suggestions={filtroTextoSugerencias}
              onEnter={() => aplicarFiltros()}
            />

            <FilterField label="Estado">
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
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={() => aplicarFiltros()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <button
                onClick={cargarDatos}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {mostrarNuevo && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Agregar sección
              </h2>
              <p className="text-sm text-gray-600">
                Define nombre, orden y descripción de la nueva sección
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  value={nuevoNombre}
                  onChange={(event) => setNuevoNombre(event.target.value)}
                  placeholder="Ej: Datos de identificación"
                  className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  disabled={submitting}
                />
                <input
                  type="number"
                  min={1}
                  value={nuevoOrden}
                  onChange={(event) =>
                    setNuevoOrden(Number(event.target.value))
                  }
                  placeholder="Orden"
                  className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={crear}
                    disabled={submitting}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      submitting
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-brand-600 hover:bg-brand-700 text-white"
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                    Cerrar
                  </button>
                </div>

                <textarea
                  value={nuevaDescripcion}
                  onChange={(event) =>
                    setNuevaDescripcion(event.target.value)
                  }
                  placeholder="Descripción (opcional)"
                  className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-4"
                  rows={2}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : !hasSearched ? null : seccionesFiltradas.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay resultados para los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">
                  {seccionesFiltradas.length}
                </span>{" "}
                sección{seccionesFiltradas.length !== 1 ? "es" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th align="center">Orden</Th>
                      <Th>Nombre</Th>
                      <Th>Descripción</Th>
                      <Th align="center">Estado</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {seccionesPagina.map((seccion) => (
                      <Tr key={seccion.fs_id}>
                        <Td align="center">
                          {editandoId === seccion.fs_id ? (
                            <input
                              type="number"
                              min={1}
                              value={editandoOrden}
                              onChange={(event) =>
                                setEditandoOrden(Number(event.target.value))
                              }
                              className="w-20 border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            seccion.fs_orden
                          )}
                        </Td>

                        <Td>
                          {editandoId === seccion.fs_id ? (
                            <input
                              value={editandoNombre}
                              onChange={(event) =>
                                setEditandoNombre(event.target.value)
                              }
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            seccion.fs_nombre
                          )}
                        </Td>

                        <Td>
                          {editandoId === seccion.fs_id ? (
                            <textarea
                              value={editandoDescripcion}
                              onChange={(event) =>
                                setEditandoDescripcion(event.target.value)
                              }
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                          ) : (
                            seccion.fs_descripcion || "—"
                          )}
                        </Td>

                        <Td align="center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              seccion.fs_activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {seccion.fs_activo ? "Activo" : "Inactivo"}
                          </span>
                        </Td>

                        <Td sticky align="right">
                          {editandoId === seccion.fs_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={guardarEdicion}
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
                                onClick={() => iniciarEdicion(seccion)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleEstado(seccion)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                {seccion.fs_activo ? "Inactivar" : "Activar"}
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
              totalItems={seccionesFiltradas.length}
              onPageChange={irAPagina}
              onPageSizeChange={cambiarPageSize}
            />
          </div>
        )}
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
          isLoading={submitting}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
