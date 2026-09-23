import { getTipoSolicitud, TIPO_SOLICITUD_BADGE_CLASS } from "@/lib/tipo-solicitud.util";

// Etiqueta corta para tablas anchas donde la columna "Tipo" no debe crecer.
const TIPO_CORTO: Record<string, string> = {
  "Ampliación de Cupo": "Ampliación",
  "Cliente Nuevo": "Nuevo",
};

export function TipoSolicitudBadge({
  esAmpliacionCupo,
  corto = false,
}: {
  esAmpliacionCupo?: boolean | number | null;
  /** Muestra "Ampliación"/"Nuevo"; el nombre completo queda en el tooltip. */
  corto?: boolean;
}) {
  const tipo = getTipoSolicitud(esAmpliacionCupo);
  return (
    <span
      title={corto ? tipo : undefined}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${TIPO_SOLICITUD_BADGE_CLASS[tipo]}`}
    >
      {corto ? TIPO_CORTO[tipo] : tipo}
    </span>
  );
}
