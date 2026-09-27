"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Save } from "lucide-react";
import { formulariosService } from "@/services/parametrizacion/formularios.service";
import { ConfirmModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";

// Mismo estilo de campos que perfil/cambiar-contrasena y pqrs/nueva
// (formulario simple dentro de tarjeta de 22px bajo un PageHeaderCard).
const LABEL_CLASS = "block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2";
const INPUT_CLASS =
  "w-full px-4 py-3 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none transition-all disabled:opacity-50";

export default function NuevoFormularioPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const iniciarCreacion = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nombre.trim()) {
      setErrorMessage("El nombre del formulario es requerido");
      return;
    }
    setShowConfirmModal(true);
  };

  const crearFormulario = async () => {
    setSubmitting(true);
    try {
      const data = await formulariosService.create({
        formulario_nombre: nombre.trim(),
        formulario_descripcion: descripcion.trim() || null,
      });

      const nuevoId = Number(data?.frs_id);
      if (!Number.isFinite(nuevoId) || nuevoId <= 0) {
        setShowConfirmModal(false);
        setErrorMessage("Se creó el formulario, pero no fue posible abrir el editor");
        router.push("/parametrizacion/formularios");
        return;
      }

      router.replace(`/parametrizacion/formulario-editor?frs_id=${nuevoId}&version=1`);
    } catch (error: any) {
      console.error("Error creando formulario:", error);
      setShowConfirmModal(false);
      setErrorMessage(error?.message || "Error al crear el formulario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeaderCard
          icon={FilePlus2}
          eyebrow="Parametrización · Formularios"
          title="Nuevo formulario"
          subtitle="Crea el formulario y continúa en el editor para agregar sus preguntas"
          onBack={() => router.push("/parametrizacion/formularios")}
        />

        <div className="bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
          <form onSubmit={iniciarCreacion} className="p-5 sm:p-8 space-y-5">
            <div>
              <label className={LABEL_CLASS}>Nombre del formulario *</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Solicitud de vinculación cliente"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe brevemente el objetivo del formulario"
                rows={4}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/parametrizacion/formularios")}
                className="flex-1 px-6 py-3 border border-[#e9ecf2] text-slate-700 bg-white rounded-[11px] font-bold text-sm hover:bg-[#fafbfd] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !nombre.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
              >
                <Save className="w-4 h-4" />
                {submitting ? "Creando..." : "Crear y editar"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar creación"
        message={`¿Deseas crear el formulario "${nombre.trim()}"?`}
        confirmText="Sí, crear"
        cancelText="Cancelar"
        isLoading={submitting}
        onConfirm={crearFormulario}
        onCancel={() => setShowConfirmModal(false)}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage} onAction={() => setErrorMessage("")} />
    </div>
  );
}
