"use client";

import { useState, useEffect } from "react";
import { consecutivosService } from "@/services/consecutivos.service";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Plus, Edit2, Trash2, Hash } from "lucide-react";

export default function ConsecutivosPage() {
  const [consecutivos, setConsecutivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    cons_ptc_id: 2,
    cons_cop_id: "",
    cons_numero_actual: 0,
    cons_estado: "A",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConsecutivos();
  }, []);

  const loadConsecutivos = async () => {
    try {
      setLoading(true);
      const data = await consecutivosService.getAll();
      setConsecutivos(data);
    } catch (error) {
      setErrorMessage("Error cargando consecutivos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const submitData = {
        ...formData,
        cons_cop_id: formData.cons_cop_id ? parseInt(formData.cons_cop_id) : null,
      };

      if (editingId) {
        await consecutivosService.update(editingId, submitData);
        setSuccessMessage("Consecutivo actualizado correctamente");
      } else {
        await consecutivosService.create(submitData);
        setSuccessMessage("Consecutivo creado correctamente");
      }

      setShowForm(false);
      setShowConfirmSave(false);
      setEditingId(null);
      resetForm();
      loadConsecutivos();
    } catch (error) {
      setShowConfirmSave(false);
      setErrorMessage("Error guardando consecutivo");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const consecutivo = await consecutivosService.getById(id);
      setFormData({
        cons_ptc_id: consecutivo.cons_ptc_id,
        cons_cop_id: consecutivo.cons_cop_id || "",
        cons_numero_actual: consecutivo.cons_numero_actual,
        cons_estado: consecutivo.cons_estado,
      });
      setEditingId(id);
      setShowForm(true);
    } catch (error) {
      setErrorMessage("Error cargando consecutivo");
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await consecutivosService.delete(id);
      setSuccessMessage("Consecutivo eliminado correctamente");
      loadConsecutivos();
    } catch (error) {
      setErrorMessage("Error eliminando consecutivo");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      cons_ptc_id: 2,
      cons_cop_id: "",
      cons_numero_actual: 0,
      cons_estado: "A",
    });
  };

  const handleAddNew = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Hash}
          eyebrow="Seguridad"
          title="Consecutivos"
          subtitle="Gestiona los números secuenciales por tipo"
          actions={
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo Consecutivo
            </button>
          }
        />

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3" />
            <p className="text-slate-600">Cargando consecutivos...</p>
          </div>
        ) : consecutivos.length === 0 ? (
          <EmptyStateCard
            icon={Hash}
            title="No hay consecutivos registrados"
            subtitle="Crea el primero para empezar a numerar"
            action={
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo Consecutivo
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Centro Op.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Nº Actual</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actualización</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consecutivos.map((c) => (
                  <tr key={c.cons_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.cons_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.cons_ptc_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.cons_cop_id || "—"}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-brand-600">{c.cons_numero_actual}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          c.cons_estado === "A"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {c.cons_estado === "A" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(c.cons_fecha_usr).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(c.cons_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c.cons_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                {editingId ? "Editar Consecutivo" : "Nuevo Consecutivo"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingId && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Tipo Consecutivo
                    </label>
                    <select
                      value={formData.cons_ptc_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cons_ptc_id: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value={1}>PQRS</option>
                      <option value={2}>SOLICITUDES_VINCULACION</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Centro de Operación
                  </label>
                  <select
                    value={formData.cons_cop_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cons_cop_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">Global (Sin centro específico)</option>
                    <option value="1">Centro 1</option>
                    <option value="2">Centro 2</option>
                    <option value="3">Centro 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Número Actual
                  </label>
                  <input
                    type="number"
                    value={formData.cons_numero_actual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cons_numero_actual: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.cons_estado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cons_estado: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SuccessModal
          isOpen={!!successMessage}
          title="Éxito"
          message={successMessage}
          actionText="Aceptar"
          onAction={() => setSuccessMessage("")}
          autoClose={true}
          autoCloseDelay={3000}
        />

        <ErrorModal
          isOpen={!!errorMessage}
          message={errorMessage}
          onAction={() => setErrorMessage("")}
        />

        <ConfirmModal
          isOpen={confirmDelete !== null}
          title="Eliminar Consecutivo"
          message="¿Está seguro de que desea eliminar este consecutivo?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          isDangerous={true}
          onConfirm={() => {
            if (confirmDelete) {
              handleDelete(confirmDelete);
            }
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />

        <ConfirmModal
          isOpen={showConfirmSave}
          title={editingId ? "Confirmar cambios" : "Confirmar creación"}
          message={
            editingId
              ? "¿Deseas guardar los cambios de este consecutivo?"
              : "¿Deseas crear este consecutivo?"
          }
          confirmText={editingId ? "Sí, guardar" : "Sí, crear"}
          cancelText="Cancelar"
          isLoading={saving}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmSave(false)}
        />
      </div>
    </div>
  );
}
