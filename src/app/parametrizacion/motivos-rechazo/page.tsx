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
  motivosRechazoService,
  MotivoRechazo,
} from "@/services/admin/parametrizacion/motivos-rechazo.service";
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
import { Ban } from "lucide-react";

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

  const cargarMotivos = async () => {
    setLoading(true);
    try {
      const data = await motivosRechazoService.getAll();
      setMotivos(data);
      // Si ya se había hecho una búsqueda, reaplicarla contra los datos
      // frescos — si no, cada recarga (crear/editar/activar-inactivar)
      // pisaba el filtro aplicado y volvía a mostrar la lista completa
      // aunque el selector de Estado siguiera mostrando "Activos"/"Inactivos".
      // Si todavía no se ha buscado, la tabla sigue oculta (no se toca
      // motivosFiltrados) hasta que el usuario dé clic en "Buscar".
      if (hasSearched) {
        aplicarFiltros(data);
      }
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

  const crearMotivo = () => {
    if (!descripcion.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "Por favor ingresa una descripción para el motivo",
      });
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar creación",
      message: `¿Deseas agregar el motivo "${descripcion.trim()}"?`,
      confirmText: "Sí, agregar",
      action: async () => {
        setSubmitting(true);
        try {
          await motivosRechazoService.create(descripcion);
          setDescripcion("");
          setMostrarNuevo(false);
          await cargarMotivos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Motivo creado",
            message: "El motivo ha sido creado exitosamente",
          });
        } catch (error) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al crear el motivo. Por favor, intenta nuevamente.",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const iniciarEdicion = (motivo: MotivoRechazo) => {
    setEditandoId(motivo.id);
    setEditandoDescripcion(motivo.descripcion);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoDescripcion("");
  };

  const guardarEdicion = (id: number) => {
    if (!editandoDescripcion.trim()) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Campos incompletos",
        message: "La descripción no puede estar vacía",
      });
      return;
    }

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar cambios",
      message: `¿Deseas guardar el motivo como "${editandoDescripcion.trim()}"?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await motivosRechazoService.update(id, editandoDescripcion);
          setEditandoId(null);
          setEditandoDescripcion("");
          await cargarMotivos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Motivo actualizado",
            message: "El motivo ha sido actualizado exitosamente",
          });
        } catch (error) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al actualizar el motivo. Por favor, intenta nuevamente.",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const toggleActivo = (motivo: MotivoRechazo) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: motivo.activo ? "Inactivar motivo" : "Activar motivo",
      message: `¿Estás seguro de ${motivo.activo ? "inactivar" : "activar"} este motivo?`,
      isDangerous: motivo.activo,
      confirmText: motivo.activo ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await motivosRechazoService.toggleActivo(motivo.id, !motivo.activo);
          await cargarMotivos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `El motivo ha sido ${motivo.activo ? "inactivado" : "activado"}`,
          });
        } catch (error) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al cambiar el estado del motivo.",
          });
        }
      },
    });
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

  // Pool crudo de sugerencias — misma columna que consulta el filtro real.
  const filtroTextoSugerencias = useMemo(
    () => motivos.map((m) => m.descripcion ?? ""),
    [motivos],
  );

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
    setHasSearched(true);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setMotivosFiltrados([]);
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

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const motivosPagina = motivosFiltrados.slice(indiceInicio, indiceFin);

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8 ${
        !hasSearched && !loading ? "flex items-center justify-center" : ""
      }`}
    >
      <div className="max-w-7xl w-full mx-auto">
        <PageHeaderCard
          icon={Ban}
          eyebrow="Parametrización"
          title="Motivos de rechazo"
          subtitle="Administra los motivos disponibles para rechazar solicitudes"
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
              label="Buscar por descripción"
              className="md:col-span-2"
              placeholder="Ej: documentación incompleta"
              value={filtroTexto}
              onChange={setFiltroTexto}
              suggestions={filtroTextoSugerencias}
              onEnter={() => aplicarFiltros()}
            />

            <FilterField label="Estado">
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
                onClick={cargarMotivos}
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
                        : "bg-brand-600 hover:bg-brand-700 text-white"
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
        ) : !hasSearched ? null : motivosFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay resultados para los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">{motivosFiltrados.length}</span>{" "}
                motivo{motivosFiltrados.length !== 1 ? "s" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Descripción</Th>
                      <Th>Estado</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {motivosPagina.map((m) => (
                      <Tr key={m.id}>
                        <Td>
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
                        </Td>

                        <Td>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              m.activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {m.activo ? "Activo" : "Inactivo"}
                          </span>
                        </Td>

                        <Td sticky align="right">
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
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
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
              totalItems={motivosFiltrados.length}
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
