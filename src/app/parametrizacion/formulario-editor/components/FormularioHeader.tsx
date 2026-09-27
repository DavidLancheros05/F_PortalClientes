"use client";

import { Edit2, FileText, Lock, Plus } from "lucide-react";
import type { useRouter } from "next/navigation";
import { PageHeaderCard } from "@/components/PageHeaderCard";
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

const BOTON_HEADER =
  "inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0";

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
  const nombre = formulario?.frs_nombre || formulario?.formulario_nombre || "Editor de formulario";
  const descripcion = formulario?.frs_descripcion || formulario?.formulario_descripcion;
  const modo = readonly ? "Solo lectura" : "Los cambios se guardan en esta versión";

  return (
    <div className="flex-shrink-0">
      <PageHeaderCard
        icon={FileText}
        eyebrow={`Parametrización · Editor de formulario · v${version || "1"}`}
        title={nombre}
        subtitle={descripcion ? `${descripcion} · ${modo}` : modo}
        onBack={
          formularioId
            ? () => router.push(`/parametrizacion/formularios/${formularioId}/versiones`)
            : undefined
        }
        actions={
          formularioId && formulario ? (
            readonly ? (
              <button onClick={() => router.push(editorModeUrl)} className={BOTON_HEADER}>
                <Edit2 className="h-4 w-4" />
                Ir a edición
              </button>
            ) : (
              <button
                onClick={() => router.push(`/parametrizacion/formularios/${formularioId}/nueva-version`)}
                disabled={formularioEdicionAbierto}
                className={BOTON_HEADER}
              >
                <Plus className="h-4 w-4" />
                Nueva versión
              </button>
            )
          ) : undefined
        }
      >
        {formulario && versionConSolicitudes && (
          <p className="flex items-center gap-2 text-[12.5px] text-amber-800">
            <Lock className="h-4 w-4 flex-shrink-0" />
            Esta versión (v{version || "1"}) ya tiene solicitudes asociadas, por lo que sus preguntas y
            opciones no se pueden editar ni eliminar. Crea una nueva versión del formulario para hacer
            cambios.
          </p>
        )}
      </PageHeaderCard>
    </div>
  );
}
