"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  notificacionesService,
  PlantillaNotificacion,
} from "@/services/admin/parametrizacion/notificaciones.service";
import { EmailPreview } from "@/components/EmailPreview";
import { HtmlBodyEditor, type HtmlBodyEditorHandle } from "@/components/HtmlBodyEditor";
import { ConfirmModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import {
  Save,
  Mail,
  Code,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Bell,
  Eye,
  EyeOff,
  Plus,
  X,
  Braces,
} from "lucide-react";

type FormState = {
  codigo_evento: string;
  nombre: string;
  asunto: string;
  cuerpo_html: string;
  destinatarios_to: string;
  destinatarios_cc: string;
  activa: boolean;
};

// Variables reales que cada evento le pasa a renderTemplate() en el backend
// (B_PortalClientes/src/notificaciones/notificaciones.service.ts) — no hay
// forma de listarlas dinámicamente (están hardcodeadas por evento en cada
// método `notificar*`), así que este mapa se mantiene a mano. Si se agrega
// una variable nueva en el backend para un evento, hay que agregarla acá
// también o el admin no la va a poder insertar desde la UI.
//
// SOLICITUD_ESTADO_CLIENTE y CARTA_VINCULACION_APROBADA_CLIENTE no están
// acá a propósito: son plantillas semilla que ningún código del backend
// llega a enviar hoy (huérfanas) — no tiene caso ofrecer variables para
// ellas.
const VARIABLES_POR_EVENTO: Record<string, string[]> = {
  SOLICITUD_REGISTRADA_CLIENTE: [
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "fecha_creacion",
    "mensaje_cambios",
    "portal_url",
  ],
  SOLICITUD_REGISTRADA_EJECUTIVO: [
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "fecha_creacion",
    "ejecutivo_nombre",
    "portal_url",
  ],
  SOLICITUD_RECHAZADA_GESTION_EJECUTIVO: [
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "ejecutivo_nombre",
    "etapa_rechazo",
    "motivo_rechazo",
    "comentario",
    "portal_url",
  ],
  SOLICITUD_RECHAZADA_CLIENTE: [
    "numero_solicitud",
    "cliente_nombre",
    "motivo_rechazo",
    "documentos_html",
    "portal_url",
  ],
  SOLICITUD_RECHAZADA_DEFINITIVA_CLIENTE: [
    "numero_solicitud",
    "cliente_nombre",
    "motivo_rechazo",
    "portal_url",
  ],
  DOCUMENTOS_VENCIDOS_SEMANAL: [
    "fecha_reporte",
    "total_vencidos",
    "total_por_vencer",
    "tabla_resumen",
  ],
  CONDICIONES_FINANCIERAS_CLIENTE: [
    "numero_solicitud",
    "cliente_nombre",
    "cupo_aprobado",
    "plazo_pago",
    "forma_pago",
    "portal_url",
  ],
  USUARIO_CREADO_CREDENCIALES: [
    "usuario_nombre",
    "usuario_login",
    "usuario_email",
    "usuario_password",
    "portal_url",
  ],
  SOLICITUD_PENDIENTE_ASC: [
    "usuario_nombre",
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "portal_url",
  ],
  SOLICITUD_PENDIENTE_OC: [
    "usuario_nombre",
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "portal_url",
  ],
  SOLICITUD_PENDIENTE_CC1: [
    "usuario_nombre",
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "portal_url",
  ],
  SOLICITUD_PENDIENTE_CC2: [
    "usuario_nombre",
    "numero_solicitud",
    "cliente_nombre",
    "centro_operacion_nombre",
    "portal_url",
  ],
  RESET_PASSWORD: ["nombre", "reset_url"],
};

function VariablesDisponibles({
  codigoEvento,
  onInsert,
}: {
  codigoEvento: string;
  onInsert: (variable: string) => void;
}) {
  const variables = VARIABLES_POR_EVENTO[codigoEvento];

  if (!variables) {
    return (
      <p className="text-xs text-gray-500">
        Este código de evento no tiene variables registradas (puede ser un
        evento que el sistema todavía no envía). Puedes seguir usando{" "}
        <code className="font-mono">{"{{variable}}"}</code> a mano si sabes
        cuál necesitas.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <Braces className="h-3.5 w-3.5" />
        Variables disponibles — clic para insertar en el campo con foco
        (Asunto o Cuerpo):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <button
            key={variable}
            type="button"
            onClick={() => onInsert(variable)}
            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-xs text-blue-700 transition-colors hover:bg-blue-100"
          >
            {`{{${variable}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildForm(item: PlantillaNotificacion): FormState {
  return {
    codigo_evento: item.codigo_evento,
    nombre: item.nombre || "",
    asunto: item.asunto || "",
    cuerpo_html: item.cuerpo_html || "",
    destinatarios_to: item.destinatarios_to || "",
    destinatarios_cc: item.destinatarios_cc || "",
    activa: Boolean(item.activa),
  };
}

export default function NotificacionesParametrizacionPage() {
  const [items, setItems] = useState<PlantillaNotificacion[]>([]);
  const [selectedCodigo, setSelectedCodigo] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [newPlantilla, setNewPlantilla] = useState({
    codigo_evento: "",
    nombre: "",
    asunto: "",
    cuerpo_html: "",
    destinatarios_to: "",
    destinatarios_cc: "",
    activa: true,
  });

  const selectedItem = useMemo(
    () => items.find((item) => item.codigo_evento === selectedCodigo) || null,
    [items, selectedCodigo],
  );

  // Recuerda cuál de los dos campos tuvo el foco por última vez en cada
  // formulario (edición vs. modal "Nueva plantilla" — son dos formularios
  // independientes, cada uno con su propio par Asunto/Cuerpo), para que el
  // panel de "Variables disponibles" sepa dónde insertar el clic. Asunto es
  // un <input> normal, Cuerpo es el editor WYSIWYG (ver
  // HtmlBodyEditor::insertText).
  const [campoActivoEdit, setCampoActivoEdit] = useState<"asunto" | "cuerpo">("cuerpo");
  const asuntoInputRef = useRef<HTMLInputElement>(null);
  const cuerpoEditorRef = useRef<HtmlBodyEditorHandle>(null);

  const [campoActivoCrear, setCampoActivoCrear] = useState<"asunto" | "cuerpo">("cuerpo");
  const nuevaAsuntoInputRef = useRef<HTMLInputElement>(null);
  const nuevaCuerpoEditorRef = useRef<HtmlBodyEditorHandle>(null);

  const insertarVariableEnAsunto = (
    variable: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    setValue: (updater: (asuntoActual: string) => string) => void,
  ) => {
    const texto = `{{${variable}}}`;
    const input = inputRef.current;
    if (!input) {
      setValue((actual) => actual + texto);
      return;
    }
    const inicio = input.selectionStart ?? input.value.length;
    const fin = input.selectionEnd ?? input.value.length;
    setValue((actual) => actual.slice(0, inicio) + texto + actual.slice(fin));
    requestAnimationFrame(() => {
      input.focus();
      const nuevaPosicion = inicio + texto.length;
      input.setSelectionRange(nuevaPosicion, nuevaPosicion);
    });
  };

  const insertarVariable = (variable: string) => {
    if (campoActivoEdit === "asunto") {
      insertarVariableEnAsunto(variable, asuntoInputRef, (updater) =>
        setForm((prev) => (prev ? { ...prev, asunto: updater(prev.asunto) } : prev)),
      );
    } else {
      cuerpoEditorRef.current?.insertText(`{{${variable}}}`);
    }
  };

  const insertarVariableEnCrear = (variable: string) => {
    if (campoActivoCrear === "asunto") {
      insertarVariableEnAsunto(variable, nuevaAsuntoInputRef, (updater) =>
        setNewPlantilla((prev) => ({ ...prev, asunto: updater(prev.asunto) })),
      );
    } else {
      nuevaCuerpoEditorRef.current?.insertText(`{{${variable}}}`);
    }
  };

  const cargarPlantillas = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await notificacionesService.getAll();
      setItems(data);

      const initialCode =
        selectedCodigo && data.some((d) => d.codigo_evento === selectedCodigo)
          ? selectedCodigo
          : data[0]?.codigo_evento || "";

      setSelectedCodigo(initialCode);
      const selected = data.find((d) => d.codigo_evento === initialCode);
      setForm(selected ? buildForm(selected) : null);
    } catch (err: any) {
      setItems([]);
      setForm(null);
      setError(err?.message || "Error cargando plantillas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setForm(null);
      return;
    }
    setForm(buildForm(selectedItem));
    setPreviewMode(false);
  }, [selectedItem]);

  const guardarCambios = () => {
    if (!form || !form.codigo_evento) return;
    setShowConfirmEdit(true);
  };

  const confirmarGuardarCambios = async () => {
    if (!form || !form.codigo_evento) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await notificacionesService.update(form.codigo_evento, {
        nombre: form.nombre,
        asunto: form.asunto,
        cuerpo_html: form.cuerpo_html,
        destinatarios_to: form.destinatarios_to,
        destinatarios_cc: form.destinatarios_cc,
        activa: form.activa,
      });

      setShowConfirmEdit(false);
      setSuccess("Cambios guardados exitosamente");
      await cargarPlantillas();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setShowConfirmEdit(false);
      setError(err?.message || "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  };

  const crearPlantilla = () => {
    if (!newPlantilla.codigo_evento.trim()) {
      setError("El código del evento es requerido");
      return;
    }
    if (!newPlantilla.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (!newPlantilla.asunto.trim()) {
      setError("El asunto es requerido");
      return;
    }
    if (!newPlantilla.cuerpo_html.trim()) {
      setError("El cuerpo del correo es requerido");
      return;
    }

    setShowConfirmCreate(true);
  };

  const confirmarCrearPlantilla = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await notificacionesService.create(newPlantilla);
      setShowConfirmCreate(false);
      setSuccess("Plantilla creada exitosamente");
      setShowCreateModal(false);
      setNewPlantilla({
        codigo_evento: "",
        nombre: "",
        asunto: "",
        cuerpo_html: "",
        destinatarios_to: "",
        destinatarios_cc: "",
        activa: true,
      });
      await cargarPlantillas();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setShowConfirmCreate(false);
      setError(err?.message || "Error creando plantilla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeaderCard
          icon={Bell}
          eyebrow="Parametrización"
          title="Plantillas de notificaciones"
          subtitle="Administra asunto, contenido, destinatarios y estado de cada evento"
          actions={
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </button>
          }
        />

        {/* Alertas */}
        {error && (
          <div className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border-l-4 border-green-500 bg-green-50 px-4 py-3 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500">Cargando plantillas...</p>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Mail className="h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No hay plantillas disponibles</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            {/* Sidebar de eventos */}
            <aside className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Eventos disponibles
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {items.length} plantilla{items.length !== 1 ? "s" : ""}{" "}
                  encontrada{items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
                {items.map((item) => {
                  const active = selectedCodigo === item.codigo_evento;
                  return (
                    <button
                      key={item.plantilla_id}
                      type="button"
                      onClick={() => setSelectedCodigo(item.codigo_evento)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group ${
                        active
                          ? "bg-blue-50 border-l-4 border-blue-500 shadow-sm"
                          : "hover:bg-gray-50 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              active ? "text-blue-700" : "text-gray-900"
                            }`}
                          >
                            {item.nombre}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {item.codigo_evento}
                          </p>
                        </div>
                        {item.activa && (
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      {active && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                          <ArrowLeft className="h-3 w-3" />
                          Editando
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Formulario de edición */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {form ? (
                <>
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Editar plantilla
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Modifica los campos según necesites
                        </p>
                      </div>
                      <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {previewMode ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Editar
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Vista previa
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {!previewMode ? (
                      <>
                        {/* Campos del formulario */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Código evento
                            </label>
                            <input
                              value={form.codigo_evento}
                              disabled
                              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-500 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nombre
                            </label>
                            <input
                              value={form.nombre}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? { ...prev, nombre: e.target.value }
                                    : prev,
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="Ej: Bienvenida nuevo usuario"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Asunto
                          </label>
                          <input
                            ref={asuntoInputRef}
                            value={form.asunto}
                            onFocus={() => setCampoActivoEdit("asunto")}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev
                                  ? { ...prev, asunto: e.target.value }
                                  : prev,
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Asunto del correo"
                          />
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                          <VariablesDisponibles
                            codigoEvento={form.codigo_evento}
                            onInsert={insertarVariable}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Destinatarios TO
                            </label>
                            <input
                              value={form.destinatarios_to}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        destinatarios_to: e.target.value,
                                      }
                                    : prev,
                                )
                              }
                              placeholder="correo1@dominio.com, correo2@dominio.com"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Destinatarios CC
                            </label>
                            <input
                              value={form.destinatarios_cc}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        destinatarios_cc: e.target.value,
                                      }
                                    : prev,
                                )
                              }
                              placeholder="correo1@dominio.com, correo2@dominio.com"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              Cuerpo del correo
                            </div>
                          </label>
                          <HtmlBodyEditor
                            ref={cuerpoEditorRef}
                            value={form.cuerpo_html}
                            onFocus={() => setCampoActivoEdit("cuerpo")}
                            onChange={(value) =>
                              setForm((prev) =>
                                prev ? { ...prev, cuerpo_html: value } : prev,
                              )
                            }
                          />
                        </div>
                      </>
                    ) : (
                      /* Vista previa del HTML */
                      <EmailPreview
                        asunto={form.asunto}
                        cuerpo_html={form.cuerpo_html}
                        destinatarios_to={form.destinatarios_to}
                      />
                    )}

                    {/* Opciones y acciones */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
                      <label className="inline-flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={form.activa}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev
                                  ? { ...prev, activa: e.target.checked }
                                  : prev,
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Plantilla activa
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={guardarCambios}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar cambios
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Mail className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">
                      Selecciona una plantilla para editar
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Modal crear nueva plantilla */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Crear nueva plantilla
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Define un nuevo evento de notificación
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    disabled={saving}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código evento *
                    </label>
                    <input
                      type="text"
                      value={newPlantilla.codigo_evento}
                      onChange={(e) =>
                        setNewPlantilla({
                          ...newPlantilla,
                          codigo_evento: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ej: SOLICITUD_APROBADA"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Identificador único del evento (sin espacios)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={newPlantilla.nombre}
                      onChange={(e) =>
                        setNewPlantilla({
                          ...newPlantilla,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="Ej: Solicitud Aprobada"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto *
                  </label>
                  <input
                    ref={nuevaAsuntoInputRef}
                    type="text"
                    value={newPlantilla.asunto}
                    onFocus={() => setCampoActivoCrear("asunto")}
                    onChange={(e) =>
                      setNewPlantilla({
                        ...newPlantilla,
                        asunto: e.target.value,
                      })
                    }
                    placeholder="Asunto del correo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={saving}
                  />
                </div>

                {newPlantilla.codigo_evento && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                    <VariablesDisponibles
                      codigoEvento={newPlantilla.codigo_evento}
                      onInsert={insertarVariableEnCrear}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinatarios TO
                    </label>
                    <input
                      type="text"
                      value={newPlantilla.destinatarios_to}
                      onChange={(e) =>
                        setNewPlantilla({
                          ...newPlantilla,
                          destinatarios_to: e.target.value,
                        })
                      }
                      placeholder="correo1@dominio.com, correo2@dominio.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinatarios CC
                    </label>
                    <input
                      type="text"
                      value={newPlantilla.destinatarios_cc}
                      onChange={(e) =>
                        setNewPlantilla({
                          ...newPlantilla,
                          destinatarios_cc: e.target.value,
                        })
                      }
                      placeholder="correo1@dominio.com, correo2@dominio.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Cuerpo del correo *
                    </div>
                  </label>
                  <HtmlBodyEditor
                    ref={nuevaCuerpoEditorRef}
                    value={newPlantilla.cuerpo_html}
                    onFocus={() => setCampoActivoCrear("cuerpo")}
                    onChange={(value) =>
                      setNewPlantilla({
                        ...newPlantilla,
                        cuerpo_html: value,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={newPlantilla.activa}
                        onChange={(e) =>
                          setNewPlantilla({
                            ...newPlantilla,
                            activa: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                        disabled={saving}
                      />
                      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Plantilla activa
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={crearPlantilla}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Crear plantilla
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmEdit}
        title="Confirmar cambios"
        message="¿Deseas guardar los cambios de esta plantilla?"
        confirmText="Sí, guardar"
        cancelText="Cancelar"
        isLoading={saving}
        onConfirm={confirmarGuardarCambios}
        onCancel={() => setShowConfirmEdit(false)}
      />

      <ConfirmModal
        isOpen={showConfirmCreate}
        title="Confirmar creación"
        message={`¿Deseas crear la plantilla "${newPlantilla.nombre.trim()}"?`}
        confirmText="Sí, crear"
        cancelText="Cancelar"
        isLoading={saving}
        onConfirm={confirmarCrearPlantilla}
        onCancel={() => setShowConfirmCreate(false)}
      />
    </div>
  );
}
