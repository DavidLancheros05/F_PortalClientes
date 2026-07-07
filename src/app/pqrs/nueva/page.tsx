"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { pqrsService } from "@/services/pqrs.service";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.pqrs_pt_id || !formData.pqrs_titulo || !formData.pqrs_descripcion) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

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
      setError(err.response?.data?.message || "Error al crear la PQRS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <h1 className="text-3xl font-bold text-blue-800 mb-8">Nueva PQRS</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de PQRS *
              </label>
              <select
                value={formData.pqrs_pt_id}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_pt_id: e.target.value })
                }
                disabled={loadingTipos}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.pqrs_titulo}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_titulo: e.target.value })
                }
                required
                placeholder="Ingresa un título descriptivo"
                maxLength={255}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.pqrs_titulo.length}/255
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción *
              </label>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prioridad (Opcional)
              </label>
              <select
                value={formData.pqrs_pri_id}
                onChange={(e) =>
                  setFormData({ ...formData, pqrs_pri_id: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin prioridad</option>
                <option value="1">Baja</option>
                <option value="2">Media</option>
                <option value="3">Alta</option>
              </select>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creando..." : "Crear PQRS"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
