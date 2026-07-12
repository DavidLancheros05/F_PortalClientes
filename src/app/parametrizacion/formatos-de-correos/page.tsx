"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  notificacionesService,
  PlantillaNotificacion,
} from "@/services/admin/parametrizacion/notificaciones.service";
import { EmailPreview } from "@/components/EmailPreview";
import { HtmlBodyEditor } from "@/components/HtmlBodyEditor";
import {
  Save,
  Mail,
  Users,
  Code,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Bell,
  Eye,
  EyeOff,
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

export default function FormatosDeCorreosPage() {
  const [items, setItems] = useState<PlantillaNotificacion[]>([]);
  const [selectedCodigo, setSelectedCodigo] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const selectedItem = useMemo(
    () => items.find((item) => item.codigo_evento === selectedCodigo) || null,
    [items, selectedCodigo],
  );

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

  const guardarCambios = async () => {
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

      setSuccess("Cambios guardados exitosamente");
      await cargarPlantillas();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Formatos de correos
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Administra asunto, contenido, destinatarios y estado de cada
                  evento
                </p>
              </div>
            </div>
            <Link
              href="/parametrizacion/correos-por-rol"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              Ver correos por rol
            </Link>
          </div>
        </div>

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
                            value={form.asunto}
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
                            value={form.cuerpo_html}
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
                          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Plantilla activa
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={guardarCambios}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
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
      </div>
    </div>
  );
}
