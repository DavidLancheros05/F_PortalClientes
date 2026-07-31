"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { SubidaImagenPdf } from "./SubidaImagenPdf";

interface Props {
  /** Si se ofrece la opción "Formato oficial" (tabla logo/código/página/
   * revisión) — hoy solo implementada en el motor pdf-lib de documentos
   * CLIENTE+TEXTO, no en el pdfkit de CARTA_APROBACION. */
  mostrarFormatoOficial: boolean;
  registerProps: UseFormRegisterReturn;
  encabezadoTipo: string;
  encabezadoImagenUrl: string | null;
  tipoDocumentoId?: number;
  subiendoEncabezado: boolean;
  onSubirImagen: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Selector de "Tipo de encabezado" + widget de subida de imagen propia,
 * compartido entre el bloque CARTA_APROBACION (2 opciones) y el bloque
 * CLIENTE+TEXTO (3 opciones) de DocumentosForm.tsx — la única diferencia
 * real entre ambos es si se ofrece "Formato oficial".
 */
export function SelectorEncabezadoTipo({
  mostrarFormatoOficial,
  registerProps,
  encabezadoTipo,
  encabezadoImagenUrl,
  tipoDocumentoId,
  subiendoEncabezado,
  onSubirImagen,
}: Props) {
  return (
    <>
      <select
        {...registerProps}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="NINGUNO">Ninguno (membrete de texto simple)</option>
        {mostrarFormatoOficial && (
          <option value="FORMATO_OFICIAL">
            Formato oficial (tabla con código, página y revisión)
          </option>
        )}
        <option value="IMAGEN">Imagen propia</option>
      </select>

      {encabezadoTipo === "IMAGEN" && (
        <SubidaImagenPdf
          imagenUrl={encabezadoImagenUrl}
          tipoDocumentoId={tipoDocumentoId}
          subiendo={subiendoEncabezado}
          onSubir={onSubirImagen}
          altPreview="Encabezado actual"
          etiqueta="imagen de encabezado"
        />
      )}
    </>
  );
}
