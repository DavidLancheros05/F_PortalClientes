"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Layers, Save, Info } from "lucide-react";
import api from "@/services/core/api";
import { ConfirmModal, ErrorModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";

// Mismo estilo de campos que perfil/cambiar-contrasena y pqrs/nueva
// (formulario simple dentro de tarjeta de 22px bajo un PageHeaderCard).
const LABEL_CLASS = "block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2";
const INPUT_CLASS =
  "w-full px-4 py-3 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none transition-all disabled:opacity-50";
const HINT_CLASS = "text-[11px] text-[#94a3b8] mt-1";

interface Version {
  fv_numero: number;
  version_descripcion: string;
  total_preguntas: number;
}

export default function NuevaVersionPage() {
  const router = useRouter();
  const params = useParams();
  const formularioId = params.formularioId as string;
  const rutaVersiones = `/parametrizacion/formularios/${formularioId}/versiones`;

  const [loading, setLoading] = useState(false);
  const [loadingVersiones, setLoadingVersiones] = useState(true);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [copiarDe, setCopiarDe] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Token de la petición en curso: si `formularioId` cambia o el
  // componente se desmonta antes de que responda, una respuesta tardía no
  // debe pisar el estado del formulario actual.
  const requestIdRef = useRef(0);

  useEffect(() => {
    cargarVersiones();
  }, [formularioId]);

  const cargarVersiones = async () => {
    const requestId = ++requestIdRef.current;
    setLoadingVersiones(true);
    try {
      const res = await api.get(
        `/parametrizacion/formularios/${formularioId}/versiones`,
      );
      if (requestIdRef.current !== requestId) return;
      const data = res.data;
      setVersiones(data.versiones || []);
      if (data.versiones && data.versiones.length > 0) {
        setCopiarDe(data.versiones[0].fv_numero);
      }
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      console.error("Error cargando versiones:", err);
      setError("No se pudieron cargar las versiones del formulario");
    } finally {
      if (requestIdRef.current === requestId) setLoadingVersiones(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);

    try {
      const res = await api.post(
        `/parametrizacion/formularios/${formularioId}/nueva-version`,
        {
          descripcion,
          copiarDeVersion: copiarDe,
        },
      );
      setShowConfirmModal(false);
      setMensajeExito(res.data.message);
    } catch (err: any) {
      console.error("Error creando versión:", err);
      setShowConfirmModal(false);
      setError(err?.response?.data?.message || "Error al crear la versión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeaderCard
          icon={Layers}
          eyebrow="Parametrización · Formularios"
          title="Nueva versión del formulario"
          subtitle="Crea una versión nueva, vacía o copiando las preguntas de otra"
          onBack={() => router.push(rutaVersiones)}
        />

        <div className="bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
            <div>
              <label className={LABEL_CLASS}>Descripción de la versión *</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                rows={3}
                placeholder="Ejemplo: Agregado validación adicional en campo de identificación"
                className={`${INPUT_CLASS} resize-y`}
              />
              <p className={HINT_CLASS}>Describe los cambios realizados en esta versión</p>
            </div>

            <div>
              <label className={LABEL_CLASS}>Copiar preguntas de versión</label>
              <select
                value={copiarDe || ""}
                onChange={(e) =>
                  setCopiarDe(e.target.value ? parseInt(e.target.value) : null)
                }
                disabled={loadingVersiones}
                className={INPUT_CLASS}
              >
                <option value="">
                  {loadingVersiones ? "Cargando..." : "No copiar (versión vacía)"}
                </option>
                {versiones.map((v) => (
                  <option key={v.fv_numero} value={v.fv_numero}>
                    Versión {v.fv_numero} - {v.total_preguntas} preguntas
                  </option>
                ))}
              </select>
              <p className={HINT_CLASS}>
                Si seleccionas una versión, se copiarán todas sus preguntas a la nueva versión
              </p>
            </div>

            <div className="flex gap-3 rounded-[14px] border border-brand-500/15 bg-brand-500/5 px-4 py-3">
              <Info className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-bold text-brand-600 mb-1">¿Qué sucederá?</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Se creará una nueva versión del formulario</li>
                  {copiarDe ? (
                    <li>Se copiarán todas las preguntas de la versión {copiarDe}</li>
                  ) : (
                    <li>La nueva versión estará vacía (sin preguntas)</li>
                  )}
                  <li>La versión actual seguirá activa hasta que actives la nueva</li>
                  <li>Podrás editar las preguntas de la nueva versión antes de activarla</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(rutaVersiones)}
                className="flex-1 px-6 py-3 border border-[#e9ecf2] text-slate-700 bg-white rounded-[11px] font-bold text-sm hover:bg-[#fafbfd] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !descripcion}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
              >
                <Save className="w-4 h-4" />
                {loading ? "Creando..." : "Crear versión"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SuccessModal
        isOpen={!!mensajeExito}
        title="Listo"
        message={mensajeExito ?? ""}
        onAction={() => {
          setMensajeExito(null);
          router.push(rutaVersiones);
        }}
      />

      <ErrorModal isOpen={!!error} message={error || ""} onAction={() => setError(null)} />

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar creación de versión"
        message={
          copiarDe
            ? `¿Deseas crear una nueva versión copiando las preguntas de la versión ${copiarDe}?`
            : "¿Deseas crear una nueva versión vacía (sin preguntas)?"
        }
        confirmText="Sí, crear"
        cancelText="Cancelar"
        isLoading={loading}
        onConfirm={handleConfirmCreate}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
