"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Upload, Trash2 } from "lucide-react";
import {
  misDocumentosService,
  type MiDocumento,
  type MisDocumentosResponse,
} from "@/services/mis-documentos.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import {
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  getArchivoPreviewUrl,
} from "@/lib/documentos-vigencia.util";
import { ConfirmModal, SuccessModal } from "@/components/modals";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const fecha = typeof value === "string" ? value.split("T")[0] : value;
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

function requiereFecha(doc: MiDocumento) {
  return doc.tdo_vigencia_dias != null || doc.tdo_regla_vigencia === "ANIO";
}

function getEstadoVigencia(doc: MiDocumento) {
  const fecha = doc.sd_fecha_emision
    ? doc.sd_fecha_emision.split("T")[0]
    : undefined;

  if (doc.tdo_regla_vigencia === "ANIO") {
    const estado = calcularEstadoAnioDocumento(
      fecha,
      doc.tdo_anios_atras_permitidos,
    );
    if (!estado)
      return {
        label: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
      };
    if (!estado.valido) {
      return {
        label: "Vencido",
        className: "bg-red-100 text-red-800",
        vencido: true,
      };
    }

    const { mesesRestantes = 0, diasRestantes = 0 } = estado;
    const partes: string[] = [];
    if (mesesRestantes > 0) {
      partes.push(`${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`);
    }
    if (diasRestantes > 0 || partes.length === 0) {
      partes.push(`${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`);
    }

    return {
      label: `Vigente (${estado.anioDocumento}) · faltan ${partes.join(" y ")}`,
      className: "bg-emerald-100 text-emerald-800",
      vencido: false,
    };
  }

  if (doc.tdo_vigencia_dias != null) {
    const resumen = calcularVigenciaDocumento(fecha, doc.tdo_vigencia_dias);
    if (!resumen)
      return {
        label: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
      };
    return resumen.diasRestantes >= 0
      ? {
          label: `Faltan ${resumen.diasRestantes} día${resumen.diasRestantes === 1 ? "" : "s"}`,
          className: "bg-emerald-100 text-emerald-800",
          vencido: false,
        }
      : {
          label: `Vencido hace ${Math.abs(resumen.diasRestantes)} día${Math.abs(resumen.diasRestantes) === 1 ? "" : "s"}`,
          className: "bg-red-100 text-red-800",
          vencido: true,
        };
  }

  return {
    label: "Sin vigencia",
    className: "bg-slate-100 text-slate-600",
    vencido: false,
  };
}

function esDocumentoEditable(
  doc: MiDocumento,
  puedeCorregir: boolean,
  rechazadoPorAuxiliar: boolean,
  vencido: boolean,
) {
  if (!puedeCorregir) return false;
  if (!rechazadoPorAuxiliar) return true;
  return doc.sd_requiere_cambio || vencido;
}

