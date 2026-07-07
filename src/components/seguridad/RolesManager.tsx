'use client';

import React, { useState } from 'react';
import { useRoles } from '@/hooks/useRoles';
import { CreateRolDto, UpdateRolDto } from '@/services/seguridad/roles.service';
import ConfirmModal from '@/components/modals/ConfirmModal';

export const RolesManager = () => {
  const {
    roles,
    loading,
    error,
    createRol,
    updateRol,
    deleteRol,
    fetchModulesByRole,
  } = useRoles();

  const [showForm, setShowForm] = useState(false);
  const [editingRol, setEditingRol] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateRolDto>({
    rolNombre: '',
    rolDescripcion: '',
    rolCodigo: '',
  });
  const [selectedRolModules, setSelectedRolModules] = useState<any[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingDeleteRolId, setPendingDeleteRolId] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRol) {
      await updateRol(editingRol, formData as UpdateRolDto);
      setEditingRol(null);
    } else {
      await createRol(formData);
    }

    setFormData({ rolNombre: '', rolDescripcion: '', rolCodigo: '' });
    setShowForm(false);
  };

  const handleEdit = (rol: any) => {
    setFormData({
      rolNombre: rol.rolNombre,
      rolDescripcion: rol.rolDescripcion,
      rolCodigo: rol.rolCodigo,
    });
    setEditingRol(rol.rolId);
    setShowForm(true);
  };

  const handleDelete = (rolId: number) => {
    setPendingDeleteRolId(rolId);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteRolId) {
      await deleteRol(pendingDeleteRolId);
      setPendingDeleteRolId(null);
      setConfirmModalOpen(false);
    }
  };

  const handleViewModules = async (rolId: number) => {
    const modules = await fetchModulesByRole(rolId);
    setSelectedRolModules(modules);
  };

  if (loading && roles.length === 0) return <div>Cargando roles...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Roles</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingRol(null);
            setFormData({ rolNombre: '', rolDescripcion: '', rolCodigo: '' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : 'Nuevo Rol'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Rol</label>
            <input
              type="text"
              name="rolNombre"
              value={formData.rolNombre}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Código del Rol</label>
            <input
              type="text"
              name="rolCodigo"
              value={formData.rolCodigo}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              name="rolDescripcion"
              value={formData.rolDescripcion}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {editingRol ? 'Actualizar' : 'Crear'} Rol
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {roles.map(rol => (
          <div key={rol.rolId} className="bg-white border rounded-lg p-4 shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{rol.rolNombre}</h3>
                <p className="text-sm text-gray-600">Código: {rol.rolCodigo}</p>
                {rol.rolDescripcion && (
                  <p className="text-sm text-gray-600 mt-1">{rol.rolDescripcion}</p>
                )}
                <p className={`text-xs mt-2 ${rol.rolActivo ? 'text-green-600' : 'text-red-600'}`}>
                  Estado: {rol.rolActivo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleViewModules(rol.rolId)}
                  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Ver Módulos
                </button>
                <button
                  onClick={() => handleEdit(rol)}
                  className="px-3 py-1 text-sm bg-blue-200 rounded hover:bg-blue-300"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(rol.rolId)}
                  className="px-3 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedRolModules.length > 0 && (
        <div className="bg-white border rounded-lg p-4 shadow">
          <h3 className="font-semibold mb-4">Módulos Asignados</h3>
          <div className="space-y-2">
            {selectedRolModules.map(mod => (
              <div key={`${mod.rmRolId}-${mod.rmModId}`} className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">Módulo ID: {mod.rmModId}</div>
                <div className="text-xs text-gray-600 space-x-2">
                  {mod.rmVer && <span className="bg-green-100 px-2 py-1 rounded">Ver</span>}
                  {mod.rmCrear && <span className="bg-green-100 px-2 py-1 rounded">Crear</span>}
                  {mod.rmEditar && <span className="bg-green-100 px-2 py-1 rounded">Editar</span>}
                  {mod.rmEliminar && <span className="bg-green-100 px-2 py-1 rounded">Eliminar</span>}
                  {mod.rmAprobar && <span className="bg-green-100 px-2 py-1 rounded">Aprobar</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Eliminar rol"
        message="¿Estás seguro de que deseas eliminar este rol?"
        confirmText="Eliminar"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingDeleteRolId(null);
        }}
      />
    </div>
  );
};
