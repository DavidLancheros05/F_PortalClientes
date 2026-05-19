'use client';

import { useEffect, useState } from 'react';
import { rolesService, Rol, RolModulo, CreateRolDto, UpdateRolDto, AssignModuleDto } from '@/services/seguridad/roles.service';

export const useRoles = () => {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar todos los roles
   */
  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rolesService.getAll();
      setRoles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando roles';
      setError(message);
      console.error('Error al cargar roles:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener rol por ID
   */
  const fetchRolById = async (rolId: number): Promise<Rol | null> => {
    try {
      return await rolesService.getById(rolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando rol';
      setError(message);
      console.error('Error al cargar rol:', err);
      return null;
    }
  };

  /**
   * Crear nuevo rol
   */
  const createRol = async (payload: CreateRolDto): Promise<Rol | null> => {
    try {
      const newRol = await rolesService.create(payload);
      setRoles([...roles, newRol]);
      return newRol;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creando rol';
      setError(message);
      console.error('Error al crear rol:', err);
      return null;
    }
  };

  /**
   * Actualizar rol
   */
  const updateRol = async (rolId: number, payload: UpdateRolDto): Promise<Rol | null> => {
    try {
      const updatedRol = await rolesService.update(rolId, payload);
      setRoles(roles.map(r => r.rolId === rolId ? updatedRol : r));
      return updatedRol;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error actualizando rol';
      setError(message);
      console.error('Error al actualizar rol:', err);
      return null;
    }
  };

  /**
   * Eliminar rol
   */
  const deleteRol = async (rolId: number): Promise<boolean> => {
    try {
      await rolesService.delete(rolId);
      setRoles(roles.filter(r => r.rolId !== rolId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error eliminando rol';
      setError(message);
      console.error('Error al eliminar rol:', err);
      return false;
    }
  };

  /**
   * Obtener módulos de un rol
   */
  const fetchModulesByRole = async (rolId: number): Promise<RolModulo[]> => {
    try {
      return await rolesService.getModulesByRole(rolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando módulos';
      setError(message);
      console.error('Error al cargar módulos:', err);
      return [];
    }
  };

  /**
   * Asignar módulo a rol
   */
  const assignModuleToRol = async (rolId: number, payload: AssignModuleDto): Promise<RolModulo | null> => {
    try {
      return await rolesService.assignModule(rolId, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error asignando módulo';
      setError(message);
      console.error('Error al asignar módulo:', err);
      return null;
    }
  };

  /**
   * Remover módulo de rol
   */
  const removeModuleFromRol = async (rolId: number, modId: number): Promise<boolean> => {
    try {
      await rolesService.removeModule(rolId, modId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error removiendo módulo';
      setError(message);
      console.error('Error al remover módulo:', err);
      return false;
    }
  };

  /**
   * Cargar roles al montar el componente
   */
  useEffect(() => {
    fetchRoles();
  }, []);

  return {
    roles,
    loading,
    error,
    fetchRoles,
    fetchRolById,
    createRol,
    updateRol,
    deleteRol,
    fetchModulesByRole,
    assignModuleToRol,
    removeModuleFromRol,
  };
};
