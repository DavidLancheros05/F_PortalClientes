import { getTipoSolicitud, TIPO_SOLICITUD_BADGE_CLASS } from "@/lib/tipo-solicitud.util";

export function TipoSolicitudBadge({
  esAmpliacionCupo,
}: {
  esAmpliacionCupo?: boolean | number | null;
}) {
  const tipo = getTipoSolicitud(esAmpliacionCupo);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${TIPO_SOLICITUD_BADGE_CLASS[tipo]}`}
    >
      {tipo}
    </span>
  );
}
