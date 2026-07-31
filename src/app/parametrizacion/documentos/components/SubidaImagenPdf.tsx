"use client";

import { Upload } from "lucide-react";

interface Props {
  imagenUrl: string | null;
  tipoDocumentoId?: number;
  subiendo: boolean;
  onSubir: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Texto alt de la vista previa, ej. "Encabezado actual" / "Pie de página actual". */
  altPreview: string;
  /** Ej. "imagen de encabezado" / "imagen de pie de página" — se usa en el
   * botón ("Subir {etiqueta}") y en el mensaje de "guardá primero". */
  etiqueta: string;
}

/**
 * Widget de subida de imagen (vista previa + botón + input file oculto),
 * compartido entre "Tipo de encabezado" y "Tipo de pie de página" en
 * DocumentosForm.tsx — ambos suben una imagen que reemplaza esa banda del
 * PDF, con el mismo patrón de "guardá el documento primero" cuando todavía
 * no existe tipoDocumentoId.
 */
export function SubidaImagenPdf({
  imagenUrl,
  tipoDocumentoId,
  subiendo,
  onSubir,
  altPreview,
  etiqueta,
}: Props) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3">
      {imagenUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagenUrl}
          alt={altPreview}
          className="mb-2 max-h-20 rounded border border-slate-200 bg-white object-contain"
        />
      )}
      {tipoDocumentoId ? (
        <label
          className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 px-4 py-2 text-xs font-medium text-blue-700 cursor-pointer hover:bg-blue-50 ${
            subiendo ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload size={14} />
          {subiendo
            ? "Subiendo..."
            : imagenUrl
              ? "Reemplazar imagen"
              : `Subir ${etiqueta}`}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onSubir}
            disabled={subiendo}
          />
        </label>
      ) : (
        <p className="text-xs text-slate-500">
          Guardá el documento primero (botón "Guardar" de más abajo) para
          poder subir la {etiqueta}.
        </p>
      )}
    </div>
  );
}
