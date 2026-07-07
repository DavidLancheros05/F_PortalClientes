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
  Copy,
  FileText,
} from "lucide-react";
import {
  cartaPdfVinculacionService,
  CartaPdfVinculacion,
} from "@/services/admin/parametrizacion/carta-pdf-vinculacion.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";

const PLACEHOLDERS = [
  { variable: "{{cliente_nombre}}", descripcion: "Nombre del cliente" },
  { variable: "{{cupo_aprobado}}", descripcion: "Monto del cupo aprobado" },
  { variable: "{{forma_pago}}", descripcion: "Forma de pago" },
  { variable: "{{plazo}}", descripcion: "Plazo de pago" },
  { variable: "{{fecha_aprobacion}}", descripcion: "Fecha de aprobación" },
  { variable: "{{numero_solicitud}}", descripcion: "Número de solicitud" },
  { variable: "{{tasa_interes}}", descripcion: "Tasa de interés" },
];

export default function CartaPdfVinculacionPage() {
  const [plantillas, setPlantillas] = useState<CartaPdfVinculacion[]>([]);
  const [plantillasFiltradas, setPlantillasFiltradas] = useState<CartaPdfVinculacion[]>([]);
  const [nombre, setNombre] = useState("");
  const [contenido, setContenido] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVO" | "INACTIVO">("TODOS");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [editandoContenido, setEditandoContenido] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'error' | 'success' | 'confirm';
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  const cargarPlantillas = async () => {
    setLoading(true);
    try {
      const data = await cartaPdfVinculacionService.getAll();
      setPlantillas(data);
      setPlantillasFiltradas(data);
    } catch (error) {
      console.error(error);
      setPlantillas([]);
      setPlantillasFiltradas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const crearPlantilla = async () => {
    if (!nombre.trim() || !contenido.trim()) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Campos incompletos',
        message: 'Por favor ingresa nombre y contenido para la plantilla',
      });
      return;
    }

    setSubmitting(true);
    try {
      await cartaPdfVinculacionService.create({
        nombre: nombre.trim(),
        contenido: contenido.trim(),
      });
      setNombre("");
      setContenido("");
      setMostrarNuevo(false);
      await cargarPlantillas();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Plantilla creada',
        message: 'La plantilla ha sido creada exitosamente',
      });
    } catch (error) {
      console.error(error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al crear la plantilla. Por favor, intenta nuevamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (plantilla: CartaPdfVinculacion) => {
    setEditandoId(plantilla.cpv_id);
    setEditandoNombre(plantilla.cpv_nombre);
    setEditandoContenido(plantilla.cpv_contenido);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre("");
    setEditandoContenido("");
  };

  const guardarEdicion = async (id: number) => {
    if (!editandoNombre.trim() || !editandoContenido.trim()) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Campos incompletos',
        message: 'El nombre y contenido no pueden estar vacíos',
      });
      return;
    }

    try {
      await cartaPdfVinculacionService.update(id, {
        nombre: editandoNombre.trim(),
        contenido: editandoContenido.trim(),
      });
      setEditandoId(null);
      setEditandoNombre("");
      setEditandoContenido("");
      await cargarPlantillas();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Plantilla actualizada',
        message: 'La plantilla ha sido actualizada exitosamente',
      });
    } catch (error) {
      console.error(error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al actualizar la plantilla. Por favor, intenta nuevamente.',
      });
    }
  };

  const toggleActivo = (plantilla: CartaPdfVinculacion) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: plantilla.cpv_activo ? 'Inactivar plantilla' : 'Activar plantilla',
      message: `¿Estás seguro de ${plantilla.cpv_activo ? "inactivar" : "activar"} esta plantilla?`,
      isDangerous: plantilla.cpv_activo,
      confirmText: plantilla.cpv_activo ? 'Inactivar' : 'Activar',
      action: async () => {
        try {
          await cartaPdfVinculacionService.toggleActivo(plantilla.cpv_id, !plantilla.cpv_activo);
          await cargarPlantillas();
          setModalState({
            isOpen: true,
            type: 'success',
            title: 'Operación exitosa',
            message: `La plantilla ha sido ${plantilla.cpv_activo ? 'inactivada' : 'activada'} correctamente`,
          });
        } catch (error) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Error al cambiar el estado de la plantilla.',
          });
        }
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && e.ctrlKey && !submitting) {
      action();
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setContenido("");
  };

  const insertarPlaceholder = (variable: string) => {
    const textarea = document.getElementById("contenido-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart || contenido.length;
    const end = textarea.selectionEnd || contenido.length;
    const nuevoContenido =
      contenido.substring(0, start) + variable + contenido.substring(end);
    setContenido(nuevoContenido);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  const insertarPlaceholderEdicion = (variable: string) => {
    const textarea = document.getElementById("contenido-edicion-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart || editandoContenido.length;
    const end = textarea.selectionEnd || editandoContenido.length;
    const nuevoContenido =
      editandoContenido.substring(0, start) + variable + editandoContenido.substring(end);
    setEditandoContenido(nuevoContenido);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  };

  const aplicarFiltros = (sourcePlantillas: CartaPdfVinculacion[] = plantillas) => {
    const texto = filtroTexto.trim().toLowerCase();

    const resultado = sourcePlantillas.filter((plantilla) => {
      const textoOk =
        texto === "" || plantilla.cpv_nombre.toLowerCase().includes(texto);
      const estadoOk =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVO" ? plantilla.cpv_activo : !plantilla.cpv_activo);

      return textoOk && estadoOk;
    });

    setPlantillasFiltradas(resultado);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFiltroEstado("TODOS");
    setPlantillasFiltradas(plantillas);
  };

  const total = plantillas.length;
  const activos = plantillas.filter((p) => p.cpv_activo).length;
  const inactivos = total - activos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <p className="text-2xl md:text-3xl font-bold text-blue-800">
                    Plantillas de Carta PDF
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarNuevo(true);
                    limpiarFormulario();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nueva plantilla
                </button>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Vinculación Comercial
              </h1>
              <p className="text-gray-600 mt-1">
                Crea y gestiona las plantillas de cartas PDF para enviar a los clientes
              </p>
            </div>
          </div>

          {mostrarNuevo && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Crear nueva plantilla
                </h2>
                <p className="text-sm text-gray-600">
                  Ingresa el nombre y contenido de la plantilla. Usa los placeholders disponibles.
                </p>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre de la plantilla
                  </label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Carta de Vinculación - 2024"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Contenido de la plantilla
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {PLACEHOLDERS.map((ph) => (
                        <button
                          key={ph.variable}
                          type="button"
                          onClick={() => insertarPlaceholder(ph.variable)}
                          title={ph.descripcion}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          {ph.variable}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    id="contenido-textarea"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Escape") setMostrarNuevo(false);
                    }}
                    placeholder="Escribe la plantilla aquí. Usa {{variable}} para los placeholders dinámicos..."
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono min-h-[300px]"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona Ctrl+Enter o el botón Crear para guardar
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      limpiarFormulario();
                      setMostrarNuevo(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={crearPlantilla}
                    disabled={!nombre.trim() || !contenido.trim() || submitting}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      !nombre.trim() || !contenido.trim() || submitting
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    {submitting ? "Creando..." : "Crear plantilla"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar por nombre
                  </label>
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    placeholder="Ej: vinculación 2024"
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
                        e.target.value as "TODOS" | "ACTIVO" | "INACTIVO"
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
                    Plantillas registradas
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {total} plantilla{total !== 1 ? "s" : ""} en el sistema
                  </p>
                </div>
                <button
                  onClick={cargarPlantillas}
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
                  <p className="text-gray-600">Cargando plantillas...</p>
                </div>
              ) : plantillasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay plantillas disponibles
                  </h3>
                  <p className="text-gray-500">
                    Crea una nueva plantilla para comenzar
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gradient-to-r from-indigo-100 via-blue-100 to-cyan-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Nombre
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
                    {plantillasFiltradas.map((plantilla) => (
                      <tr
                        key={plantilla.cpv_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {editandoId === plantilla.cpv_id ? (
                            <input
                              type="text"
                              value={editandoNombre}
                              onChange={(e) => setEditandoNombre(e.target.value)}
                              className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {plantilla.cpv_nombre}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {plantilla.cpv_contenido.substring(0, 80)}
                                {plantilla.cpv_contenido.length > 80 ? "..." : ""}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              plantilla.cpv_activo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {plantilla.cpv_activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right text-sm">
                          {editandoId === plantilla.cpv_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => guardarEdicion(plantilla.cpv_id)}
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
                                onClick={() => {
                                  setPreviewId(plantilla.cpv_id);
                                  setMostrarPreview(true);
                                }}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                                title="Ver contenido"
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                Vista previa
                              </button>
                              <button
                                onClick={() => iniciarEdicion(plantilla)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleActivo(plantilla)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                {plantilla.cpv_activo ? "Inactivar" : "Activar"}
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

      {/* Modal de vista previa */}
      {mostrarPreview && previewId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Vista previa</h2>
              <button
                onClick={() => {
                  setMostrarPreview(false);
                  setPreviewId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {plantillas.find((p) => p.cpv_id === previewId) && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {plantillas.find((p) => p.cpv_id === previewId)?.cpv_nombre}
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm whitespace-pre-wrap text-gray-700">
                    {plantillas.find((p) => p.cpv_id === previewId)?.cpv_contenido}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición completa */}
      {editandoId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Editar plantilla</h2>
              <button
                onClick={cancelarEdicion}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editandoNombre}
                  onChange={(e) => setEditandoNombre(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contenido
                  </label>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph.variable}
                        type="button"
                        onClick={() => insertarPlaceholderEdicion(ph.variable)}
                        title={ph.descripcion}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                      >
                        {ph.variable}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="contenido-edicion-textarea"
                  value={editandoContenido}
                  onChange={(e) => setEditandoContenido(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono min-h-[400px]"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelarEdicion}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button
                  onClick={() => guardarEdicion(editandoId)}
                  disabled={!editandoNombre.trim() || !editandoContenido.trim()}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    !editandoNombre.trim() || !editandoContenido.trim()
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalState.type === 'error' && (
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

      {modalState.type === 'success' && (
        <SuccessModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          actionText="Aceptar"
          onAction={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === 'confirm' && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText || 'Confirmar'}
          isDangerous={modalState.isDangerous}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
            setModalState({ ...modalState, isOpen: false });
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
