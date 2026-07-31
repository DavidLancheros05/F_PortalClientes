"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { SubidaImagenPdf } from "./SubidaImagenPdf";

interface Props {
  registerProps: UseFormRegisterReturn;
  piePaginaTipo: string;
  registerTextoProps: UseFormRegisterReturn;
  piePaginaImagenUrl: string | null;
  tipoDocumentoId?: number;
  subiendoPiePagina: boolean;
  onSubirImagen: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Selector de "Tipo de pie de página" (Ninguno / Texto fijo / Imagen
 * propia) para documentos CLIENTE+TEXTO — mismo patrón que
 * SelectorEncabezadoTipo.tsx, pero con una opción "Texto" que trae un
 * campo de texto propio en vez de una tabla de formato oficial.
 */
export function SelectorPiePaginaTipo({
  registerProps,
  piePaginaTipo,
  registerTextoProps,
  piePaginaImagenUrl,
  tipoDocumentoId,
  subiendoPiePagina,
  onSubirImagen,
}: Props) {
  return (
    <>
      <select
        {...registerProps}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="NINGUNO">Ninguno</option>
        <option value="TEXTO">Texto fijo</option>
        <option value="IMAGEN">Imagen propia</option>
      </select>

      {piePaginaTipo === "TEXTO" && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Texto del pie de página
          </label>
          <input
            type="text"
            {...registerTextoProps}
            placeholder="Ej. Documento generado electrónicamente · Cartonera Nacional S.A."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {piePaginaTipo === "IMAGEN" && (
        <div className="mt-3">
          <SubidaImagenPdf
            imagenUrl={piePaginaImagenUrl}
            tipoDocumentoId={tipoDocumentoId}
            subiendo={subiendoPiePagina}
            onSubir={onSubirImagen}
            altPreview="Pie de página actual"
            etiqueta="imagen de pie de página"
          />
        </div>
      )}
    </>
  );
}
