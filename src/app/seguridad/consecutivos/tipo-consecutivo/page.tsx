"use client";

import { useState, useEffect } from "react";
import { tipoConsecutivosService } from "@/services/tipo-consecutivos.service";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";

export default function TipoConsecutivoPage() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ptc_nombre: "",
    ptc_descripcion: "",
    ptc_prefijo: "",
    ptc_estado: "A",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const data = await tipoConsecutivosService.getAll();
      setTipos(data);
    } catch (error) {
      setErrorMessage("Error cargando tipos de consecutivos");
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
      if (editingId) {
        await tipoConsecutivosService.update(editingId, formData);
        setSuccessMessage("Tipo actualizado correctamente");
      } else {
        await tipoConsecutivosService.create(formData);
        setSuccessMessage("Tipo creado correctamente");
      }

      setShowForm(false);
      setShowConfirmSave(false);
      setEditingId(null);
      resetForm();
      loadTipos();
    } catch (error) {
      setShowConfirmSave(false);
      setErrorMessage("Error guardando tipo de consecutivo");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const tipo = await tipoConsecutivosService.getById(id);
      setFormData({
        ptc_nombre: tipo.ptc_nombre,
        ptc_descripcion: tipo.ptc_descripcion || "",
        ptc_prefijo: tipo.ptc_prefijo,
        ptc_estado: tipo.ptc_estado,
      });
      setEditingId(id);
      setShowForm(true);
    } catch (error) {
      setErrorMessage("Error cargando tipo");
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tipoConsecutivosService.delete(id);
      setSuccessMessage("Tipo eliminado correctamente");
      loadTipos();
    } catch (error) {
      setErrorMessage("Error eliminando tipo");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      ptc_nombre: "",
      ptc_descripcion: "",
      ptc_prefijo: "",
      ptc_estado: "A",
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
          icon={Layers}
          eyebrow="Seguridad"
          title="Tipos de Consecutivos"
          subtitle="Configura los tipos y prefijos de numeración"
          actions={
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo Tipo
            </button>
          }
        />

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3" />
            <p className="text-slate-600">Cargando...</p>
          </div>
        ) : tipos.length === 0 ? (
          <EmptyStateCard
            icon={Layers}
            title="No hay tipos registrados"
            subtitle="Crea el primero para empezar a numerar"
            action={
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo Tipo
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>ID</Th>
                  <Th>Nombre</Th>
                  <Th>Descripción</Th>
                  <Th>Prefijo</Th>
                  <Th>Estado</Th>
                  <Th>Actualización</Th>
                  <Th sticky align="right">
                    Acciones
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tipos.map((t) => (
                  <Tr key={t.ptc_id}>
                    <Td className="font-medium text-slate-900">{t.ptc_id}</Td>
                    <Td className="font-semibold text-slate-900">{t.ptc_nombre}</Td>
                    <Td className="max-w-xs truncate">
                      {t.ptc_descripcion || "—"}
                    </Td>
                    <Td className="font-mono font-bold text-brand-600 text-lg">
                      {t.ptc_prefijo}
                    </Td>
                    <Td>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          t.ptc_estado === "A"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.ptc_estado === "A" ? "Activo" : "Inactivo"}
                      </span>
                    </Td>
                    <Td>{new Date(t.ptc_fecha_usr).toLocaleDateString("es-ES")}</Td>
                    <Td sticky align="right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(t.ptc_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t.ptc_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                {editingId ? "Editar Tipo" : "Nuevo Tipo"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.ptc_nombre}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ptc_nombre: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ej: PQRS"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.ptc_descripcion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ptc_descripcion: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    placeholder="Descripción del tipo"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Prefijo *
                  </label>
                  <input
                    type="text"
                    value={formData.ptc_prefijo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ptc_prefijo: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all font-mono"
                    placeholder="Ej: PQRS, SV"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.ptc_estado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ptc_estado: e.target.value,
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
          title="Eliminar Tipo"
          message="¿Está seguro de que desea eliminar este tipo de consecutivo?"
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
              ? "¿Deseas guardar los cambios de este tipo de consecutivo?"
              : "¿Deseas crear este tipo de consecutivo?"
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
