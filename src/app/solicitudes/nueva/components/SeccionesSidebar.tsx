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
  isClienteUser: boolean;
  shouldShowQuestionForCurrentUser: (pregunta: any) => boolean;
  seccionProgress: Map<number, ProgresoSeccion>;
}

export function SeccionesSidebar({
  secciones,
  seccionSeleccionada,
  setSeccionSeleccionada,
  isClienteUser,
  shouldShowQuestionForCurrentUser,
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
    refsSecciones.current
      .get(seccionSeleccionada)
      ?.scrollIntoView({ block: "nearest" });
  };

  useEffect(() => {
    mostrarSeccionActiva();
    document.addEventListener("focusin", mostrarSeccionActiva);
    return () => document.removeEventListener("focusin", mostrarSeccionActiva);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionSeleccionada]);

  return (
    <div className="w-[23%] bg-white rounded-lg shadow p-2 flex flex-col min-h-0">
      <h2 className="text-base font-bold mb-2">Secciones</h2>

      <div className="flex-1 overflow-y-auto space-y-1">
        {secciones.map((seccion) => {
          const seccionPreguntas = seccion.preguntas;
          const seccionRespondibles = seccionPreguntas.filter(
            (pregunta) =>
              shouldShowQuestionForCurrentUser(pregunta) &&
              !["NOTA", "FECHA_HORA_ACTUAL"].includes(pregunta.fp_tipo),
          ).length;
          const progresoSeccion = seccionProgress.get(seccion.seccion_id);
          const todasCompletadas =
            (progresoSeccion?.displayTotal ?? 0) > 0 &&
            progresoSeccion?.displayAnswered === progresoSeccion?.displayTotal;

          return (
            <div
              key={seccion.seccion_id}
              ref={(el) => {
                if (el) refsSecciones.current.set(seccion.seccion_id, el);
                else refsSecciones.current.delete(seccion.seccion_id);
              }}
              className={`p-2 border rounded cursor-pointer transition-all ${
                seccion.seccion_id === seccionSeleccionada
                  ? "bg-blue-50 border-blue-500 shadow-sm"
                  : "hover:bg-gray-50 border-gray-200"
              }`}
              onClick={() => setSeccionSeleccionada(seccion.seccion_id)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-xs">{seccion.seccion_nombre}</p>
                    {todasCompletadas && seccionPreguntas.length > 0 && (
                      <Check className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  {seccion.seccion_descripcion && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {seccion.seccion_descripcion}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {seccionRespondibles} campo(s) respondible(s)
                  </p>
                  {progresoSeccion && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                        <span>
                          {progresoSeccion.usesRequired
                            ? "Obligatorias"
                            : "Respondidas"}
                        </span>
                        <span>
                          {progresoSeccion.displayAnswered}/
                          {progresoSeccion.displayTotal}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-200 rounded">
                        <div
                          className="h-1 bg-blue-500 rounded"
                          style={{ width: `${progresoSeccion.displayPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
