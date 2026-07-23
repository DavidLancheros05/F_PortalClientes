"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Pencil, X } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";

interface DocumentoCargado {
  sa_id: number;
  sa_nombre_original: string;
  sa_tamaño_bytes?: number;
  sa_ruta_almacenamiento?: string;
  sa_nombre_guardado?: string;
  fp_id?: number;
  tdo_id?: number | null;
  tdo_nombre?: string | null;
  tdo_permite_vencimiento?: boolean;
  tdo_vigencia_dias?: number | null;
  tdo_regla_vigencia?: string | null;
  tdo_anios_atras_permitidos?: number | null;
  fecha_carga?: string;
  sd_fecha_emision?: string | null;
  sd_fecha_vencimiento?: string | null;
}

interface DocumentosCargadosSolicitudProps {
  solicitudId: number;
  /** Habilita corregir la fecha de emisión y marcar un documento como "no corresponde" — uso interno (pantallas de gestión). */
  editable?: boolean;
  /** tdo_id de los documentos marcados como "no corresponde" por el gestor. */
  documentosMarcados?: number[];
  onToggleMarcado?: (tdoId: number) => void;
  /** Avisa al padre si algún documento cargado ya tiene el vencimiento vencido. */
  onEstadoDocumentos?: (estado: { hayVencidos: boolean }) => void;
}

/**
 * Lista de los documentos ya cargados en una solicitud, para el personal
 * interno (ASC, Oficial de Cumplimiento, etc.) en sus pantallas de gestión
 * — antes solo se veía el formulario, sin forma de revisar los archivos
 * adjuntos sin salir a otra pantalla. En modo `editable` permite además
 * corregir la fecha de emisión que puso el cliente (mismo endpoint que usa
 * el cliente para autocorregirse) y marcar un documento como "no
 * corresponde" para el flujo de rechazo.
 */
