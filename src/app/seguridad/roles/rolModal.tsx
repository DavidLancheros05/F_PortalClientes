"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Shield,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  Eye,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle,
  FolderTree,
  Key,
  Lock,
} from "lucide-react";
import { modulosService } from "@/services/seguridad/modulos.service";

interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

interface Modulo {
  mod_id: number;
  mod_nombre: string;
  subModulos?: Modulo[];
}

interface ModuloAsignado extends Modulo {
  asignado: boolean;
  permisos: Permisos;
  subModulos?: ModuloAsignado[];
}

interface Rol {
  rol_id?: number;
  rol_nombre: string;
  rol_descripcion: string;
  modulos: ModuloAsignado[];
}

interface Props {
  rol?: Rol;
  onClose: () => void;
  onSave: (rol: Rol) => void;
}

// Configuración de permisos
const PERMISOS_CONFIG: {
  key: keyof Permisos;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "ver",
    label: "Ver",
    icon: <Eye className="w-3 h-3" />,
    color: "blue",
  },
  {
    key: "crear",
    label: "Crear",
    icon: <PlusCircle className="w-3 h-3" />,
    color: "emerald",
  },
  {
    key: "editar",
    label: "Editar",
    icon: <Edit2 className="w-3 h-3" />,
    color: "amber",
  },
  {
    key: "eliminar",
    label: "Eliminar",
    icon: <Trash2 className="w-3 h-3" />,
    color: "red",
  },
  {
    key: "aprobar",
    label: "Aprobar",
    icon: <CheckCircle className="w-3 h-3" />,
    color: "purple",
  },
];

const getPermisoColor = (color: string) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    emerald:
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    purple:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  };
  return colors[color] || colors.blue;
};

