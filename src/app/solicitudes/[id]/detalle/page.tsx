"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Building2, User, FileText, DollarSign, Clock, X } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { cartaPdfVinculacionService } from "@/services/admin/parametrizacion/carta-pdf-vinculacion.service";
import { ESTADOS } from "@/lib/workflow-labels";
import html2pdf from "html2pdf.js";

interface SolicitudDetalle {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  cliente_nit?: string;
  ejecutivo_nombre?: string;
  usuario_registro?: string;
  usuario_revision?: string;
  centro_operacion_nombre?: string;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_fecha_creacion: string;
  sol_estado_id: number;
  sol_razon_social?: string;
  sol_nit_documento?: string;
  sol_direccion?: string;
  sol_telefono?: string;
  sol_consumo_mensual_proyectado?: number;
  sol_cupo_aprobado?: number;
  sol_plazo_pago?: number;
  sol_forma_pago?: string;
  sol_es_zona_franca?: boolean;
  sol_formulario_version?: number;
  sol_fecha_estimada_respuesta_comercial?: string;
  sol_fecha_real_respuesta_comercial?: string;
  sol_fecha_estimada_respuesta?: string;
  sol_estado_llenado?: string;
  sol_formulario_progreso_porcentaje?: number;
  sol_cupo_solicitado?: number;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getEstadoBadgeClass(estadoId: number) {
  switch (estadoId) {
    case 1: // BORRADOR
      return "bg-gray-100 text-gray-800 border-gray-300";
    case 2: // PENDIENTE
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case 3: // APROBADA
      return "bg-green-100 text-green-800 border-green-300";
    case 4: // RECHAZADA
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

export default function DetalleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = Number(params.id);

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const abrirCartaPDF = async () => {
    if (!solicitud) return;

    setGenerandoPDF(true);
    try {
      const plantillas = await cartaPdfVinculacionService.getAll();
      const plantillaActiva = plantillas.find((p) => p.cpv_activo);

      if (!plantillaActiva) {
        alert("No hay plantilla de carta activa");
        return;
      }

      // Reemplazar placeholders con datos reales
      let contenido = plantillaActiva.cpv_contenido;

      const reemplazos: Record<string, string> = {
        "{{cliente_nombre}}": solicitud.cliente_nombre || "-",
        "{{cupo_aprobado}}": formatCurrency(solicitud.sol_cupo_aprobado),
        "{{forma_pago}}": solicitud.sol_forma_pago || "-",
        "{{plazo}}": solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-",
        "{{fecha_aprobacion}}": formatDate(solicitud.sol_fecha_real_respuesta_comercial),
        "{{numero_solicitud}}": solicitud.sol_numero_solicitud || "-",
        "{{tasa_interes}}": "-",
      };

      Object.entries(reemplazos).forEach(([placeholder, valor]) => {
        contenido = contenido.replace(new RegExp(placeholder, "g"), valor);
      });

      // Crear HTML para el PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * {
              margin: 0;
              padding: 0;
            }
            html, body {
              height: 100%;
            }
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              line-height: 1.8;
              color: #333;
              padding: 40px;
              background: white;
              font-size: 14px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #0066cc;
            }
            .header h1 {
              color: #0066cc;
              margin: 0 0 10px 0;
              font-size: 28px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0;
              font-size: 13px;
              color: #666;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Georgia', serif;
              line-height: 1.9;
              text-align: justify;
              margin: 30px 0;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .content p {
              margin: 15px 0;
              text-indent: 40px;
            }
            .content p:first-child {
              text-indent: 0;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #999;
              border-top: 1px solid #ddd;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Carta de Vinculación Comercial</h1>
              <p>Solicitud: ${solicitud.sol_numero_solicitud}</p>
              <p>Fecha: ${new Date().toLocaleDateString("es-CO")}</p>
            </div>
            <div class="content">${contenido.replace(/</g, "&lt;").replace(/>/g, "&gt;").split("\n\n").map(p => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`).join("")}</div>
            <div class="footer">
              <p>Documento generado automáticamente el ${new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <p>Sistema de Vinculación Comercial - CARTONERA</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Generar PDF y abrir en nueva pestaña
      const opt = {
        margin: 10,
        filename: `carta-vinculacion-${solicitud.sol_numero_solicitud}.pdf`,
        image: { type: "png" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait" as const, unit: "mm" as const, format: "a4" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] as any },
      };

      // Generar el PDF y convertirlo a Blob
      const pdf = html2pdf().set(opt).from(htmlContent);

      // Obtener el PDF como Blob y abrirlo en una nueva pestaña
      pdf.toPdf().get("pdf").then((pdfObj: any) => {
        const blob = pdfObj.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  useEffect(() => {
    async function cargarSolicitud() {
      try {
        const data = await solicitudesService.getById(solicitudId);
        setSolicitud(data);
      } catch (err) {
        console.error("Error cargando solicitud:", err);
        setError("Error al cargar los datos de la solicitud");
      } finally {
        setLoading(false);
      }
    }

    if (solicitudId) {
      cargarSolicitud();
    }
  }, [solicitudId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            {loading ? (
              <div className="animate-pulse flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-8 w-32 bg-gray-200 rounded" />
                </div>
                <div className="h-9 w-28 bg-gray-200 rounded-lg" />
              </div>
            ) : error || !solicitud ? (
              <p className="text-red-600">
                {error || "No se encontró la solicitud"}
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Solicitud</p>
                  <h1 className="text-3xl font-bold text-blue-800">
                    {solicitud.sol_numero_solicitud}
                  </h1>
                </div>
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-block px-4 py-2 rounded-lg font-semibold border text-center ${getEstadoBadgeClass(
                      solicitud.sol_estado_id
                    )}`}
                  >
                    {ESTADOS[solicitud.sol_estado_id] || "Desconocido"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 h-40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && solicitud && (
        <>
        {/* Grid de secciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Información General */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Información General
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Fecha de Creación</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(solicitud.sol_fecha_creacion)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Centro de Operación</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.centro_operacion_nombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Versión Formulario</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_formulario_version || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Zona Franca</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_es_zona_franca ? "Sí" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Etapa y Resultado */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Workflow
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Etapa Actual</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.etapa_nombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Resultado Etapa</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.resultado_nombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Fecha Est. Respuesta Comercial</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(solicitud.sol_fecha_estimada_respuesta_comercial)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Fecha Real Respuesta Comercial</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(solicitud.sol_fecha_real_respuesta_comercial)}
                </p>
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Datos del Cliente
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Razón Social</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_razon_social || solicitud.cliente_nombre || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">NIT/Documento</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_nit_documento || solicitud.cliente_nit || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Dirección</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_direccion || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Teléfono</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.sol_telefono || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Contactos
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Ejecutivo de Negocios</p>
                <p className="text-sm font-medium text-gray-900">
                  {solicitud.ejecutivo_nombre || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Información Comercial */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Información Comercial
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Consumo Mensual Proyectado</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(solicitud.sol_consumo_mensual_proyectado)}
                </p>
              </div>
            </div>
          </div>

          {/* Condiciones Financieras */}
          {solicitud.sol_cupo_aprobado && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 lg:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Condiciones Financieras Aprobadas
                  </h2>
                </div>
                <button
                  onClick={abrirCartaPDF}
                  disabled={generandoPDF}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" />
                  {generandoPDF ? "Generando..." : "Ver Carta PDF"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Cupo Aprobado</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(solicitud.sol_cupo_aprobado)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Plazo de Pago</p>
                  <p className="text-2xl font-bold text-green-700">
                    {solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-"}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500 uppercase mb-1">Forma de Pago</p>
                  <p className="text-lg font-bold text-green-700">
                    {solicitud.sol_forma_pago || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
        </>
        )}
      </div>

    </div>
  );
}
