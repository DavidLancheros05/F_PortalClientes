'use client';

import { useState, useEffect } from 'react';
import { tipoConsecutivosService } from '@/services/tipo-consecutivos.service';
import ConfirmModal from '@/components/modals/ConfirmModal';
import SuccessModal from '@/components/modals/SuccessModal';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';

export default function TipoConsecutivoPage() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ptc_nombre: '',
    ptc_descripcion: '',
    ptc_prefijo: '',
    ptc_estado: 'A',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const data = await tipoConsecutivosService.getAll();
      setTipos(data);
    } catch (error) {
      setErrorMessage('Error cargando tipos de consecutivos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await tipoConsecutivosService.update(editingId, formData);
        setSuccessMessage('Tipo actualizado correctamente');
      } else {
        await tipoConsecutivosService.create(formData);
        setSuccessMessage('Tipo creado correctamente');
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadTipos();
    } catch (error) {
      setErrorMessage('Error guardando tipo de consecutivo');
      console.error(error);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const tipo = await tipoConsecutivosService.getById(id);
      setFormData({
        ptc_nombre: tipo.ptc_nombre,
        ptc_descripcion: tipo.ptc_descripcion || '',
        ptc_prefijo: tipo.ptc_prefijo,
        ptc_estado: tipo.ptc_estado,
      });
      setEditingId(id);
      setShowForm(true);
    } catch (error) {
      setErrorMessage('Error cargando tipo');
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tipoConsecutivosService.delete(id);
      setSuccessMessage('Tipo eliminado correctamente');
      loadTipos();
    } catch (error) {
      setErrorMessage('Error eliminando tipo');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      ptc_nombre: '',
      ptc_descripcion: '',
      ptc_prefijo: '',
      ptc_estado: 'A',
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Tipos de Consecutivos</h1>
            </div>
            <p className="text-slate-600">Configura los tipos y prefijos de numeración</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Tipo
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Nombre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Descripción</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Prefijo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actualización</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tipos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No hay tipos registrados
                    </td>
                  </tr>
                ) : (
                  tipos.map((t) => (
                    <tr key={t.ptc_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{t.ptc_id}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{t.ptc_nombre}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                        {t.ptc_descripcion || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-purple-600 text-lg">
                        {t.ptc_prefijo}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            t.ptc_estado === 'A'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.ptc_estado === 'A' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(t.ptc_fecha_usr).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
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
              {editingId ? 'Editar Tipo' : 'Nuevo Tipo'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
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
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: PQRS"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
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
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Descripción del tipo"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
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
                  className="w-full px-3 py-2 border rounded font-mono"
                  placeholder="Ej: PQRS, SV"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
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
      </div>
    </div>
  );
}
