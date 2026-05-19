"use client";

import React, { useEffect, useState } from "react";
import { rolesService, Rol, Modulo, Permisos } from "@/services/seguridad/roles.service";
import { useFetch, useMutation } from "@/hooks/useFetch";
import ConfirmModal from "@/components/modals/ConfirmModal";
import SuccessModal from "@/components/modals/SuccessModal";
import Link from "next/link";
import {
  Shield,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Key,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
} from "lucide-react";
import RolModal from "./rolModal";

const RolesPage = () => {
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRol, setCurrentRol] = useState<Rol | null>(null);
  const [isNew, setIsNew] = useState(false);

  // ✅ Cargar roles con useFetch
  const { data: roles = [], loading, error, execute: loadRoles } = useFetch(
    () => rolesService.getAll(),
    {
      onError: (err) => setErrorMessage(err.message),
    },
  );

  // ✅ Crear/Actualizar rol
  const { mutate: saveRol, isLoading: isSaving } = useMutation(
    async (rolData: {
      rol_id?: number;
      rol_nombre: string;
      rol_descripcion: string;
      rol_codigo?: string;
      modulos: any[];
    }) => {
      if (isNew) {
        return rolesService.create({
          rol_nombre: rolData.rol_nombre,
          rol_descripcion: rolData.rol_descripcion,
          rol_codigo: rolData.rol_codigo,
          modulos: rolData.modulos,
        });
      } else {
        return rolesService.update(rolData.rol_id!, {
          rol_nombre: rolData.rol_nombre,
          rol_descripcion: rolData.rol_descripcion,
          modulos: rolData.modulos,
        });
      }
    },
    {
      onSuccess: () => {
        setSuccessMessage(isNew ? "Rol creado" : "Rol actualizado");
        loadRoles();
        closeModal();
      },
      onError: (err) => setErrorMessage(err.message),
    },
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Abrir modal
  const openModal = (rol?: Rol) => {
    setCurrentRol(rol || null);
    setIsNew(!rol);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Toggle expansión de un rol
  const toggleRoleExpand = (rolId: number) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rolId)) {
        newSet.delete(rolId);
      } else {
        newSet.add(rolId);
      }
      return newSet;
    });
  };

  // Expandir/colapsar todos los roles
  const expandAllRoles = () => {
    const allRoleIds = new Set(roles.map((r) => r.rol_id));
    setExpandedRoles(allRoleIds);
  };

  const collapseAllRoles = () => {
    setExpandedRoles(new Set());
  };

  // Renderizar permisos como badges
  const renderPermisosBadges = (permisos: Permisos | undefined) => {
    if (!permisos) return null;
    const permisoLabels: {
      key: keyof Permisos;
      label: string;
      color: string;
    }[] = [
      { key: "ver", label: "Ver", color: "bg-blue-100 text-blue-700" },
      {
        key: "crear",
        label: "Crear",
        color: "bg-emerald-100 text-emerald-700",
      },
      { key: "editar", label: "Editar", color: "bg-amber-100 text-amber-700" },
      { key: "eliminar", label: "Eliminar", color: "bg-red-100 text-red-700" },
      {
        key: "aprobar",
        label: "Aprobar",
        color: "bg-purple-100 text-purple-700",
      },
    ];

    const activePermisos = permisoLabels.filter((p) => permisos[p.key]);

    if (activePermisos.length === 0) {
      return <span className="text-xs text-slate-400">Sin permisos</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {activePermisos.map((p) => (
          <span
            key={p.key}
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.color}`}
          >
            {p.label}
          </span>
        ))}
      </div>
    );
  };

  // Renderizar módulos recursivamente con diseño de árbol
  const renderModulosTree = (
    mods: Modulo[],
    level: number = 0,
    roleId: number,
  ): React.ReactNode => {
    return mods.map((m) => (
      <div key={`${roleId}-${m.mod_id}`} className="py-1">
        <div
          className="flex items-center gap-2 group"
          style={{ paddingLeft: `${level * 24}px` }}
        >
          {level === 0 && (
            <Folder className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          )}
          {level === 1 && (
            <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
          )}
          {level >= 2 && <div className="w-3 flex-shrink-0" />}
          <span className="text-sm text-slate-700 font-medium">
            {m.mod_nombre}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {renderPermisosBadges(m.permisos)}
          </div>
        </div>
        {m.subModulos && m.subModulos.length > 0 && (
          <div className="mt-0.5">
            {renderModulosTree(m.subModulos, level + 1, roleId)}
          </div>
        )}
      </div>
    ));
  };

  // Renderizar resumen de permisos
  const renderPermisosResumen = (modulos: Modulo[]): string => {
    let totalPermisos = 0;
    let modulosConPermisos = 0;

    const count = (mods: Modulo[]) => {
      mods.forEach((m) => {
        const hasPermisos = Object.values(m.permisos).some((v) => v === true);
        if (hasPermisos) {
          modulosConPermisos++;
          totalPermisos += Object.values(m.permisos).filter(
            (v) => v === true,
          ).length;
        }
        if (m.subModulos) count(m.subModulos);
      });
    };

    count(modulos);

    if (modulosConPermisos === 0) return "Sin permisos asignados";
    return `${modulosConPermisos} módulo${modulosConPermisos !== 1 ? "s" : ""} · ${totalPermisos} permiso${totalPermisos !== 1 ? "s" : ""}`;
  };

  const handleModalSave = async (rolData: {
    rol_id?: number;
    rol_nombre: string;
    rol_descripcion: string;
    rol_codigo?: string;
    modulos: any[];
  }) => {
    try {
      await saveRol(rolData);
    } catch (err) {
      // El error ya se mostró en la notificación
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Administrar Roles
                </h1>
                <p className="text-slate-500 mt-1">
                  Gestiona los roles y sus permisos en el sistema
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href="/seguridad/permisos-por-pagina"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
                title="Ver permisos por página"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Por página</span>
              </Link>
              <button
                onClick={expandAllRoles}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
                title="Expandir todos"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Expandir todos</span>
              </button>
              <button
                onClick={collapseAllRoles}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
                title="Colapsar todos"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:inline">Colapsar todos</span>
              </button>
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Rol
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
            {error.message || "Ocurrió un error al cargar los roles"}
          </div>
        ) : !roles || roles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-1">
              No hay roles
            </h3>
            <p className="text-slate-500 mb-4">
              Comienza creando tu primer rol
            </p>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all"
            >
              Crear rol
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {roles?.map((rol) => {
              const isExpanded = expandedRoles.has(rol.rol_id);
              const resumenPermisos = renderPermisosResumen(rol.modulos);

              return (
                <div
                  key={rol.rol_id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Rol Header */}
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleRoleExpand(rol.rol_id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button className="p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50">
                        {rol.rol_activo ? (
                          <Lock className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {rol.rol_nombre}
                          </h3>
                          {rol.rol_activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" />
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {rol.rol_descripcion || "Sin descripción"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-600">
                          {resumenPermisos}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(rol);
                        }}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Editar rol"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rol Body - Permisos expandidos */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Permisos asignados
                        </span>
                      </div>

                      {rol.modulos.length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-4 text-center">
                          No hay módulos asignados a este rol
                        </p>
                      ) : (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          {renderModulosTree(rol.modulos, 0, rol.rol_id)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <RolModal
          rol={isNew ? undefined : (currentRol as any)}
          onClose={closeModal}
          onSave={handleModalSave}
        />
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
    </div>
  );
};

export default RolesPage;
