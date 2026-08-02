import { DollarSign } from "lucide-react";

interface AmpliacionCupoResumenProps {
  cupoActualReferencia?: number | string | null;
  cupoSolicitado?: number | string | null;
  justificacion?: string | null;
  consumoMensualProyectado?: number | string | null;
  toneladasProyectadas?: number | string | null;
}

function formatMonto(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "-";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return "-";
  return `$${numero.toLocaleString("es-CO")}`;
}

function formatToneladas(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "-";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return "-";
  return `${numero.toLocaleString("es-CO")} Ton`;
}

// Solicitudes de "Ampliación de Cupo" creadas por el Ejecutivo de Negocios
// (FRONTEND/src/app/solicitudes/solicitud-ampliacion-cupo) no pasan por el
// formulario normal ni por "Registrar Concepto" — por eso los bloques
// "Solicita cupo de crédito" / "Concepto del ejecutivo" (basados en
// respuestas de formulario) siempre salen vacíos para ellas. Este bloque
// muestra en su lugar los datos reales, que sí quedan guardados
// directamente en la solicitud (sol_cupo_solicitado,
// sol_justificacion_ampliacion, sol_cupo_actual_referencia).
export function AmpliacionCupoResumen({
  cupoActualReferencia,
  cupoSolicitado,
  justificacion,
  consumoMensualProyectado,
  toneladasProyectadas,
}: AmpliacionCupoResumenProps) {
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50/60 p-5">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-emerald-800 mb-3 flex items-center gap-1.5">
        <DollarSign className="h-4 w-4" />
        Ampliación de Cupo solicitada
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
            Cupo actual (referencia)
          </p>
          <p className="text-[13.5px] font-bold text-gray-900 m-0">
            {formatMonto(cupoActualReferencia)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
            Nuevo cupo solicitado
          </p>
          <p className="text-base font-extrabold text-emerald-900 m-0">
            {formatMonto(cupoSolicitado)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
            Consumo mensual proyectado
          </p>
          <p className="text-[13.5px] font-bold text-gray-900 m-0">
            {formatMonto(consumoMensualProyectado)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
            Toneladas mensuales proyectadas
          </p>
          <p className="text-[13.5px] font-bold text-gray-900 m-0">
            {formatToneladas(toneladasProyectadas)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">
        Justificación
      </p>
      <p className="text-[12.5px] text-gray-700 m-0 whitespace-pre-wrap">
        {justificacion || "-"}
      </p>
    </div>
  );
}
