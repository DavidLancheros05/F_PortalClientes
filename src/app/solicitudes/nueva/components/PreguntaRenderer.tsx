"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback } from "react";
import { SearchableSelect } from "@/components/FormularioUI/SearchableSelect";
import { ArchivoField } from "./ArchivoField";
import { ArchivoMultipleField } from "./ArchivoMultipleField";
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
  documentosCatalogoMap: Record<number, any>;
  // Opciones de catálogo para preguntas SELECT_TABLA cuyo catálogo depende
  // de la respuesta de otra pregunta (fp_catalogo_filtro_pregunta_id) — ver
  // useCatalogoDependiente. Vacío/ausente para preguntas sin esa
  // dependencia configurada, que siguen usando `pregunta.opciones` normal.
  catalogoDependienteMap?: Record<number, any[]>;
  archivosExistentes: Record<number, any>;
  documentosClienteMap: Record<number, any>;
  maestroPreguntaIds: {
    paisId?: number;
    departamentoId?: number;
    ciudadId?: number;
  };
  paises: any[];
  departamentos: any[];
  ciudades: any[];
  fechaHoraActualFormateada: string;
  // Cupo ya aprobado del cliente — se muestra como referencia junto a la
  // pregunta CUPO_SOLICITADO en una Ampliación de Cupo. null si no aplica
  // (ej. Cliente Nuevo).
  cupoActualAprobado?: number | null;
  setRespuestas: Dispatch<SetStateAction<RespuestasState>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
  shouldShowQuestion: (pregunta: FormularioPregunta) => boolean;
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
    catalogoDependienteMap,
    respuestas,
    errors,
    readOnly,
    solicitudId,
    archivosExistentes,
    documentosClienteMap = {},
    maestroPreguntaIds,
    paises,
    departamentos,
    ciudades,
    fechaHoraActualFormateada,
    setRespuestas,
    setArchivosExistentes,
    setSuccessMessage,
    setErrorMessage,
    shouldShowQuestion,
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
    cupoActualAprobado,
  } = props;

  // Crece con el contenido en vez de quedar de una sola línea — útil para
  // respuestas cortas que a veces son largas (direcciones, por ejemplo).
  // useCallback con deps vacías mantiene la misma referencia entre renders
  // de esta instancia, así el ref solo corre al montar (tamaño inicial de
  // un valor precargado), no en cada render de TODO el formulario.
  const ajustarAlturaTextoLibre = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const preguntaPadre = pregunta.fp_pregunta_padre_id
    ? preguntas.find((p) => p.fp_id === pregunta.fp_pregunta_padre_id)
    : null;
  const esFechaHijaDeArchivo = pregunta.fp_tipo === "FECHA" && preguntaPadre?.fp_tipo === "ARCHIVO";
  if (esFechaHijaDeArchivo) return null;

  const preguntaFechaAsociada = getPreguntaFechaAsociada(pregunta);

  const documentoVinculado = pregunta.fp_tdo_id ? documentosCatalogoMap[pregunta.fp_tdo_id] : null;
  const requiereFechaAsociada = !documentoVinculado || documentoVinculado.tdo_vigencia_dias !== null;
  const shouldShowFechaAsociada = preguntaFechaAsociada
    ? shouldShowQuestion(preguntaFechaAsociada) && requiereFechaAsociada
    : false;

  const rules = getValidationRules(pregunta);
  const hasError = errors[pregunta.fp_id];

  // El ancho lo decide `fp_ancho_columnas` (1/2/3, configurable por pregunta
  // desde Parametrización) — NOTA y FECHA_HORA_ACTUAL son los únicos tipos
  // forzados a ancho completo siempre, porque no tiene sentido mostrarlos a
  // 1/3 de columna.
  const anchoColumnas = ["NOTA", "FECHA_HORA_ACTUAL"].includes(pregunta.fp_tipo)
    ? 3
    : (pregunta.fp_ancho_columnas ?? 1);
  const anchoClassName = anchoColumnas === 3 ? "md:col-span-3" : anchoColumnas === 2 ? "md:col-span-2" : "";

  return (
    <div key={pregunta.fp_id} className={anchoClassName}>
      {!["NOTA", "FECHA_HORA_ACTUAL", "DOCUMENTOS_TABLA", "ARCHIVO"].includes(pregunta.fp_tipo) && (
        <>
          <label className="block text-xs font-medium text-gray-800 mb-1">
            {pregunta.fp_descripcion}
            {pregunta.fp_requerida && <span className="text-red-500 ml-1">*</span>}
          </label>
          {pregunta.fp_descripcion_adicional?.trim() && pregunta.fp_tipo !== "SELECT_CONDICIONAL" && (
            <p className="mb-1 text-[11px] text-slate-600 leading-relaxed">
              {pregunta.fp_descripcion_adicional.trim()}
            </p>
          )}
          {pregunta.fp_codigo === "CUPO_SOLICITADO" && cupoActualAprobado && (
            <p className="mb-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Cupo actual: ${cupoActualAprobado.toLocaleString("es-CO")} — el nuevo cupo debe ser mayor a este valor.
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
                {nota.titulo && <p className="text-[11px] font-semibold text-blue-950 leading-tight">{nota.titulo}</p>}
                {nota.subtitulo && <p className="mt-0.5 text-[11px] font-medium text-blue-900">{nota.subtitulo}</p>}
                {nota.cuerpo && (
                  <p className="mt-1 text-[11px] text-blue-900 whitespace-pre-wrap break-words leading-relaxed text-justify">
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
          <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-2 py-1 shadow-sm text-[11px]">
            <span className="font-semibold uppercase tracking-tight text-indigo-700">Fecha y hora</span>
            <span className="h-3 w-px bg-indigo-200" />
            <span className="font-semibold text-indigo-900 tabular-nums">{fechaHoraActualFormateada}</span>
          </div>
        </div>
      )}

      {pregunta.fp_tipo === "TEXTO" && pregunta.fp_subtipo === "PARRAFO" && (
        <textarea
          rows={4}
          disabled={readOnly}
          value={respuestas[pregunta.fp_id]?.valor_texto || ""}
          onChange={(e) => handleInputChange(pregunta.fp_id, e.target.value, "TEXTO")}
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-3 py-1.5 text-sm resize-y overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}

      {pregunta.fp_tipo === "TEXTO" && pregunta.fp_subtipo !== "PARRAFO" && (
        <textarea
          ref={ajustarAlturaTextoLibre}
          rows={1}
          disabled={readOnly}
          value={respuestas[pregunta.fp_id]?.valor_texto || ""}
          onChange={(e) => {
            handleInputChange(pregunta.fp_id, e.target.value, "TEXTO");
            ajustarAlturaTextoLibre(e.target);
          }}
          onKeyDown={(e) => {
            // Sigue siendo una respuesta de una sola línea (como el <input>
            // que reemplaza) — el textarea solo se usa para que crezca con
            // el ancho disponible, no para permitir saltos de línea manuales.
            if (e.key === "Enter") e.preventDefault();
          }}
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-3 py-1.5 text-sm resize-none overflow-hidden leading-normal focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}

      {pregunta.fp_tipo === "NUMERO" && pregunta.fp_subtipo === "MONEDA" && (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-gray-500">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={
              respuestas[pregunta.fp_id]?.valor_numero
                ? Number(respuestas[pregunta.fp_id]?.valor_numero).toLocaleString("es-CO")
                : ""
            }
            onChange={(e) => {
              const soloDigitos = e.target.value.replace(/\D/g, "");
              handleInputChange(pregunta.fp_id, soloDigitos ? Number(soloDigitos) : "", "NUMERO");
            }}
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded pl-6 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>
      )}

      {pregunta.fp_tipo === "NUMERO" && pregunta.fp_subtipo === "DIA_MES" && (
        <select
          value={respuestas[pregunta.fp_id]?.valor_numero || ""}
          onChange={(e) => handleInputChange(pregunta.fp_id, e.target.value ? Number(e.target.value) : "", "NUMERO")}
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}>
          <option value="">Selecciona un día</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </select>
      )}

      {pregunta.fp_tipo === "NUMERO" &&
        pregunta.fp_subtipo === "DURACION_ANIOS_MESES" &&
        (() => {
          const totalMeses = respuestas[pregunta.fp_id]?.valor_numero;
          const anios = totalMeses !== undefined && totalMeses !== null ? Math.floor(totalMeses / 12) : "";
          const meses = totalMeses !== undefined && totalMeses !== null ? totalMeses % 12 : "";
          const actualizarTotal = (nuevoAnios: number | "", nuevoMeses: number | "") => {
            if (nuevoAnios === "" && nuevoMeses === "") {
              handleInputChange(pregunta.fp_id, "", "NUMERO");
              return;
            }
            const total = (nuevoAnios || 0) * 12 + (nuevoMeses || 0);
            handleInputChange(pregunta.fp_id, total, "NUMERO");
          };
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  placeholder="Años"
                  value={anios}
                  onChange={(e) => actualizarTotal(e.target.value === "" ? "" : Number(e.target.value), meses)}
                  onBlur={() => validateField(pregunta.fp_id, rules)}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hasError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <span className="mt-0.5 block text-[11px] text-gray-500">Años</span>
              </div>
              <div className="flex-1">
                <select
                  value={meses}
                  onChange={(e) => actualizarTotal(anios, e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => validateField(pregunta.fp_id, rules)}
                  className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hasError ? "border-red-500" : "border-gray-300"
                  }`}>
                  <option value="">Meses</option>
                  {Array.from({ length: 12 }, (_, i) => i).map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
                <span className="mt-0.5 block text-[11px] text-gray-500">Meses</span>
              </div>
            </div>
          );
        })()}

      {pregunta.fp_tipo === "NUMERO" &&
        pregunta.fp_subtipo !== "MONEDA" &&
        pregunta.fp_subtipo !== "DIA_MES" &&
        pregunta.fp_subtipo !== "DURACION_ANIOS_MESES" && (
          <input
            type="number"
            value={respuestas[pregunta.fp_id]?.valor_numero || ""}
            onChange={(e) => handleInputChange(pregunta.fp_id, e.target.value, "NUMERO")}
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}

      {pregunta.fp_tipo === "FECHA" && (
        <input
          type="date"
          value={respuestas[pregunta.fp_id]?.valor_fecha || ""}
          onChange={(e) => handleInputChange(pregunta.fp_id, e.target.value, "FECHA")}
          onBlur={() => validateField(pregunta.fp_id, rules)}
          className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          }`}
        />
      )}

      {pregunta.fp_tipo === "DOCUMENTOS_TABLA" &&
        (() => {
          const preguntaFechaAsociada =
            seccionPreguntas.find((p) => p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === pregunta.fp_id) || null;
          return (
            <DocumentoTablaField
              pregunta={pregunta}
              respuestas={respuestas}
              archivosExistentes={archivosExistentes}
              documentosCatalogoMap={documentosCatalogoMap}
              documentoClienteDisponible={pregunta.fp_tdo_id ? documentosClienteMap[pregunta.fp_tdo_id] : undefined}
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
              pregunta.fp_catalogo_filtro_pregunta_id
                ? (catalogoDependienteMap?.[pregunta.fp_id] || []).map((opcion: any) => ({
                    id: String(opcion.op_id ?? opcion.fpo_id),
                    label: opcion.op_descripcion ?? opcion.fpo_valor,
                  }))
                : pregunta.fp_id === maestroPreguntaIds.paisId && Array.isArray(paises)
                  ? paises.map((pais: any) => ({
                      id: String(pais.pais_id),
                      label: pais.pais_nombre,
                    }))
                  : pregunta.fp_id === maestroPreguntaIds.departamentoId && Array.isArray(departamentos)
                    ? departamentos.map((depto: any) => ({
                        id: String(depto.depto_id),
                        label: depto.depto_nombre,
                      }))
                    : pregunta.fp_id === maestroPreguntaIds.ciudadId && Array.isArray(ciudades)
                      ? ciudades.map((ciudad: any) => ({
                          id: String(ciudad.ciudad_id),
                          label: ciudad.ciudad_nombre,
                        }))
                      : pregunta.opciones?.map((opcion: any) => {
                          const id = opcion.op_id ?? opcion.fpo_id;
                          const label = opcion.op_descripcion ?? opcion.fpo_valor;
                          return {
                            id: String(id),
                            label,
                          };
                        }) || []
            }
            value={String(
              pregunta.fp_tipo === "SELECT_TABLA"
                ? respuestas[pregunta.fp_id]?.valor_numero || ""
                : respuestas[pregunta.fp_id]?.valor_opcion_id || "",
            )}
            onChange={(value) => handleInputChange(pregunta.fp_id, Number(value) || value, pregunta.fp_tipo)}
            placeholder="Selecciona una opción"
            disabled={readOnly}
          />
          {readOnly && pregunta.fp_codigo === "TIPO_SOLICITUD" && (
            <p className="mt-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
              El tipo de solicitud se define automáticamente según tu historial de solicitudes.
            </p>
          )}
        </>
      )}

      {(pregunta.fp_tipo === "MULTISELECT" || (pregunta.fp_tipo === "SELECT" && pregunta.fp_subtipo === "CHECK")) && (
        <div className="space-y-1 border border-gray-300 rounded p-2 text-sm">
          {(() => {
            const esSeleccionUnica = pregunta.fp_tipo === "SELECT";
            return pregunta.opciones?.map((opcion: any) => {
              const id = Number(opcion.op_id ?? opcion.fpo_id);
              const label = opcion.op_descripcion ?? opcion.fpo_valor;
              const valorOpcionId = respuestas[pregunta.fp_id]?.valor_opcion_id;
              const opcionesSeleccionadas: number[] = Array.isArray(valorOpcionId)
                ? valorOpcionId.map((v) => Number(v))
                : valorOpcionId
                  ? [Number(valorOpcionId)]
                  : [];

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
                    disabled={readOnly}
                    className={readOnly && pregunta.fp_codigo === "TIPO_SOLICITUD" ? "accent-blue-600" : ""}
                  />
                  <span className="text-sm">{label}</span>
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
          readOnly={readOnly}
          handleInputChange={handleInputChange}
        />
      )}

      {pregunta.fp_tipo === "ARCHIVO" && Number(pregunta.fp_maximo) > 1 && (
        <ArchivoMultipleField
          pregunta={pregunta}
          respuestas={respuestas}
          archivosExistentes={archivosExistentes}
          errors={errors}
          readOnly={readOnly}
          solicitudId={solicitudId}
          hasError={hasError}
          setRespuestas={setRespuestas}
          getArchivoPreviewUrl={getArchivoPreviewUrl}
          setArchivosExistentes={setArchivosExistentes}
          setSuccessMessage={setSuccessMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {pregunta.fp_tipo === "ARCHIVO" && !(Number(pregunta.fp_maximo) > 1) && (
        <ArchivoField
          pregunta={pregunta}
          respuestas={respuestas}
          archivosExistentes={archivosExistentes}
          documentosCatalogoMap={documentosCatalogoMap}
          documentoClienteDisponible={pregunta.fp_tdo_id ? documentosClienteMap[pregunta.fp_tdo_id] : undefined}
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

      {pregunta.fp_tipo === "SELECT_CONDICIONAL" && shouldShowConditionalField(pregunta) && (
        <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
          <label className="block text-[11px] font-medium mb-1">{pregunta.fp_descripcion_adicional}</label>
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
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {!readOnly && hasError && (
        <div className="flex items-center gap-1 text-red-500 text-[11px] mt-1">
          <AlertTriangle className="h-4 w-4" />
          {hasError}
        </div>
      )}
    </div>
  );
}
