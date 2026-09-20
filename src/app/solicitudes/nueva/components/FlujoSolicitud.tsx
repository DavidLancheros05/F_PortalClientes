"use client";

import { Check, ClipboardList, FileSignature, Send } from "lucide-react";

export type EstadoPaso = "completo" | "actual" | "pendiente";

interface FlujoSolicitudProps {
  estados: [EstadoPaso, EstadoPaso, EstadoPaso];
  formularioPorcentaje: number;
  documentosProgreso?: { listos: number; total: number } | null;
  onStepClick?: (step: number) => void;
}

const pasos = [
  {
    titulo: "Diligenciar formulario",
    descripcion: "Completa la información requerida",
    icono: ClipboardList,
  },
  {
    titulo: "Firmar documentación",
    descripcion: "Revisa y firma la documentación",
    icono: FileSignature,
  },
  {
    titulo: "Enviar solicitud",
    descripcion: "Remite la solicitud a revisión",
    icono: Send,
  },
];

export function FlujoSolicitud({
  estados,
  formularioPorcentaje,
  documentosProgreso,
  onStepClick,
}: FlujoSolicitudProps) {
  const porcentajeGeneral = estados[0] === "completo" ? 100 : formularioPorcentaje;

  return (
    <section className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Ruta de tu solicitud</p>
          <p className="mt-1 text-xs text-slate-500">Selecciona una etapa para avanzar en el proceso.</p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {porcentajeGeneral}% del formulario
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {pasos.map((paso, index) => {
          const estado = estados[index];
          const Icono = paso.icono;
          // El paso 0 (Diligenciar) siempre lleva al formulario. El paso 2
          // (Enviar) solo se habilita cuando queda "actual" — es decir,
          // cuando ya se firmaron/subieron todos los documentos diferidos
          // (ver page.tsx::diferidosListosParaEnviar) — clickearlo dispara
          // el mismo envío que antes tenía su propio botón dentro de
          // PanelFirmaDocumentos.
          const puedeAbrir =
            Boolean(onStepClick) && (index === 0 || (index === 2 && estado === "actual"));

          let descripcion = paso.descripcion;
          if (index === 0 && estado !== "completo") {
            descripcion = `${formularioPorcentaje}% completado`;
          } else if (index === 1 && documentosProgreso) {
            descripcion = `${documentosProgreso.listos} de ${documentosProgreso.total} documentos listos`;
          } else if (index === 2 && estado === "actual") {
            descripcion = "Todo listo — toca para enviar";
          }

          return (
            <button
              key={paso.titulo}
              type="button"
              onClick={() => puedeAbrir && onStepClick?.(index)}
              disabled={!puedeAbrir}
              className={`group min-h-36 rounded-xl border p-4 text-left transition-all ${
                estado === "completo"
                  ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-md"
                  : estado === "actual"
                    ? "border-brand-600 bg-white hover:border-brand-700 hover:shadow-md"
                    : "border-slate-200 bg-slate-50"
              } disabled:cursor-not-allowed`}>
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${
                    estado === "completo"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : estado === "actual"
                        ? "border-brand-600 bg-white text-brand-600"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}>
                  {estado === "completo" ? <Check className="h-5 w-5" /> : <Icono className="h-5 w-5" />}
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    estado === "completo"
                      ? "text-emerald-700"
                      : estado === "actual"
                        ? "text-brand-600"
                        : "text-slate-400"
                  }`}>
                  {estado === "completo" ? "Completado" : estado === "actual" ? "Actual" : "Pendiente"}
                </span>
              </div>

              <div className="mt-4">
                <p
                  className={`text-sm font-bold ${
                    estado === "completo"
                      ? "text-emerald-700"
                      : estado === "actual"
                        ? "text-brand-600"
                        : "text-slate-500"
                  }`}>
                  {paso.titulo}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{descripcion}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
