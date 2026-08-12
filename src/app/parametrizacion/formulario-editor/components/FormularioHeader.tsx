"use client";

import { ArrowLeft, Edit2, Plus } from "lucide-react";
import type { useRouter } from "next/navigation";
import type { Formulario } from "../hooks/types";

interface FormularioHeaderProps {
  formulario: Formulario | null;
  formularioId: string | null;
  router: ReturnType<typeof useRouter>;
  readonly: boolean;
  versionConSolicitudes: boolean;
  version: string | null;
  formularioEdicionAbierto: boolean;
  editorModeUrl: string;
}

export function FormularioHeader({
  formulario,
  formularioId,
  router,
  readonly,
  versionConSolicitudes,
  version,
  formularioEdicionAbierto,
  editorModeUrl,
}: FormularioHeaderProps) {
  return (
    <>
  {/* Header */}
  {formulario && (
    <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-lg shadow-md p-3 text-white border border-blue-400/30">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          onClick={() =>
            router.push(
              `/parametrizacion/formularios/${formularioId}/versiones`,
            )
          }
          className="justify-self-start p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 text-center">
          <h1 className="text-sm font-bold truncate">
            {formulario?.frm_nombre || formulario?.formulario_nombre}
            {readonly && (
              <span className="ml-2 text-[10px] font-normal text-blue-100 bg-blue-900/30 px-2 py-0.5 rounded-full inline-block">
                Solo lectura
              </span>
            )}
            {versionConSolicitudes && (
              <span className="ml-2 text-[10px] font-normal text-amber-100 bg-amber-900/40 px-2 py-0.5 rounded-full inline-block">
                🔒 Con solicitudes asociadas
              </span>
            )}
          </h1>
          <p className="text-[11px] text-blue-100 mt-0.5 truncate">
            {(formulario?.frm_descripcion ||
              formulario?.formulario_descripcion) && (
              <>
                {formulario?.frm_descripcion ||
                  formulario?.formulario_descripcion}{" "}
                ·{" "}
              </>
            )}
            v{version || "1"}
            {!readonly && " · Los cambios se guardan en esta versión"}
          </p>
        </div>

        <div className="justify-self-end">
          {!readonly && formularioId && (
            <button
              onClick={() =>
                router.push(
                  `/parametrizacion/formularios/${formularioId}/nueva-version`,
                )
              }
              disabled={formularioEdicionAbierto}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva versión
            </button>
          )}

          {readonly && formularioId && (
            <button
              onClick={() => router.push(editorModeUrl)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 hover:shadow-md hover:scale-105 transition-all duration-200 shadow-sm"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Ir a edición
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  {formulario && versionConSolicitudes && (
    <div className="flex-shrink-0 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-[11px] text-amber-900 font-medium">
      🔒 Esta versión (v{version || "1"}) ya tiene solicitudes asociadas,
      por lo que sus preguntas y opciones no se pueden editar ni eliminar.
      Creá una nueva versión del formulario para hacer cambios.
    </div>
  )}

  {!formulario && (
    <h1 className="text-lg font-bold text-gray-900">
      Editor de Formulario
    </h1>
  )}
    </>
  );
}
