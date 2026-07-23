"use client";

import { AlertTriangle } from "lucide-react";
import { SearchableSelect } from "@/components/FormularioUI/SearchableSelect";
import { ArchivoField } from "./ArchivoField";
import { ImagenField } from "./ImagenField";
import { DocumentoTablaField } from "./DocumentoTablaField";
import { TablaField } from "./TablaField";
import type { Dispatch, SetStateAction } from "react";
import type { FormularioPregunta, RespuestasState } from "../types";

interface PreguntaRendererProps {
  pregunta: FormularioPregunta;
  seccionPreguntas: FormularioPregunta[];
  preguntas: FormularioPregunta[];
  respuestas: RespuestasState;
  errors: Record<number, string>;
  readOnly: boolean;
  solicitudId?: number;
  lockedPrefillFieldIds?: Record<number, true>;
  prefilledFieldIds?: Record<number, true>;
  prefillSourceByFieldId?: Record<number, "cliente" | "ultimoFormulario">;
  documentosCatalogoMap: Record<number, any>;
  archivosExistentes: Record<number, any>;
  maestroPreguntaIds: {
    paisId?: number;
    departamentoId?: number;
    ciudadId?: number;
  };
  paises: any[];
  departamentos: any[];
  ciudades: any[];
  fechaHoraActualFormateada: string;
  setRespuestas: Dispatch<SetStateAction<RespuestasState>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
  shouldShowQuestionForCurrentUser: (pregunta: FormularioPregunta) => boolean;
  shouldShowConditionalField: (pregunta: FormularioPregunta) => boolean;
  getValidationRules: (pregunta: FormularioPregunta) => any;
  validateField: (fp_id: number, rules: any) => void;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  getNotaDisplay: (pregunta: FormularioPregunta) => {
    titulo: string;
    subtitulo: string;
    cuerpo: string;
  };
  getArchivoPreviewUrl: (archivo: any) => string | null;
  getOpcionDocumentoFija: (pregunta: FormularioPregunta) => any;
  getPreguntaFechaAsociada: (pregunta: FormularioPregunta) => FormularioPregunta | null;
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

export function PreguntaRenderer(props: PreguntaRendererProps) {
  const {
    pregunta,
    seccionPreguntas,
    preguntas,
    documentosCatalogoMap,
    respuestas,
    errors,
    readOnly,
    solicitudId,
    lockedPrefillFieldIds = {},
    prefilledFieldIds = {},
    prefillSourceByFieldId = {},
    archivosExistentes,
    maestroPreguntaIds,
    paises,
    departamentos,
    ciudades,
    fechaHoraActualFormateada,
    setRespuestas,
    setArchivosExistentes,
    setSuccessMessage,
    setErrorMessage,
    shouldShowQuestionForCurrentUser,
    shouldShowConditionalField,
    getValidationRules,
    validateField,
    handleInputChange,
    getNotaDisplay,
    getArchivoPreviewUrl,
    getOpcionDocumentoFija,
    getPreguntaFechaAsociada,
    calcularVigenciaDocumento,
    calcularEstadoAnioDocumento,
    representanteLegal,
    clienteInfo,
    numeroSolicitud,
  } = props;

  const preguntaPadre = pregunta.fp_pregunta_padre_id
    ? preguntas.find((p) => p.fp_id === pregunta.fp_pregunta_padre_id)
    : null;
  const esFechaHijaDeArchivo =
    pregunta.fp_tipo === "FECHA" && preguntaPadre?.fp_tipo === "ARCHIVO";
  if (esFechaHijaDeArchivo) return null;

  const preguntaFechaAsociada = getPreguntaFechaAsociada(pregunta);

  const documentoVinculado = pregunta.fp_tipo_documento_id
    ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
    : null;
  const requiereFechaAsociada =
    !documentoVinculado || documentoVinculado.tdo_vigencia_dias !== null;
  const shouldShowFechaAsociada = preguntaFechaAsociada
    ? shouldShowQuestionForCurrentUser(preguntaFechaAsociada) &&
      requiereFechaAsociada
    : false;

  const rules = getValidationRules(pregunta);
  const hasError = errors[pregunta.fp_id];
  const isLockedPrefillField = lockedPrefillFieldIds[pregunta.fp_id] === true;
  const isPrefilledField = prefilledFieldIds[pregunta.fp_id] === true;

  return (
    <div
      key={pregunta.fp_id}
      className={
        ["NOTA", "FECHA_HORA_ACTUAL"].includes(pregunta.fp_tipo) ||
        pregunta.fp_ancho_completo
          ? "md:col-span-3"
          : undefined
      }
    >
      {!["NOTA", "FECHA_HORA_ACTUAL"].includes(
        pregunta.fp_tipo,
      ) && (
        <>
          <label className="block text-xs font-medium mb-1">
            {pregunta.fp_descripcion}
            {pregunta.fp_requerida && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {pregunta.fp_descripcion_adicional?.trim() &&
            !["SELECT_CONDICIONAL", "DOCUMENTOS_TABLA"].includes(pregunta.fp_tipo) && (
              <p className="mb-1 text-xs text-slate-600 leading-relaxed">
                {pregunta.fp_descripcion_adicional.trim()}
              </p>
            )}
        </>
      )}

      {pregunta.fp_tipo === "NOTA" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-2 py-2">
          {(() => {
            const nota = getNotaDisplay(pregunta);
            return (
              <>
                {nota.titulo && (
                  <p className="text-xs font-semibold text-blue-950 leading-tight">
                    {nota.titulo}
                  </p>
                )}
                {nota.subtitulo && (
                  <p className="mt-0.5 text-xs font-medium text-blue-900">
                    {nota.subtitulo}
                  </p>
                )}
                {nota.cuerpo && (
                  <p className="mt-1 text-xs text-blue-900 whitespace-pre-wrap break-words leading-relaxed text-justify">
                    {nota.cuerpo}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {pregunta.fp_tipo === "FECHA_HORA_ACTUAL" && (
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-2 py-1 shadow-sm text-xs">
            <span className="font-semibold uppercase tracking-tight text-indigo-700">
              Fecha y hora
            </span>
            <span className="h-3 w-px bg-indigo-200" />
            <span className="font-semibold text-indigo-900 tabular-nums">
              {fechaHoraActualFormateada}
            </span>
          </div>
        </div>
      )}

      {pregunta.fp_tipo === "TEXTO" && pregunta.fp_subtipo === "PARRAFO" && (
        <textarea
          rows={4}
          disabled={readOnly || isLockedPrefillField}
          value={respuestas[pregunta.fp_id]?.valor_texto || ""}
          onChange={(e) =>
            handleInputChange(pregunta.fp_id, e.target.value, "TEXTO")
          }
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-2 py-1 text-sm resize-y overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          } ${isLockedPrefillField ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
        />
      )}

      {pregunta.fp_tipo === "TEXTO" && pregunta.fp_subtipo !== "PARRAFO" && (
        <input
          type="text"
          disabled={readOnly || isLockedPrefillField}
          value={respuestas[pregunta.fp_id]?.valor_texto || ""}
          onChange={(e) =>
            handleInputChange(pregunta.fp_id, e.target.value, "TEXTO")
          }
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          } ${isLockedPrefillField ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
        />
      )}

      {pregunta.fp_tipo === "NUMERO" && pregunta.fp_subtipo === "MONEDA" && (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-500">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={
              respuestas[pregunta.fp_id]?.valor_numero
                ? Number(
                    respuestas[pregunta.fp_id]?.valor_numero,
                  ).toLocaleString("es-CO")
                : ""
            }
            onChange={(e) => {
              const soloDigitos = e.target.value.replace(/\D/g, "");
              handleInputChange(
                pregunta.fp_id,
                soloDigitos ? Number(soloDigitos) : "",
                "NUMERO",
              );
            }}
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded pl-5 pr-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>
      )}

      {pregunta.fp_tipo === "NUMERO" && pregunta.fp_subtipo === "DIA_MES" && (
        <select
          value={respuestas[pregunta.fp_id]?.valor_numero || ""}
          onChange={(e) =>
            handleInputChange(
              pregunta.fp_id,
              e.target.value ? Number(e.target.value) : "",
              "NUMERO",
            )
          }
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Selecciona un día</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </select>
      )}

      {pregunta.fp_tipo === "NUMERO" &&
        pregunta.fp_subtipo !== "MONEDA" &&
        pregunta.fp_subtipo !== "DIA_MES" && (
          <input
            type="number"
            value={respuestas[pregunta.fp_id]?.valor_numero || ""}
            onChange={(e) =>
              handleInputChange(pregunta.fp_id, e.target.value, "NUMERO")
            }
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}

      {pregunta.fp_tipo === "FECHA" && (
        <input
          type="date"
          value={respuestas[pregunta.fp_id]?.valor_fecha || ""}
          onChange={(e) =>
            handleInputChange(pregunta.fp_id, e.target.value, "FECHA")
          }
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}

      {pregunta.fp_tipo === "DOCUMENTOS_TABLA" && (() => {
        const preguntaFechaAsociada =
          seccionPreguntas.find(
            (p) => p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === pregunta.fp_id,
          ) || null;
        return (
          <DocumentoTablaField
            pregunta={pregunta}
            respuestas={respuestas}
            archivosExistentes={archivosExistentes}
            documentosCatalogoMap={documentosCatalogoMap}
            readOnly={readOnly}
            solicitudId={solicitudId}
            hasError={hasError}
            rules={rules}
            preguntaFechaAsociada={preguntaFechaAsociada}
            handleInputChange={handleInputChange}
            setRespuestas={setRespuestas}
            setArchivosExistentes={setArchivosExistentes}
            setSuccessMessage={setSuccessMessage}
            setErrorMessage={setErrorMessage}
            validateField={validateField}
            getArchivoPreviewUrl={getArchivoPreviewUrl}
            getOpcionDocumentoFija={getOpcionDocumentoFija}
            calcularVigenciaDocumento={calcularVigenciaDocumento}
            calcularEstadoAnioDocumento={calcularEstadoAnioDocumento}
            representanteLegal={representanteLegal}
            clienteInfo={clienteInfo}
            numeroSolicitud={numeroSolicitud}
          />
        );
      })()}

      {((pregunta.fp_tipo === "SELECT" && pregunta.fp_subtipo !== "CHECK") ||
        ["SELECT_CONDICIONAL", "SELECT_TABLA"].includes(pregunta.fp_tipo)) && (
        <>
          <SearchableSelect
            options={
              pregunta.fp_id === maestroPreguntaIds.paisId && Array.isArray(paises)
                ? paises.map((pais: any) => ({
                    id: String(pais.pais_id),
                    label: pais.pais_nombre,
                  }))
                : pregunta.fp_id === maestroPreguntaIds.departamentoId &&
                    Array.isArray(departamentos)
                  ? departamentos.map((depto: any) => ({
                      id: String(depto.depto_id),
                      label: depto.depto_nombre,
                    }))
                  : pregunta.fp_id === maestroPreguntaIds.ciudadId &&
                      Array.isArray(ciudades)
                    ? ciudades.map((ciudad: any) => ({
                        id: String(ciudad.ciudad_id),
                        label: ciudad.ciudad_nombre,
                      }))
                    : pregunta.opciones?.map((opcion: any) => {
                        const id = opcion.op_id ?? opcion.fpo_id;
                        const label =
                          opcion.op_descripcion ?? opcion.fpo_valor;
                        return {
                          id: String(id),
                          label,
                        };
                      }) || []
            }
            value={String(
              pregunta.fp_tipo === "SELECT_TABLA"
                ? respuestas[pregunta.fp_id]?.valor_numero || ""
                : respuestas[pregunta.fp_id]?.valor_opcion_id || ""
            )}
            onChange={(value) =>
              handleInputChange(
                pregunta.fp_id,
                Number(value) || value,
                pregunta.fp_tipo,
              )
            }
            placeholder="Selecciona una opción"
            disabled={readOnly || isLockedPrefillField}
          />
          {readOnly && pregunta.fp_codigo === "TIPO_SOLICITUD" && (
            <p className="mt-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
              El tipo de solicitud se define automáticamente según tu historial de solicitudes.
            </p>
          )}
        </>
      )}

      {(pregunta.fp_tipo === "MULTISELECT" ||
        (pregunta.fp_tipo === "SELECT" && pregunta.fp_subtipo === "CHECK")) && (
        <div className="space-y-1 border border-gray-300 rounded p-2 text-sm">
          {(() => {
            const esSeleccionUnica = pregunta.fp_tipo === "SELECT";
            return pregunta.opciones?.map((opcion: any) => {
              const id = Number(opcion.op_id ?? opcion.fpo_id);
              const label = opcion.op_descripcion ?? opcion.fpo_valor;
              const valorOpcionId = respuestas[pregunta.fp_id]?.valor_opcion_id;
              const opcionesSeleccionadas: number[] = Array.isArray(valorOpcionId)
                ? valorOpcionId.map((v) => Number(v))
                : (valorOpcionId ? [Number(valorOpcionId)] : []);

              return (
                <label key={id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={opcionesSeleccionadas.includes(id)}
                    onChange={(e) => {
                      const nuevoValor = esSeleccionUnica
                        ? e.target.checked
                          ? id
                          : undefined
                        : e.target.checked
                          ? [...opcionesSeleccionadas, id]
                          : opcionesSeleccionadas.filter((sid) => sid !== id);

                      setRespuestas((prev: any) => ({
                        ...prev,
                        [pregunta.fp_id]: {
                          ...prev[pregunta.fp_id],
                          valor_opcion_id: nuevoValor,
                        },
                      }));
                    }}
                    disabled={readOnly || isLockedPrefillField}
                    className={readOnly && pregunta.fp_codigo === "TIPO_SOLICITUD" ? "accent-blue-600" : ""}
                  />
                  <span className="text-xs">{label}</span>
                </label>
              );
            });
          })()}
        </div>
      )}

      {pregunta.fp_tipo === "TABLA" && (
        <TablaField
          pregunta={pregunta}
          preguntas={preguntas}
          respuestas={respuestas}
          readOnly={readOnly || isLockedPrefillField}
          handleInputChange={handleInputChange}
        />
      )}

      {pregunta.fp_tipo === "ARCHIVO" && (
        <ArchivoField
          pregunta={pregunta}
          respuestas={respuestas}
          archivosExistentes={archivosExistentes}
          documentosCatalogoMap={documentosCatalogoMap}
          errors={errors}
          readOnly={readOnly}
          solicitudId={solicitudId}
          hasError={hasError}
          preguntaFechaAsociada={preguntaFechaAsociada}
          shouldShowFechaAsociada={shouldShowFechaAsociada}
          handleInputChange={handleInputChange}
          setRespuestas={setRespuestas}
          validateField={validateField}
          getValidationRules={getValidationRules}
          getArchivoPreviewUrl={getArchivoPreviewUrl}
          setArchivosExistentes={setArchivosExistentes}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
          calcularVigenciaDocumento={calcularVigenciaDocumento}
          calcularEstadoAnioDocumento={calcularEstadoAnioDocumento}
        />
      )}

      {pregunta.fp_tipo === "IMAGEN" && (
        <ImagenField
          pregunta={pregunta}
          respuestas={respuestas}
          archivosExistentes={archivosExistentes}
          hasError={hasError}
          readOnly={readOnly}
          solicitudId={solicitudId}
          handleInputChange={handleInputChange}
          getArchivoPreviewUrl={getArchivoPreviewUrl}
          setArchivosExistentes={setArchivosExistentes}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {isPrefilledField &&
        ["TEXTO", "SELECT", "SELECT_CONDICIONAL", "SELECT_TABLA"].includes(
          pregunta.fp_tipo,
        ) && (
          <p className="mt-1 text-xs text-sky-700 font-medium">
            {prefillSourceByFieldId[pregunta.fp_id] === "ultimoFormulario"
              ? "Precargado desde el ultimo formulario diligenciado"
              : "Precargado desde datos del cliente"}
          </p>
        )}

      {pregunta.fp_tipo === "SELECT_CONDICIONAL" &&
        shouldShowConditionalField(pregunta) && (
          <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
            <label className="block text-xs font-medium mb-1">
              {pregunta.fp_descripcion_adicional}
            </label>
            <input
              type="text"
              value={respuestas[pregunta.fp_id]?.valor_texto || ""}
              onChange={(e) =>
                setRespuestas((prev: any) => ({
                  ...prev,
                  [pregunta.fp_id]: {
                    ...prev[pregunta.fp_id],
                    valor_texto: e.target.value,
                  },
                }))
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

      {!readOnly && hasError && (
        <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
          <AlertTriangle className="h-4 w-4" />
          {hasError}
        </div>
      )}
    </div>
  );
}
