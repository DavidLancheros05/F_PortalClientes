"use client";

import { useEffect, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";

interface DocumentoCargado {
  sa_id: number;
  sa_nombre_original: string;
  sa_tamaño_bytes?: number;
  sa_ruta_almacenamiento?: string;
  sa_nombre_guardado?: string;
  tdo_nombre?: string | null;
  fecha_carga?: string;
}

interface DocumentosCargadosSolicitudProps {
  solicitudId: number;
}

/**
 * Lista de solo lectura de los documentos ya cargados en una solicitud, para
 * el personal interno (ASC, Oficial de Cumplimiento, etc.) en sus pantallas
 * de gestión — antes solo se veía el formulario, sin forma de revisar los
 * archivos adjuntos sin salir a otra pantalla.
 */
export function DocumentosCargadosSolicitud({
  solicitudId,
}: DocumentosCargadosSolicitudProps) {
  const [documentos, setDocumentos] = useState<DocumentoCargado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    solicitudesService
      .getDocumentosPorSolicitud(solicitudId)
      .then((data) => {
        if (!cancelado) setDocumentos(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Error cargando documentos de la solicitud:", error);
        if (!cancelado) setDocumentos([]);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [solicitudId]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <FileText size={20} className="text-blue-600" />
        Documentos cargados
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
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {documentos.map((doc) => {
            const url = getArchivoPreviewUrl(doc, solicitudId);
            return (
              <div
                key={doc.sa_id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.tdo_nombre || "Documento"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {doc.sa_nombre_original}
                  </p>
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Eye size={14} />
                    Ver
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
