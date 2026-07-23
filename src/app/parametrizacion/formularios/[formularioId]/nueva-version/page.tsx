"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Copy } from "lucide-react";
import api from "@/services/core/api";
import { ConfirmModal, SuccessModal } from "@/components/modals";

interface Version {
  fv_numero: number;
  version_descripcion: string;
  total_preguntas: number;
}

export default function NuevaVersionPage() {
  const router = useRouter();
  const params = useParams();
  const formularioId = params.formularioId as string;

  const [loading, setLoading] = useState(false);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [copiarDe, setCopiarDe] = useState<number | null>(null);
  const [notificacion, setNotificacion] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    cargarVersiones();
  }, [formularioId]);

  const cargarVersiones = async () => {
    try {
      const res = await api.get(
        `/parametrizacion/formularios/${formularioId}/versiones`,
      );
      const data = res.data;
      setVersiones(data.versiones || []);
      if (data.versiones && data.versiones.length > 0) {
        setCopiarDe(data.versiones[0].fv_numero);
      }
    } catch (error) {
      console.error("Error cargando versiones:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post(
        `/parametrizacion/formularios/${formularioId}/nueva-version`,
        {
          descripcion,
          copiarDeVersion: copiarDe,
          usuarioId: 1,
        },
      );
      setNotificacion({ type: "success", message: res.data.message });
    } catch (error: any) {
      console.error("Error creando versión:", error);
      const mensaje = error?.response?.data?.message || "Error al crear la versión";
      setNotificacion({ type: "error", message: mensaje });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() =>
              router.push(
                `/parametrizacion/formularios/${formularioId}/versiones`,
              )
            }
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Nueva Versión del Formulario
          </h1>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="space-y-6">
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la versión{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                rows={3}
                placeholder="Ejemplo: Agregado validación adicional en campo de identificación"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Describe los cambios realizados en esta versión
              </p>
            </div>

            {/* Copiar de versión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Copy className="w-4 h-4 inline mr-2" />
                Copiar preguntas de versión
              </label>
              <select
                value={copiarDe || ""}
                onChange={(e) =>
                  setCopiarDe(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No copiar (versión vacía)</option>
                {versiones.map((v) => (
                  <option key={v.fv_numero} value={v.fv_numero}>
                    Versión {v.fv_numero} - {v.total_preguntas} preguntas
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Si seleccionas una versión, se copiarán todas sus preguntas a la
                nueva versión
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading || !descripcion}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? "Creando..." : "Crear Versión"}
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/parametrizacion/formularios/${formularioId}/versiones`,
                  )
                }
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            ℹ️ ¿Qué sucederá?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Se creará una nueva versión del formulario</li>
            {copiarDe ? (
              <li>Se copiarán todas las preguntas de la versión {copiarDe}</li>
            ) : (
              <li>La nueva versión estará vacía (sin preguntas)</li>
            )}
            <li>La versión actual seguirá activa hasta que actives la nueva</li>
            <li>
              Podrás editar las preguntas de la nueva versión antes de activarla
            </li>
          </ul>
        </div>
      </div>

      <SuccessModal
        isOpen={notificacion?.type === "success"}
        title="Listo"
        message={notificacion?.message ?? ""}
        onAction={() => {
          setNotificacion(null);
          router.push(`/parametrizacion/formularios/${formularioId}/versiones`);
        }}
      />

      <ConfirmModal
        isOpen={notificacion?.type === "error"}
        title="Error"
        message={notificacion?.message ?? ""}
        confirmText="Aceptar"
        isDangerous
        onConfirm={() => setNotificacion(null)}
        onCancel={() => setNotificacion(null)}
      />
    </div>
  );
}
