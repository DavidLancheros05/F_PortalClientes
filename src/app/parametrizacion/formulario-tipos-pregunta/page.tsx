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
} from "lucide-react";
import {
  formularioTiposPreguntaService,
  TipoPregunta,
} from "@/services/parametrizacion/formulario-tipos-pregunta.service";
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
import { ListTree } from "lucide-react";

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

  const cargarTipos = async () => {
    setLoading(true);
    try {
      const data = await formularioTiposPreguntaService.getAll(true);
      setItems(data);
      // Si ya se había hecho una búsqueda, reaplicarla contra los datos
      // frescos — si no, cada recarga (crear/editar/activar-inactivar)
      // pisaba el filtro aplicado. Si todavía no se ha buscado, la tabla
      // sigue oculta hasta que el usuario dé clic en "Buscar".
      if (hasSearched) {
        aplicarFiltros(data);
      }
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

  // Pool crudo de sugerencias — combina ambas columnas que también
  // consulta el filtro real (textoOk).
  const filtroTextoSugerencias = useMemo(
    () =>
      items.flatMap((item) => [
        item.fti_codigo ?? "",
        item.fti_descripcion ?? "",
      ]),
    [items],
  );

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
    setHasSearched(true);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setItemsFiltrados([]);
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
    setNuevoCodigo("");
    setNuevaDescripcion("");
  };

  const crearTipo = () => {
    if (!nuevoCodigo.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "El código es obligatorio",
      });
      return;
    }

    if (!nuevaDescripcion.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "La descripción es obligatoria",
      });
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar creación",
      message: `¿Deseas agregar el tipo de pregunta ${nuevoCodigo.trim().toUpperCase()}?`,
      confirmText: "Sí, agregar",
      action: async () => {
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
          setModalState({
            isOpen: true,
            type: "success",
            title: "Tipo creado",
            message: "El tipo de pregunta ha sido creado exitosamente",
          });
        } catch (error: any) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.message || "Error al crear el tipo de pregunta",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
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

  const guardarEdicion = (item: TipoPregunta) => {
    if (!editandoCodigo.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "El código es obligatorio",
      });
      return;
    }

    if (!editandoDescripcion.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "La descripción es obligatoria",
      });
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar cambios",
      message: `¿Deseas guardar los cambios del tipo ${editandoCodigo.trim().toUpperCase()}?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await formularioTiposPreguntaService.update(item.fti_id, {
            fti_codigo: editandoCodigo.trim().toUpperCase(),
            fti_descripcion: editandoDescripcion.trim(),
            fti_estado: item.fti_estado,
          });

          cancelarEdicion();
          await cargarTipos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Tipo actualizado",
            message: "El tipo de pregunta ha sido actualizado exitosamente",
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

  const toggleEstado = (item: TipoPregunta) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: item.fti_estado ? "Inactivar tipo" : "Activar tipo",
      message: `¿Deseas ${item.fti_estado ? "inactivar" : "activar"} este tipo de pregunta?`,
      isDangerous: item.fti_estado,
      confirmText: item.fti_estado ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await formularioTiposPreguntaService.updateStatus(
            item.fti_id,
            !item.fti_estado,
          );

          await cargarTipos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `El tipo de pregunta ha sido ${item.fti_estado ? "inactivado" : "activado"}`,
          });
        } catch (error: any) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.message || "Error al cambiar estado",
          });
        }
      },
    });
  };

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const itemsPagina = itemsFiltrados.slice(indiceInicio, indiceFin);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8 ${
        !hasSearched && !loading ? "flex items-center justify-center" : ""
      }`}
    >
      <div className="max-w-7xl w-full mx-auto">
        <PageHeaderCard
          icon={ListTree}
          eyebrow="Parametrización"
          title="Tipos de pregunta"
          subtitle="Administra los tipos disponibles para configurar preguntas del formulario."
          actions={
            <button
              onClick={() => {
                setMostrarNuevo(true);
                limpiarFormulario();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SuggestField
              label="Buscar por código o descripción"
              className="md:col-span-2"
              placeholder="Ej: texto, selección"
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
                onClick={cargarTipos}
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
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : !hasSearched ? null : itemsFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay resultados para los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">{itemsFiltrados.length}</span>{" "}
                tipo{itemsFiltrados.length !== 1 ? "s" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Código</Th>
                      <Th>Descripción</Th>
                      <Th>Estado</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsPagina.map((item) => (
                      <Tr key={item.fti_id}>
                        <Td>
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
                        </Td>

                        <Td>
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
                        </Td>

                        <Td>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              item.fti_estado
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.fti_estado ? "Activo" : "Inactivo"}
                          </span>
                        </Td>

                        <Td sticky align="right">
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
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
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
              totalItems={itemsFiltrados.length}
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
