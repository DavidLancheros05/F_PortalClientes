"use client";

import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { generarCartaPdf } from "@/lib/carta-pdf.util";
import { Calendar, CheckCircle, Download, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

interface DocumentoTablaFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  documentosCatalogoMap: Record<number, any>;
  readOnly: boolean;
  solicitudId?: number;
  hasError?: string;
  rules: any;
  preguntaFechaAsociada?: any;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  setRespuestas: Dispatch<SetStateAction<Record<number, any>>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
  validateField: (fp_id: number, rules: any) => void;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  getOpcionDocumentoFija: (pregunta: any) => any;
  calcularVigenciaDocumento: (
    fechaEmision?: string,
    vigenciaDias?: number | null,
  ) => { diasRestantes: number; fechaVencimiento: Date } | null;
  calcularEstadoAnioDocumento: (
    fechaEmision?: string,
    aniosAtrasPermitidos?: number | null,
  ) => {
    valido: boolean;
    anioDocumento: number;
    anioMinimo: number;
    anioMaximo: number;
  } | null;
  representanteLegal: { nombre: string; identificacion: string } | null;
  clienteInfo: { nombre: string; nit: string };
  numeroSolicitud: string | null;
}

export function DocumentoTablaField({
  pregunta,
  respuestas,
  archivosExistentes,
  documentosCatalogoMap,
  readOnly,
  solicitudId,
  hasError,
  rules,
  preguntaFechaAsociada,
  handleInputChange,
  setRespuestas,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
  validateField,
  getArchivoPreviewUrl,
  getOpcionDocumentoFija,
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  representanteLegal,
  clienteInfo,
  numeroSolicitud,
}: DocumentoTablaFieldProps) {
  const opcionFija = getOpcionDocumentoFija(pregunta);
  const documento = pregunta.fp_tipo_documento_id
    ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
    : null;
  // El tipo de documento ya queda determinado por fp_tipo_documento_id
  // (el vínculo al catálogo), sin importar si además existe una fila en
  // Formulario_pregunta_opcion. El selector manual solo debe aparecer
  // para preguntas de documento genéricas, sin catálogo vinculado.
  const tipoDocumentoFijo = opcionFija?.op_descripcion || documento?.tdo_nombre;
  const vigenciaDias = documento?.tdo_vigencia_dias ?? null;

  // Obtener fecha desde el archivo existente, o desde la pregunta hija, o desde la respuesta
  const archivoExistente = archivosExistentes[pregunta.fp_id];

  // Calcular fecha en formato YYYY-MM-dd. El valor editado localmente
  // (respuestas) tiene prioridad sobre archivoExistente.sd_fecha_emision:
  // ese último es lo que ya quedó guardado en el servidor, así que si se
  // usara primero, cada cambio del usuario se revertía de inmediato al
  // valor viejo apenas se recalculaba este efecto (el usuario no podía
  // editar la fecha, siempre volvía a la anterior).
  const calcularFechaFormato = () => {
    let fecha =
      (preguntaFechaAsociada
        ? respuestas[preguntaFechaAsociada.fp_id]?.valor_fecha
        : null) ||
      respuestas[pregunta.fp_id]?.valor_fecha ||
      archivoExistente?.sd_fecha_emision ||
      "";

    // Convertir fecha ISO a formato YYYY-MM-dd si es necesario
    if (fecha && typeof fecha === "string" && fecha.includes("T")) {
      fecha = fecha.split("T")[0];
    }
    return fecha;
  };

  const fechaFormato = calcularFechaFormato();
  const [fechaInputValue, setFechaInputValue] = useState<string>(fechaFormato);

  // Sincronizar estado local cuando cambian las fuentes de fecha
  useEffect(() => {
    setFechaInputValue(fechaFormato);
  }, [
    archivoExistente?.sd_fecha_emision,
    preguntaFechaAsociada?.fp_id,
    respuestas[preguntaFechaAsociada?.fp_id]?.valor_fecha,
    respuestas[pregunta.fp_id]?.valor_fecha,
  ]);

  // Obtener fecha de hoy en formato YYYY-MM-DD
  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    console.log("🔍 [DocumentoTablaField] Cálculo de fechaEmision:", {
      fp_id: pregunta.fp_id,
      archivoExistente_sd_fecha_emision: archivoExistente?.sd_fecha_emision,
      preguntaFechaAsociada: preguntaFechaAsociada?.fp_id,
      respuestaFechaAsociada:
        respuestas[preguntaFechaAsociada?.fp_id]?.valor_fecha,
      respuestaDirecta: respuestas[pregunta.fp_id]?.valor_fecha,
      fechaEmision_final: fechaFormato,
    });
  }, [
    pregunta.fp_id,
    archivoExistente?.sd_fecha_emision,
    preguntaFechaAsociada?.fp_id,
    respuestas,
    fechaFormato,
  ]);

  const resumenVigencia = calcularVigenciaDocumento(
    fechaInputValue,
    vigenciaDias,
  );
  const esReglaAnio = documento?.tdo_regla_vigencia === "ANIO";
  const resumenAnio = calcularEstadoAnioDocumento(
    fechaInputValue,
    documento?.tdo_anios_atras_permitidos,
  );

  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);

  const handleDescargarPlantilla = async () => {
    if (!documento?.tdo_plantilla_contenido) return;
    setDescargandoPlantilla(true);
    try {
      const reemplazos: Record<string, string> = {
        "{{cliente_nombre}}": clienteInfo?.nombre || "",
        "{{cliente_nit}}": clienteInfo?.nit || "",
        "{{numero_solicitud}}": numeroSolicitud || "",
        "{{representante_legal_nombre}}": representanteLegal?.nombre || "",
        "{{representante_legal_cedula}}":
          representanteLegal?.identificacion || "",
      };
      const contenido = Object.entries(reemplazos).reduce(
        (texto, [placeholder, valor]) => texto.split(placeholder).join(valor),
        documento.tdo_plantilla_contenido,
      );
      await generarCartaPdf({
        contenido,
        asunto: tipoDocumentoFijo || documento.tdo_nombre,
        destinatarioNombre: clienteInfo?.nombre || "-",
        nombreArchivo: `plantilla-${documento.tdo_nombre}.pdf`,
      });
    } catch (err) {
      console.error("Error generando plantilla:", err);
      setErrorMessage("Error generando la plantilla descargable");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 leading-tight">
            {tipoDocumentoFijo || pregunta.fp_descripcion}
            {pregunta.fp_requerida && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </p>
          {documento?.tdo_descripcion && (
            <p className="mt-0.5 text-xs text-slate-600 whitespace-pre-wrap break-words leading-relaxed">
              {documento.tdo_descripcion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-blue-700">
            <FileText className="h-2.5 w-2.5" />
            PDF
          </span>
          {pregunta.fp_requerida && (
            <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              Oblig.
            </span>
          )}
        </div>
      </div>

      {documento?.tdo_tiene_plantilla && documento?.tdo_plantilla_contenido && (
        <button
          type="button"
          onClick={handleDescargarPlantilla}
          disabled={descargandoPlantilla}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 transition-colors font-medium border border-amber-200 disabled:opacity-60"
        >
          <Download className="h-3 w-3" />
          {descargandoPlantilla ? "Generando..." : "Descargar plantilla"}
        </button>
      )}

      {!tipoDocumentoFijo && !readOnly && (
        <div className="space-y-0.5">
          <label className="text-xs font-semibold uppercase tracking-tight text-slate-600">
            Tipo de documento
          </label>
          <select
            value={String(respuestas[pregunta.fp_id]?.valor_opcion_id || "")}
            onChange={(e) =>
              handleInputChange(
                pregunta.fp_id,
                Number(e.target.value) || e.target.value,
                "SELECT",
              )
            }
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Selecciona una opción</option>
            {pregunta.opciones?.map((opcion: any) => (
              <option key={opcion.op_id} value={String(opcion.op_id)}>
                {opcion.op_descripcion}
              </option>
            ))}
          </select>
        </div>
      )}

      {archivosExistentes[pregunta.fp_id] && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-2 py-1.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-start gap-1 min-w-0">
              <FileText className="h-3 w-3 text-blue-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-blue-900 break-words">
                {archivosExistentes[pregunta.fp_id].sa_nombre_original}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {(() => {
                const rutaArchivo = getArchivoPreviewUrl(
                  archivosExistentes[pregunta.fp_id],
                );
                if (!rutaArchivo) return null;
                return (
                  <a
                    href={rutaArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs px-1.5 py-0.5 bg-white text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                  >
                    Ver
                  </a>
                );
              })()}
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("¿Eliminar archivo? No podrás recuperarlo."))
                        return;
                      try {
                        await formularioRespuestasService.eliminarArchivoRespuesta(
                          solicitudId!,
                          archivosExistentes[pregunta.fp_id].sa_id,
                        );
                        setArchivosExistentes((prev) => {
                          const newMap = { ...prev };
                          delete newMap[pregunta.fp_id];
                          return newMap;
                        });
                        setSuccessMessage("Archivo eliminado");
                        setTimeout(() => setSuccessMessage(""), 3000);
                      } catch (err) {
                        console.error("Error eliminando archivo:", err);
                        setErrorMessage("Error eliminando archivo");
                        setTimeout(() => setErrorMessage(""), 3000);
                      }
                    }}
                    className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tempInput = document.createElement("input");
                      tempInput.type = "file";
                      tempInput.accept = ".pdf,application/pdf";
                      tempInput.onchange = (event) => {
                        const target = event.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          handleInputChange(pregunta.fp_id, file, "ARCHIVO");
                        }
                      };
                      tempInput.click();
                    }}
                    className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium border border-slate-300"
                  >
                    Cambiar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {respuestas[pregunta.fp_id]?.nombre_archivo &&
        !archivosExistentes[pregunta.fp_id] && (
          <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-800 text-xs">
            <CheckCircle className="h-3 w-3 flex-shrink-0" />
            <span className="break-words font-medium">
              {respuestas[pregunta.fp_id]?.nombre_archivo}
            </span>
          </div>
        )}

      {!archivosExistentes[pregunta.fp_id] && !readOnly && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-tight text-slate-600">
            Cargar archivo
          </p>
          <input
            id={`file-input-doc-${pregunta.fp_id}`}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // console.log('📄 [FRONTEND] Archivo seleccionado:', { fp_id: pregunta.fp_id, nombreArchivo: file?.name, tamaño: file?.size });
              if (file) {
                handleInputChange(pregunta.fp_id, file, "ARCHIVO");
              }
            }}
            accept=".pdf,application/pdf"
            className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
              hasError ? "border-red-500" : "border-blue-200"
            }`}
          />
        </div>
      )}

      {(preguntaFechaAsociada || documento?.tdo_permite_vencimiento) &&
        (vigenciaDias !== null || esReglaAnio) && (
          <div className="space-y-1 border-t border-slate-200 pt-1">
            <label className="flex items-center gap-1 text-xs font-medium text-slate-800">
              <Calendar className="h-3 w-3" />
              {preguntaFechaAsociada?.fp_descripcion || "Fecha de emisión"}
              {preguntaFechaAsociada?.fp_requerida && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <input
              type="date"
              value={fechaInputValue}
              min="1900-01-01"
              max={hoy}
              onChange={(e) => {
                const fechaSeleccionada = e.target.value;
                // console.log('📅 [FRONTEND] Fecha seleccionada:', {
                //   fp_id: pregunta.fp_id,
                //   fecha: fechaSeleccionada,
                //   preguntaFecha: preguntaFechaAsociada?.fp_id,
                //   tienePreguntaHija: !!preguntaFechaAsociada
                // });
                setFechaInputValue(fechaSeleccionada);

                if (preguntaFechaAsociada) {
                  console.log(
                    "💾 Guardando en pregunta hija:",
                    preguntaFechaAsociada.fp_id,
                  );
                  setRespuestas((prev) => ({
                    ...prev,
                    [preguntaFechaAsociada.fp_id]: {
                      ...prev[preguntaFechaAsociada.fp_id],
                      valor_fecha: fechaSeleccionada,
                    },
                  }));
                } else {
                  // Si no hay pregunta hija, guardar en la respuesta del documento mismo
                  console.log(
                    "💾 Guardando en documento (sin pregunta hija):",
                    pregunta.fp_id,
                  );
                  setRespuestas((prev) => ({
                    ...prev,
                    [pregunta.fp_id]: {
                      ...prev[pregunta.fp_id],
                      valor_fecha: fechaSeleccionada,
                    },
                  }));
                }
              }}
              className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasError ? "border-red-500" : "border-gray-300"
              } ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
            />
            {esReglaAnio ? (
              <>
                <p className="text-xs text-slate-600">
                  {documento?.tdo_anios_atras_permitidos === 0
                    ? `Debe ser del año ${new Date().getFullYear()}.`
                    : `Debe ser de ${new Date().getFullYear() - (documento?.tdo_anios_atras_permitidos ?? 0)} a ${new Date().getFullYear()}.`}
                </p>
                {resumenAnio && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      resumenAnio.valido ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {resumenAnio.valido
                      ? `Vigente — es del año ${resumenAnio.anioDocumento}.`
                      : `Documento vencido — no es ${
                          resumenAnio.anioMinimo === resumenAnio.anioMaximo
                            ? `del año ${resumenAnio.anioMaximo}`
                            : `de ${resumenAnio.anioMinimo} o ${resumenAnio.anioMaximo}`
                        }.`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600">
                  Vigencia: {vigenciaDias} día{vigenciaDias === 1 ? "" : "s"}
                </p>
                {resumenVigencia && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      resumenVigencia.diasRestantes >= 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {resumenVigencia.diasRestantes >= 0
                      ? `Faltan ${resumenVigencia.diasRestantes} día${
                          resumenVigencia.diasRestantes === 1 ? "" : "s"
                        } para que venza.`
                      : `Vencido hace ${Math.abs(resumenVigencia.diasRestantes)} día${
                          Math.abs(resumenVigencia.diasRestantes) === 1
                            ? ""
                            : "s"
                        }.`}
                  </p>
                )}
              </>
            )}
          </div>
        )}
    </div>
  );
}
