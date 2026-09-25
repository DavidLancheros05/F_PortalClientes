"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Send } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { pqrsService } from "@/services/pqrs.service";
import { ConfirmModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";

// Mismo estilo de campos que perfil/cambiar-contrasena (formulario simple
// dentro de tarjeta de 22px bajo un PageHeaderCard).
const LABEL_CLASS = "block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-2";
const INPUT_CLASS =
  "w-full px-4 py-3 border border-[#eef1f6] rounded-[11px] bg-[#fafbfd] text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:outline-none transition-all disabled:opacity-50";

interface TipoPQRS {
  pt_id: number;
  pt_nombre: string;
  pt_codigo: string;
}

export default function NuevaPQRSPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [tipos, setTipos] = useState<TipoPQRS[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    pqrs_pt_id: "",
    pqrs_titulo: "",
    pqrs_descripcion: "",
    pqrs_pri_id: "",
  });

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoadingTipos(true);
      const data = await pqrsService.getTipos();
      setTipos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando tipos:", err);
      setError("No se pudieron cargar los tipos de PQRS");
    } finally {
      setLoadingTipos(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.pqrs_pt_id || !formData.pqrs_titulo || !formData.pqrs_descripcion) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarCreacion = async () => {
    setLoading(true);
    try {
      const payload = {
        pqrs_pt_id: parseInt(formData.pqrs_pt_id),
        pqrs_titulo: formData.pqrs_titulo,
        pqrs_descripcion: formData.pqrs_descripcion,
        ...(formData.pqrs_pri_id && { pqrs_pri_id: parseInt(formData.pqrs_pri_id) }),
        ...(user?.cliente_id && { pqrs_cli_id: user.cliente_id }),
      };

      await pqrsService.create(payload);
      router.push(`/pqrs/mis-pqrs`);
    } catch (err: any) {
      console.error("Error creando PQRS:", err);
      setShowConfirmModal(false);
      setError(err.response?.data?.message || "Error al crear la PQRS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeaderCard
          icon={MessageSquarePlus}
          eyebrow="PQRS"
          title="Nueva PQRS"
          subtitle="Registra una petición, queja, reclamo o sugerencia"
          onBack={() => router.back()}
        />

        <div className="bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
            <div>
              <label className={LABEL_CLASS}>Tipo de PQRS *</label>
              <select
                value={formData.pqrs_pt_id}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_pt_id: e.target.value })
                }
                disabled={loadingTipos}
                required
                className={INPUT_CLASS}
              >
                <option value="">
                  {loadingTipos ? "Cargando..." : "Selecciona un tipo"}
                </option>
                {tipos.map((tipo) => (
                  <option key={tipo.pt_id} value={tipo.pt_id}>
                    {tipo.pt_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Título *</label>
              <input
                type="text"
                value={formData.pqrs_titulo}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_titulo: e.target.value })
                }
                required
                placeholder="Ingresa un título descriptivo"
                maxLength={255}
                className={INPUT_CLASS}
              />
              <p className="text-[11px] text-[#94a3b8] mt-1 text-right">
                {formData.pqrs_titulo.length}/255
              </p>
            </div>

            <div>
              <label className={LABEL_CLASS}>Descripción *</label>
              <textarea
                value={formData.pqrs_descripcion}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pqrs_descripcion: e.target.value,
                  })
                }
                required
                placeholder="Describe detalladamente tu PQRS"
                rows={6}
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Prioridad (opcional)</label>
              <select
                value={formData.pqrs_pri_id}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_pri_id: e.target.value })
                }
                className={INPUT_CLASS}
              >
                <option value="">Sin prioridad</option>
                <option value="1">Baja</option>
                <option value="2">Media</option>
                <option value="3">Alta</option>
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-[#e9ecf2] text-slate-700 bg-white rounded-[11px] font-bold text-sm hover:bg-[#fafbfd] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
              >
                <Send className="w-4 h-4" />
                {loading ? "Creando..." : "Crear PQRS"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ErrorModal isOpen={!!error} message={error || ""} onAction={() => setError(null)} />

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar creación"
        message="¿Deseas crear esta PQRS?"
        confirmText="Sí, crear"
        cancelText="Cancelar"
        isLoading={loading}
        onConfirm={confirmarCreacion}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