export function DocumentosCargadosSolicitud({
  solicitudId,
  editable = false,
  documentosMarcados = [],
  onToggleMarcado,
  onEstadoDocumentos,
}: DocumentosCargadosSolicitudProps) {
  const [documentos, setDocumentos] = useState<DocumentoCargado[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [fechaEditada, setFechaEditada] = useState("");
  const [guardandoFecha, setGuardandoFecha] = useState(false);

  const cargarDocumentos = () => {
    setLoading(true);
    return solicitudesService
      .getDocumentosPorSolicitud(solicitudId)
      .then((data) => {
        setDocumentos(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Error cargando documentos de la solicitud:", error);
        setDocumentos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const iniciarEdicionFecha = (doc: DocumentoCargado) => {
    setEditandoId(doc.sa_id);
    setFechaEditada(
      doc.sd_fecha_emision ? doc.sd_fecha_emision.slice(0, 10) : "",
    );
  };

  const guardarFecha = async (doc: DocumentoCargado) => {
    if (!fechaEditada || !doc.fp_id) return;
    try {
      setGuardandoFecha(true);
      await formularioRespuestasService.actualizarFechaDocumento(
        solicitudId,
        doc.fp_id,
        fechaEditada,
      );
      await cargarDocumentos();
      setEditandoId(null);
    } catch (error) {
      console.error("Error actualizando fecha de emisión:", error);
      alert("No se pudo actualizar la fecha de emisión");
    } finally {
      setGuardandoFecha(false);
    }
  };

  // Misma regla que decide si el cliente ve el campo de fecha de emisión al
  // diligenciar el formulario (useDocumentoVigencia::mostrarCampoFecha) —
  // si el tipo de documento no la pide, mostrar "No informada" sería
  // engañoso, porque nunca se le pidió al cliente.
  const aplicaFechaEmision = (doc: DocumentoCargado) =>
    Boolean(doc.tdo_permite_vencimiento) &&
    (doc.tdo_vigencia_dias != null || doc.tdo_regla_vigencia === "ANIO");

  // Regla "ANIO" no fija una fecha de vencimiento — valida que el año de
  // emisión esté dentro de tdo_anios_atras_permitidos años atrás del año
  // actual (backend nunca calcula sa_fecha_vencimiento para esta regla).
  // El vencimiento efectivo es el 31 de diciembre del último año aceptado.
  const calcularVencimientoAnio = (doc: DocumentoCargado): Date | null => {
    if (doc.tdo_regla_vigencia !== "ANIO" || !doc.sd_fecha_emision) {
      return null;
    }
    const anioEmision = new Date(doc.sd_fecha_emision).getFullYear();
    const anioLimite = anioEmision + (doc.tdo_anios_atras_permitidos ?? 0);
    return new Date(anioLimite, 11, 31);
  };

  const calcularVencimientoEfectivo = (doc: DocumentoCargado): Date | null => {
    if (!aplicaFechaEmision(doc)) return null;
    if (doc.sd_fecha_vencimiento) return new Date(doc.sd_fecha_vencimiento);
    return calcularVencimientoAnio(doc);
  };

  useEffect(() => {
    if (!onEstadoDocumentos) return;
    const hoy = new Date();
    const hayVencidos = documentos.some((doc) => {
      const vencimiento = calcularVencimientoEfectivo(doc);
      return vencimiento != null && vencimiento < hoy;
    });
    onEstadoDocumentos({ hayVencidos });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentos]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <FileText size={20} className="text-blue-600" />
        Documentos cargados por el cliente
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          Esta solicitud no tiene documentos cargados todavía.
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Documento</th>
                <th className="px-4 py-2 font-medium">Fecha de emisión</th>
                <th className="px-4 py-2 font-medium">Vencimiento</th>
                <th className="px-4 py-2 font-medium">Ver</th>
                {editable && (
                  <th className="px-4 py-2 font-medium">
                    Solicitar cambio de documento
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documentos.map((doc) => {
                const url = getArchivoPreviewUrl(doc, solicitudId);
                const marcado =
                  doc.tdo_id != null &&
                  documentosMarcados.includes(doc.tdo_id);
                return (
                  <tr
                    key={doc.sa_id}
                    className={marcado ? "bg-red-50" : "bg-white"}
                  >
                    <td className="px-4 py-2.5 align-top">
                      <p className="font-medium text-gray-900">
                        {doc.tdo_nombre || "Documento"}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-55">
                        {doc.sa_nombre_original}
                      </p>
                      {doc.fecha_carga && (
                        <p className="text-xs text-gray-400">
                          Cargado el{" "}
                          {new Date(doc.fecha_carga).toLocaleDateString(
                            "es-CO",
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      {editandoId === doc.sa_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={fechaEditada}
                            onChange={(e) => setFechaEditada(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => guardarFecha(doc)}
                            disabled={!fechaEditada || guardandoFecha}
                            className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : !aplicaFechaEmision(doc) ? (
                        <p className="text-gray-400 italic">No aplica</p>
                      ) : (
                        <p className="text-gray-700 flex items-center gap-1.5">
                          {doc.sd_fecha_emision ? (
                            new Date(doc.sd_fecha_emision).toLocaleDateString(
                              "es-CO",
                            )
                          ) : (
                            <span className="text-red-700 font-medium">
                              No informada
                            </span>
                          )}
                          {editable && doc.fp_id && (
                            <button
                              type="button"
                              onClick={() => iniciarEdicionFecha(doc)}
                              title="Corregir fecha de emisión"
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top text-gray-700">
                      {(() => {
                        if (!aplicaFechaEmision(doc)) {
                          return (
                            <span className="text-gray-400 italic">
                              No aplica
                            </span>
                          );
                        }
                        const vencimiento = calcularVencimientoEfectivo(doc);
                        if (!vencimiento) {
                          return <span className="text-gray-400">—</span>;
                        }
                        const vencido = vencimiento < new Date();
                        return (
                          <span
                            className={
                              vencido ? "text-red-700 font-medium" : undefined
                            }
                          >
                            {vencimiento.toLocaleDateString("es-CO")}
                            {vencido && " (vencido)"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver documento"
                          className="inline-flex items-center justify-center h-7 w-7 text-blue-700 border border-blue-200 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} />
                        </a>
                      )}
                    </td>
                    {editable && (
                      <td className="px-4 py-2.5 align-top">
                        {doc.tdo_id != null && onToggleMarcado && (
                          <button
                            type="button"
                            onClick={() => onToggleMarcado(doc.tdo_id!)}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border rounded-md transition-colors whitespace-nowrap ${
                              marcado
                                ? "bg-red-100 text-red-700 border-red-300"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                            }`}
                          >
                            <X size={14} />
                            {marcado ? "Cambio solicitado" : "Solicitar cambio"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