export default function RolModal({ rol, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState(rol?.rol_nombre || "");
  const [descripcion, setDescripcion] = useState(rol?.rol_descripcion || "");
  const [todosLosModulos, setTodosLosModulos] = useState<Modulo[]>([]);
  const [modulosAsignados, setModulosAsignados] = useState<
    Record<number, ModuloAsignado>
  >({});
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // ayuda para buscar un módulo en el árbol por id
  const findModuloById = (mods: Modulo[], id: number): Modulo | undefined => {
    for (const m of mods) {
      if (m.mod_id === id) return m;
      if (m.subModulos) {
        const found = findModuloById(m.subModulos, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Cargar todos los módulos disponibles
  useEffect(() => {
    modulosService
      .getAll()
      .then((data: Modulo[]) => setTodosLosModulos(data))
      .catch((err) => console.error("Error cargando módulos:", err));
  }, []);

  // Inicializar módulos asignados si estamos editando un rol
  useEffect(() => {
    if (rol) {
      const map: Record<number, ModuloAsignado> = {};
      const traverse = (mods: ModuloAsignado[]) => {
        mods.forEach((m) => {
          map[m.mod_id] = {
            ...m,
            asignado: true,
          } as ModuloAsignado;
          if (m.subModulos) traverse(m.subModulos as ModuloAsignado[]);
        });
      };
      traverse(rol.modulos);
      setModulosAsignados(map);
    }
  }, [rol]);

  // Toggle expansión de nodo
  const toggleExpand = (moduloId: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduloId)) {
        newSet.delete(moduloId);
      } else {
        newSet.add(moduloId);
      }
      return newSet;
    });
  };

  // Expandir/colapsar todos
  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (mods: Modulo[]) => {
      mods.forEach((m) => {
        if (m.subModulos && m.subModulos.length > 0) {
          allIds.add(m.mod_id);
          collectIds(m.subModulos);
        }
      });
    };
    collectIds(todosLosModulos);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Alternate toggling of a module
  const toggleModulo = (mod_id: number) => {
    setModulosAsignados((prev) => {
      const result = { ...prev };

      const findInTree = (mods: Modulo[]): Modulo | undefined => {
        for (const m of mods) {
          if (m.mod_id === mod_id) return m;
          if (m.subModulos) {
            const found = findInTree(m.subModulos);
            if (found) return found;
          }
        }
        return undefined;
      };

      const buildDefaults = (m: Modulo): ModuloAsignado => ({
        ...m,
        asignado: true,
        permisos: {
          ver: true,
          crear: false,
          editar: false,
          eliminar: false,
          aprobar: false,
        },
        subModulos: m.subModulos ? m.subModulos.map(buildDefaults) : undefined,
      });

      const cascadeAssign = (m: Modulo) => {
        result[m.mod_id] = buildDefaults(m);
        if (m.subModulos) m.subModulos.forEach(cascadeAssign);
      };

      const cascadeUnassign = (m: Modulo) => {
        delete result[m.mod_id];
        if (m.subModulos) m.subModulos.forEach(cascadeUnassign);
      };

      const target = findInTree(todosLosModulos);
      if (!target) return prev;

      if (result[target.mod_id]) {
        cascadeUnassign(target);
      } else {
        cascadeAssign(target);
        const assignAncestors = (mods: Modulo[], childId: number): boolean => {
          for (const m of mods) {
            if (m.mod_id === childId) return false;
            if (
              m.subModulos &&
              m.subModulos.some(
                (c) =>
                  c.mod_id === childId ||
                  assignAncestors(m.subModulos!, childId),
              )
            ) {
              if (!result[m.mod_id]) result[m.mod_id] = buildDefaults(m);
              return true;
            }
          }
          return false;
        };
        assignAncestors(todosLosModulos, target.mod_id);
      }

      return result;
    });
  };

  const togglePermiso = (mod_id: number, permiso: keyof Permisos) => {
    setModulosAsignados((prev) => ({
      ...prev,
      [mod_id]: {
        ...prev[mod_id],
        permisos: {
          ...prev[mod_id].permisos,
          [permiso]: !prev[mod_id].permisos[permiso],
        },
      },
    }));
  };

  // Construye la estructura anidada de módulos a partir del mapa de asignados
  const buildTree = (mods: Modulo[]): ModuloAsignado[] => {
    return mods
      .map((m) => {
        const assigned = modulosAsignados[m.mod_id];
        if (!assigned || !assigned.asignado) return null;
        const node: ModuloAsignado = {
          mod_id: m.mod_id,
          mod_nombre: m.mod_nombre,
          asignado: true,
          permisos: assigned.permisos,
        };
        if (m.subModulos) {
          const children = buildTree(m.subModulos);
          if (children.length) node.subModulos = children;
        }
        return node;
      })
      .filter((x): x is ModuloAsignado => x !== null);
  };

  // Filtrar módulos por búsqueda
  const filterModulosBySearch = (mods: Modulo[], term: string): Modulo[] => {
    if (!term.trim()) return mods;

    const lowerTerm = term.toLowerCase();
    const filter = (mod: Modulo): Modulo | null => {
      const matchesName = mod.mod_nombre.toLowerCase().includes(lowerTerm);
      const filteredChildren = mod.subModulos
        ? mod.subModulos.map(filter).filter((c): c is Modulo => c !== null)
        : [];

      if (matchesName || filteredChildren.length > 0) {
        return {
          ...mod,
          subModulos:
            filteredChildren.length > 0 ? filteredChildren : mod.subModulos,
        };
      }
      return null;
    };

    return mods.map(filter).filter((m): m is Modulo => m !== null);
  };

  const handleSave = () => {
    const rolData: any = {
      rol_id: rol?.rol_id,
      rol_nombre: nombre,
      rol_descripcion: descripcion,
      rol_codigo: rol?.rol_id ? undefined : nombre.toUpperCase().replace(/\s+/g, '_'),
      modulos: buildTree(todosLosModulos),
    };
    onSave(rolData);
  };

  const isValid = nombre.trim() !== "";

  // Renderiza un módulo y sus submódulos con diseño de árbol
  const renderModulo = (mod: Modulo, level: number) => {
    const asignado = modulosAsignados[mod.mod_id]?.asignado || false;
    const permisos = modulosAsignados[mod.mod_id]?.permisos;
    const hasChildren = mod.subModulos && mod.subModulos.length > 0;
    const isExpanded = expandedNodes.has(mod.mod_id);
    const shouldShow =
      !searchTerm ||
      mod.mod_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hasChildren &&
        mod.subModulos?.some((sub) =>
          sub.mod_nombre.toLowerCase().includes(searchTerm.toLowerCase()),
        ));

    if (!shouldShow) return null;

    return (
      <div key={mod.mod_id} className="select-none">
        {/* Módulo header */}
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all ${
            asignado ? "bg-blue-50/50" : "hover:bg-slate-50"
          }`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(mod.mod_id)}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* Checkbox */}
          <button
            onClick={() => toggleModulo(mod.mod_id)}
            className="focus:outline-none"
          >
            {asignado ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            )}
          </button>

          {/* Icono según nivel */}
          {level === 0 && <FolderTree className="w-4 h-4 text-blue-500" />}
          {level === 1 && <Key className="w-3.5 h-3.5 text-amber-500" />}
          {level >= 2 && <div className="w-3.5" />}

          {/* Nombre del módulo */}
          <span
            className={`text-sm font-medium ${asignado ? "text-slate-800" : "text-slate-600"}`}
          >
            {mod.mod_nombre}
          </span>

          {/* Badge de asignado */}
          {asignado && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Asignado
            </span>
          )}
        </div>

        {/* Permisos (si está asignado) */}
        {asignado && permisos && (
          <div
            className="flex flex-wrap gap-1.5 mt-1 mb-1.5"
            style={{ marginLeft: `${(level + 1) * 20 + 24}px` }}
          >
            {PERMISOS_CONFIG.map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => togglePermiso(mod.mod_id, key)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all border ${
                  permisos[key]
                    ? getPermisoColor(color)
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Submódulos */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {mod.subModulos!.map((sub) => renderModulo(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredModulos = filterModulosBySearch(todosLosModulos, searchTerm);
  const totalAsignados = Object.keys(modulosAsignados).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {rol ? "Editar Rol" : "Crear Nuevo Rol"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configura los permisos del rol seleccionando módulos
              </p>
            </div>
          </div>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Nombre del Rol <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Administrador, Editor, Usuario..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe las responsabilidades de este rol..."
                rows={2}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Módulos y Permisos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <FolderTree className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800">
                  Módulos y Permisos
                </h3>
                {totalAsignados > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {totalAsignados} módulo{totalAsignados !== 1 ? "s" : ""}{" "}
                    asignado{totalAsignados !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                <button
                  onClick={expandAll}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-xs"
                  title="Expandir todos"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={collapseAll}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-xs"
                  title="Colapsar todos"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar módulo..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all pl-8"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>

            {/* Lista de módulos */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="max-h-80 overflow-y-auto p-3 space-y-1">
                {filteredModulos.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FolderTree className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">
                      {searchTerm
                        ? "No se encontraron módulos"
                        : "No hay módulos disponibles"}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  filteredModulos.map((mod) => renderModulo(mod, 0))
                )}
              </div>
            </div>

            {/* Leyenda de permisos */}
            <div className="flex flex-wrap gap-3 pt-2">
              {PERMISOS_CONFIG.map(({ label, icon, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`p-0.5 rounded ${getPermisoColor(color)}`}>
                    {icon}
                  </div>
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-all"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={`px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${
              isValid
                ? "hover:from-indigo-700 hover:to-indigo-800"
                : "opacity-50 cursor-not-allowed"
            }`}
            onClick={handleSave}
            disabled={!isValid}
          >
            <Shield className="w-4 h-4" />
            {rol ? "Actualizar Rol" : "Crear Rol"}
          </button>
        </div>
      </div>
    </div>
  );
}
