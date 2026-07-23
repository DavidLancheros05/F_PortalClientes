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
    <div className="mb-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-2xl p-3 text-white mx-auto max-w-7xl border border-blue-400/30">
      <div className="flex items-start justify-center gap-3">
        <div className="flex-1 text-center">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() =>
                router.push(
                  `/parametrizacion/formularios/${formularioId}/versiones`,
                )
              }
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">
                {formulario?.frm_nombre || formulario?.formulario_nombre}
                {readonly && (
                  <span className="ml-2 text-xs font-normal text-blue-100 bg-blue-900/30 px-2 py-0.5 rounded-full inline-block">
                    Solo lectura
                  </span>
                )}
                {versionConSolicitudes && (
                  <span className="ml-2 text-xs font-normal text-amber-100 bg-amber-900/40 px-2 py-0.5 rounded-full inline-block">
                    🔒 Con solicitudes asociadas
                  </span>
                )}
              </h1>
            </div>
          </div>
          <p className="text-blue-100 mb-1 text-xs">
            {formulario?.frm_descripcion ||
              formulario?.formulario_descripcion}
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-100">
            <span className="inline-block bg-white/20 px-3 py-1 rounded-lg font-medium">
              v{version || "1"}
            </span>
            {!readonly && (
              <p className="text-xs text-blue-50 opacity-90 ml-2">
                Los cambios se guardan en esta versión
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {!readonly && formularioId && (
            <button
              onClick={() =>
                router.push(
                  `/parametrizacion/formularios/${formularioId}/nueva-version`,
                )
              }
              disabled={formularioEdicionAbierto}
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200 shadow-md"
            >
              <Plus className="h-5 w-5" />
              Nueva versión
            </button>
          )}

          {readonly && formularioId && (
            <button
              onClick={() => router.push(editorModeUrl)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
            >
              <Edit2 className="h-5 w-5" />
              Ir a edición
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  {formulario && versionConSolicitudes && (
    <div className="mb-1 mx-auto max-w-7xl rounded-lg border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs text-amber-900 font-medium">
      🔒 Esta versión (v{version || "1"}) ya tiene solicitudes asociadas,
      por lo que sus preguntas y opciones no se pueden editar ni eliminar.
      Creá una nueva versión del formulario para hacer cambios.
    </div>
  )}

  {!formulario && (
    <h1 className="text-lg font-bold mb-2 text-gray-900">
      Editor de Formulario
    </h1>
  )}
    </>
  );
}
