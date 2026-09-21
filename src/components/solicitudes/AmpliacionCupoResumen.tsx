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
    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-emerald-800 mb-3 flex items-center gap-1.5">
        <DollarSign className="h-3.5 w-3.5" />
        Ampliación de Cupo solicitada
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-xl p-3 border border-emerald-200 text-center">
          <p className="text-[9px] text-[#94a3b8] uppercase tracking-wider mb-0.5 font-semibold">
            Cupo actual (referencia)
          </p>
          <p className="text-[12px] font-bold text-[#475569] m-0">
            {formatMonto(cupoActualReferencia)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border-2 border-emerald-300 text-center">
          <p className="text-[9px] text-emerald-700 uppercase tracking-wider mb-0.5 font-semibold">
            Nuevo cupo solicitado
          </p>
          <p className="text-[16px] font-extrabold text-emerald-700 m-0">
            {formatMonto(cupoSolicitado)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-0.5 font-semibold">
            Consumo mensual proyectado
          </p>
          <p className="text-[13px] font-bold text-[#0f172a] m-0">
            {formatMonto(consumoMensualProyectado)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-0.5 font-semibold">
            Toneladas mensuales proyectadas
          </p>
          <p className="text-[13px] font-bold text-[#0f172a] m-0">
            {formatToneladas(toneladasProyectadas)}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-0.5 font-semibold">
        Justificación
      </p>
      <p className="text-[11.5px] text-[#475569] m-0 whitespace-pre-wrap leading-relaxed">
        {justificacion || "-"}
      </p>
    </div>
  );
}
