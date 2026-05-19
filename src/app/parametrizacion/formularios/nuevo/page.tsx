"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { formulariosService } from "@/services/parametrizacion/formularios.service";

export default function NuevoFormularioPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const crearFormulario = async () => {
    if (!nombre.trim()) {
      alert("El nombre del formulario es requerido");
      return;
    }

    setSubmitting(true);
    try {
      const data = await formulariosService.create({
        formulario_nombre: nombre.trim(),
        formulario_descripcion: descripcion.trim() || null,
      });

      const nuevoId = Number(data?.formulario_id || data?.id);
      if (!Number.isFinite(nuevoId) || nuevoId <= 0) {
        alert("Se creó el formulario, pero no fue posible abrir el editor");
        router.push("/parametrizacion/formularios");
        return;
      }

      router.replace(
        `/parametrizacion/formulario-editor?formulario_id=${nuevoId}&version=1`,
      );
    } catch (error: any) {
      console.error("Error creando formulario:", error);
      alert(error?.message || "Error al crear el formulario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <button
              onClick={() => router.push("/parametrizacion/formularios")}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
              <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                Nuevo formulario
              </p>
              <button
                onClick={crearFormulario}
                disabled={submitting || !nombre.trim()}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  submitting || !nombre.trim()
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "text-white bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Crear y editar
                  </>
                )}
              </button>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-6" />

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del formulario
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Solicitud de vinculación cliente"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe brevemente el objetivo del formulario"
                  rows={4}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={crearFormulario}
                disabled={submitting || !nombre.trim()}
                className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  submitting || !nombre.trim()
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "text-white bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Creando..." : "Crear formulario"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
