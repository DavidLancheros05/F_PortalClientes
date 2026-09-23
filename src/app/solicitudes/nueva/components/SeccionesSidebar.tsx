"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

interface PreguntaLite {
  fp_tipo: string;
}

interface SeccionLite {
  seccion_id: number;
  seccion_nombre: string;
  seccion_descripcion?: string | null;
  preguntas: PreguntaLite[];
}

interface ProgresoSeccion {
  displayTotal: number;
  displayAnswered: number;
  displayPercent: number;
  usesRequired: boolean;
}

interface SeccionesSidebarProps {
  secciones: SeccionLite[];
  seccionSeleccionada: number | null;
  setSeccionSeleccionada: (id: number) => void;
  shouldShowQuestion: (pregunta: any) => boolean;
  seccionProgress: Map<number, ProgresoSeccion>;
}

export function SeccionesSidebar({
  secciones,
  seccionSeleccionada,
  setSeccionSeleccionada,
  shouldShowQuestion,
  seccionProgress,
}: SeccionesSidebarProps) {
  // La lista de secciones tiene su propio scroll (puede haber más secciones
  // de las que entran en el panel) — si el usuario la desplaza con el mouse
  // para mirar otra sección (sin hacer click, así que seccionSeleccionada NO
  // cambia) y luego sigue respondiendo preguntas de la sección activa, esta
  // se queda fuera de vista en el panel. Por eso el trigger no puede ser solo
  // "cambió seccionSeleccionada" — hace falta detectar que el usuario retomó
  // una pregunta (foco en cualquier campo) y, en ese momento, volver a traer
  // la sección activa a la vista sin forzar el scroll si ya es visible.
  const refsSecciones = useRef<Map<number, HTMLDivElement>>(new Map());

  const mostrarSeccionActiva = () => {
    if (seccionSeleccionada == null) return;
    refsSecciones.current.get(seccionSeleccionada)?.scrollIntoView({ block: "nearest" });
  };

  useEffect(() => {
    mostrarSeccionActiva();
    document.addEventListener("focusin", mostrarSeccionActiva);
    return () => document.removeEventListener("focusin", mostrarSeccionActiva);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionSeleccionada]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-2 flex flex-col min-h-0 lg:w-[23%]">
      <h2 className="hidden text-sm font-bold mb-2 lg:block">Secciones</h2>

      <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory lg:flex-1 lg:flex-col lg:overflow-y-auto lg:space-y-1 lg:pb-0">
        {secciones.map((seccion) => {
          const seccionPreguntas = seccion.preguntas;
          const seccionRespondibles = seccionPreguntas.filter(
            (pregunta) =>
              shouldShowQuestion(pregunta) && !["NOTA", "FECHA_HORA_ACTUAL"].includes(pregunta.fp_tipo),
          ).length;
          const progresoSeccion = seccionProgress.get(seccion.seccion_id);
          const todasCompletadas =
            (progresoSeccion?.displayTotal ?? 0) > 0 &&
            progresoSeccion?.displayAnswered === progresoSeccion?.displayTotal;
          const selected = seccion.seccion_id === seccionSeleccionada;

          return (
            <div
              key={seccion.seccion_id}
              ref={(el) => {
                if (el) refsSecciones.current.set(seccion.seccion_id, el);
                else refsSecciones.current.delete(seccion.seccion_id);
              }}
              className={`group relative flex-shrink-0 snap-start rounded-xl border px-2.5 py-2 cursor-pointer transition-all min-w-[150px] lg:min-w-0 lg:flex-none ${
                selected ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => setSeccionSeleccionada(seccion.seccion_id)}
              aria-pressed={selected}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <p className="break-words text-[10px] sm:text-[11px] lg:text-xs font-semibold leading-snug text-slate-800">
                      {seccion.seccion_nombre}
                    </p>
                    {todasCompletadas && seccionPreguntas.length > 0 && (
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {seccionRespondibles} campo{seccionRespondibles === 1 ? "" : "s"}
                  </p>
                </div>
                {progresoSeccion && (
                  <span className="hidden rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 lg:inline-flex">
                    {progresoSeccion.displayPercent}%
                  </span>
                )}
              </div>

              {seccion.seccion_descripcion && (
                <p className="mt-1 hidden text-[11px] text-slate-600 lg:block">{seccion.seccion_descripcion}</p>
              )}

              {progresoSeccion && (
                <div className="hidden lg:block mt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <span>{progresoSeccion.usesRequired ? "Obligatorias" : "Respondidas"}</span>
                    <span>
                      {progresoSeccion.displayAnswered}/{progresoSeccion.displayTotal}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${progresoSeccion.displayPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