export default function MisDocumentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitud, setSolicitud] =
    useState<MisDocumentosResponse["solicitud"]>(null);
  const [documentos, setDocumentos] = useState<MiDocumento[]>([]);
  const [puedeCorregir, setPuedeCorregir] = useState(false);
  const [rechazadoPorAuxiliar, setRechazadoPorAuxiliar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<MiDocumento | null>(
    null,
  );
  // Cambios en edición: no se guardan en el backend hasta que el cliente
  // presiona "Actualizar e informar a Cartonera".
  const [pendingFechas, setPendingFechas] = useState<Record<number, string>>(
    {},
  );
  const [pendingFiles, setPendingFiles] = useState<Record<number, File>>({});
  const huboCambios =
    Object.keys(pendingFechas).length > 0 ||
    Object.keys(pendingFiles).length > 0;
  const [enviando, setEnviando] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await misDocumentosService.getMisDocumentos();
      setSolicitud(data.solicitud);
      setDocumentos(data.documentos);
      setPuedeCorregir(data.puedeCorregir);
      setRechazadoPorAuxiliar(data.rechazadoPorAuxiliar);
    } catch (error) {
      console.error("[MisDocumentosPage] Error cargando:", error);
      setErrorMessage("No se pudieron cargar tus documentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleSeleccionarArchivo = (doc: MiDocumento, file: File) => {
    setPendingFiles((prev) => ({ ...prev, [doc.sa_id]: file }));
  };

  const handleCambiarFecha = (doc: MiDocumento, fecha: string) => {
    setPendingFechas((prev) => ({ ...prev, [doc.sa_id]: fecha }));
  };

  const handleActualizarEInformar = async () => {
    if (!solicitud) return;
    try {
      setEnviando(true);

      for (const doc of documentos) {
        const file = pendingFiles[doc.sa_id];
        const fecha = pendingFechas[doc.sa_id];

        if (file) {
          await formularioRespuestasService.guardarArchivoRespuesta(
            solicitud.sol_id,
            doc.fp_id,
            file,
            fecha ??
              (doc.sd_fecha_emision
                ? doc.sd_fecha_emision.split("T")[0]
                : undefined),
          );
        } else if (fecha) {
          await formularioRespuestasService.actualizarFechaDocumento(
            solicitud.sol_id,
            doc.fp_id,
            fecha,
          );
        }
      }

      await misDocumentosService.enviarCorreccion(solicitud.sol_id);

      setPendingFechas({});
      setPendingFiles({});
      setShowSuccessModal(true);
      await cargar();
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error actualizando e informando:",
        error,
      );
      setErrorMessage("No se pudo actualizar e informar a Cartonera.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async () => {
    if (!solicitud || !confirmEliminar) return;
    try {
      await formularioRespuestasService.eliminarArchivoRespuesta(
        solicitud.sol_id,
        confirmEliminar.sa_id,
      );
      setConfirmEliminar(null);
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error eliminando:", error);
      setErrorMessage("No se pudo eliminar el documento.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/solicitudes/cliente")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Volver a mis solicitudes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
          <p className="text-gray-600 mt-2">
            {solicitud
              ? `Documentos de la solicitud ${solicitud.sol_numero_solicitud}.`
              : "Consulta el estado de tus documentos y corrígelos si hace falta."}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {!puedeCorregir && solicitud && !loading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta solicitud ya no admite cambios de documentos (está en revisión
            o ya fue resuelta). Aquí solo puedes consultarlos.
          </div>
        )}

        {rechazadoPorAuxiliar && puedeCorregir && !loading && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            El auxiliar de servicio al cliente rechazó tu solicitud porque
            algunos documentos tienen la fecha de emisión incorrecta. Corrige
            los documentos marcados como{" "}
            <strong>&quot;Requiere cambio&quot;</strong> (o los que aparezcan
            vencidos). Los demás documentos solo se pueden consultar en este
            momento.
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            Cargando tus documentos...
          </div>
        ) : !solicitud ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            Aún no tienes ninguna solicitud con documentos.
          </div>
        ) : documentos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            No hay documentos cargados en esta solicitud.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Vigencia</th>
                  <th className="px-4 py-3">Fecha de emisión</th>
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Acciones</th>
                  <th className="px-4 py-3">Cargado el</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => {
                  const estado = getEstadoVigencia(doc);
                  const editable = esDocumentoEditable(
                    doc,
                    puedeCorregir,
                    rechazadoPorAuxiliar,
                    estado.vencido,
                  );
                  const archivoUrl = getArchivoPreviewUrl(
                    {
                      sa_id: doc.sa_id,
                      sa_ruta_almacenamiento: doc.sa_ruta_almacenamiento,
                      sa_nombre_guardado: doc.sa_nombre_guardado,
                    },
                    solicitud.sol_id,
                  );

                  return (
                    <tr
                      key={doc.sa_id}
                      className="border-b border-gray-100 last:border-0 align-top"
                    >
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">
                              {doc.tdo_nombre || doc.sa_nombre_original}
                            </p>
                            <p className="text-xs text-gray-500 break-words">
                              {doc.sa_nombre_original}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}
                          >
                            {estado.label}
                          </span>
                          {rechazadoPorAuxiliar && doc.sd_requiere_cambio && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800">
                              Requiere cambio
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {requiereFecha(doc) ? (
                          <input
                            type="date"
                            value={
                              pendingFechas[doc.sa_id] ??
                              (doc.sd_fecha_emision
                                ? doc.sd_fecha_emision.split("T")[0]
                                : "")
                            }
                            min="1900-01-01"
                            max={new Date().toISOString().split("T")[0]}
                            disabled={!editable}
                            onChange={(e) =>
                              e.target.value &&
                              handleCambiarFecha(doc, e.target.value)
                            }
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {archivoUrl ? (
                          <a
                            href={archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            Ver archivo
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {editable ? (
                            <>
                              <label className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                <Upload className="h-3.5 w-3.5" />
                                Reemplazar
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf,image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleSeleccionarArchivo(doc, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>

                              <button
                                onClick={() => setConfirmEliminar(doc)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </>
                          ) : (
                            rechazadoPorAuxiliar && (
                              <span className="text-xs text-gray-400">
                                Solo lectura
                              </span>
                            )
                          )}
                        </div>
                        {pendingFiles[doc.sa_id] && (
                          <p className="mt-1 text-xs font-medium text-blue-700">
                            Pendiente: {pendingFiles[doc.sa_id].name}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(doc.fecha_carga)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rechazadoPorAuxiliar &&
          puedeCorregir &&
          !loading &&
          documentos.length > 0 && (
            <div className="sticky bottom-4 mt-6 flex justify-end rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
              <button
                onClick={handleActualizarEInformar}
                disabled={!huboCambios || enviando}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {enviando ? "Actualizando..." : "Actualizar e informar a Cartonera"}
              </button>
            </div>
          )}
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Enviado!"
        message="Tu corrección fue enviada. Cartonera revisará los documentos actualizados."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => setShowSuccessModal(false)}
      />

      <ConfirmModal
        isOpen={!!confirmEliminar}
        title="Eliminar documento"
        message={`¿Deseas eliminar "${confirmEliminar?.tdo_nombre || confirmEliminar?.sa_nombre_original}"? No podrás recuperarlo.`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
