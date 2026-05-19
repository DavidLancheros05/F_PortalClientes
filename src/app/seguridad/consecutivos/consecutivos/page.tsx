

'use client';

import { useState, useEffect } from 'react';
import { consecutivosService } from '@/services/consecutivos.service';
import ConfirmModal from '@/components/modals/ConfirmModal';
import SuccessModal from '@/components/modals/SuccessModal';
import { Plus, Edit2, Trash2, Hash } from 'lucide-react';

export default function ConsecutivosPage() {
  const [consecutivos, setConsecutivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    cons_ptc_id: 2,
    cons_cop_id: '',
    cons_numero_actual: 0,
    cons_estado: 'A',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    loadConsecutivos();
  }, []);

  const loadConsecutivos = async () => {
    try {
      setLoading(true);
      const data = await consecutivosService.getAll();
      setConsecutivos(data);
    } catch (error) {
      setErrorMessage('Error cargando consecutivos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        cons_cop_id: formData.cons_cop_id ? parseInt(formData.cons_cop_id) : null,
      };

      if (editingId) {
        await consecutivosService.update(editingId, submitData);
        setSuccessMessage('Consecutivo actualizado correctamente');
      } else {
        await consecutivosService.create(submitData);
        setSuccessMessage('Consecutivo creado correctamente');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadConsecutivos();
    } catch (error) {
      setErrorMessage('Error guardando consecutivo');
      console.error(error);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const consecutivo = await consecutivosService.getById(id);
      setFormData({
        cons_ptc_id: consecutivo.cons_ptc_id,
        cons_cop_id: consecutivo.cons_cop_id || '',
        cons_numero_actual: consecutivo.cons_numero_actual,
        cons_estado: consecutivo.cons_estado,
      });
      setEditingId(id);
      setShowForm(true);
    } catch (error) {
      setErrorMessage('Error cargando consecutivo');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await consecutivosService.delete(id);
      setSuccessMessage('Consecutivo eliminado correctamente');
      loadConsecutivos();
    } catch (error) {
      setErrorMessage('Error eliminando consecutivo');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      cons_ptc_id: 2,
      cons_cop_id: '',
      cons_numero_actual: 0,
      cons_estado: 'A',
    });
  };

  const handleAddNew = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Consecutivos</h1>
            </div>
            <p className="text-slate-600">Gestiona los números secuenciales por tipo</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Consecutivo
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-slate-600">Cargando...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
                {consecutivos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No hay consecutivos registrados
                    </td>
                  </tr>
                ) : (
                  consecutivos.map((c) => (
                    <tr key={c.cons_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{c.cons_id}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{c.cons_ptc_id}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{c.cons_cop_id || '—'}</td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-blue-600">{c.cons_numero_actual}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            c.cons_estado === 'A'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.cons_estado === 'A' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(c.cons_fecha_usr).toLocaleDateString('es-ES')}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Editar Consecutivo' : 'Nuevo Consecutivo'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold mb-1">
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
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value={1}>PQRS</option>
                    <option value={2}>SOLICITUDES_VINCULACION</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Centro de Operación <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.cons_cop_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cons_cop_id: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Selecciona un centro</option>
                  <option value="">Global (Sin centro específico)</option>
                  <option value="1">Centro 1</option>
                  <option value="2">Centro 2</option>
                  <option value="3">Centro 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
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
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
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
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="A">Activo</option>
                  <option value="I">Inactivo</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!successMessage}
        title="Éxito"
        message={successMessage}
        actionText="Aceptar"
        onAction={() => setSuccessMessage('')}
        autoClose={true}
        autoCloseDelay={3000}
      />

      {/* Error Modal */}
      <ConfirmModal
        isOpen={!!errorMessage}
        title="Error"
        message={errorMessage}
        confirmText="Aceptar"
        cancelText="Cancelar"
        isDangerous={true}
        onConfirm={() => setErrorMessage('')}
        onCancel={() => setErrorMessage('')}
      />

      {/* Delete Confirmation Modal */}
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
      </div>
    </div>
  );
}
