"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rolesService, Rol, Modulo, Permisos } from "@/services/seguridad/roles.service";
import { useFetch, useMutation } from "@/hooks/useFetch";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";
import Link from "next/link";
import {
  Shield,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Key,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Search,
  X,
} from "lucide-react";
import RolModal from "./rolModal";

const RolesPage = () => {
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Filtros
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "inactivo">(
    "todos",
  );

  // Modal state (solo se usa para "Nuevo Rol" — editar un rol existente se
  // hace inline, expandiendo su fila, ver editingRolId)
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRol, setCurrentRol] = useState<Rol | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Edición inline por línea: editingRolId marca qué rol está "en sesión de
  // edición" (su botón de arriba pasa a ser Guardar/Cancelar); dentro de esa
  // sesión, cada módulo se habilita individualmente con su lápiz propio
  // (editingModuloIds) para poder tocar sus 5 botones de permisos.
  // editPermisos es la copia de trabajo (mod_id -> permisos) que se va
  // modificando hasta guardar; rol.modulos nunca se muta directamente.
  const [editingRolId, setEditingRolId] = useState<number | null>(null);
  const [editingModuloIds, setEditingModuloIds] = useState<Set<number>>(
    new Set(),
  );
  const [editPermisos, setEditPermisos] = useState<Record<number, Permisos>>(
    {},
  );

  // Buscador de módulos dentro de cada fila expandida — un término de
  // búsqueda independiente por rol (rolId -> término), así buscar en un rol
  // no afecta lo que se ve en otro que también esté expandido.
  const [moduloSearchTerms, setModuloSearchTerms] = useState<
    Record<number, string>
  >({});

  const filterModulosBySearch = (mods: Modulo[], term: string): Modulo[] => {
    const lowerTerm = term.trim().toLowerCase();
    if (!lowerTerm) return mods;

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

  // Filtro por tipo de permiso (ej. "solo los módulos donde tengo Crear") —
  // también independiente por rol. "todos" desactiva el filtro.
  const [moduloPermisoFiltro, setModuloPermisoFiltro] = useState<
    Record<number, keyof Permisos | "todos">
  >({});

  const filterModulosByPermiso = (
    mods: Modulo[],
    permisoKey: keyof Permisos | "todos",
    roleId: number,
  ): Modulo[] => {
    if (permisoKey === "todos") return mods;
    const enSesionEdicion = editingRolId === roleId;

    const filter = (mod: Modulo): Modulo | null => {
      const permisos = enSesionEdicion
        ? editPermisos[mod.mod_id] || mod.permisos
        : mod.permisos;
      const matches = !!permisos?.[permisoKey];
      const filteredChildren = mod.subModulos
        ? mod.subModulos.map(filter).filter((c): c is Modulo => c !== null)
        : [];

      if (matches || filteredChildren.length > 0) {
        // A diferencia del filtro por nombre, que si el padre matchea
        // muestra TODOS sus hijos originales, acá no: que "Clientes" tenga
        // Crear no implica mostrar "Nuevo Cliente" si ese no lo tiene — cada
        // nodo se evalúa por su propio permiso.
        return {
          ...mod,
          subModulos:
            filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }
      return null;
    };

    return mods.map(filter).filter((m): m is Modulo => m !== null);
  };

  const flattenPermisos = (mods: Modulo[]): Record<number, Permisos> => {
    const map: Record<number, Permisos> = {};
    const walk = (list: Modulo[]) => {
      list.forEach((m) => {
        map[m.mod_id] = { ...(m.permisos as Permisos) };
        if (m.subModulos?.length) walk(m.subModulos);
      });
    };
    walk(mods);
    return map;
  };

  // Mapas de jerarquía (padre e hijos directos de cada módulo) para poder
  // cascadear al tocar un permiso, sin tener que recorrer todo el árbol en
  // cada click. Se recalculan al entrar a una sesión de edición.
  const [moduloParentMap, setModuloParentMap] = useState<
    Record<number, number | null>
  >({});
  const [moduloChildrenMap, setModuloChildrenMap] = useState<
    Record<number, number[]>
  >({});

  const buildHierarchyMaps = (mods: Modulo[]) => {
    const parentMap: Record<number, number | null> = {};
    const childrenMap: Record<number, number[]> = {};
    const walk = (list: Modulo[], parentId: number | null) => {
      list.forEach((m) => {
        parentMap[m.mod_id] = parentId;
        childrenMap[m.mod_id] = (m.subModulos || []).map((c) => c.mod_id);
        if (m.subModulos?.length) walk(m.subModulos, m.mod_id);
      });
    };
    walk(mods, null);
    return { parentMap, childrenMap };
  };

  const startEditSession = (rol: Rol) => {
    setIsNew(false);
    setEditingRolId(rol.rolId);
    setEditPermisos(flattenPermisos(rol.modulos || []));
    const { parentMap, childrenMap } = buildHierarchyMaps(rol.modulos || []);
    setModuloParentMap(parentMap);
    setModuloChildrenMap(childrenMap);
    setEditingModuloIds(new Set());
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      next.add(rol.rolId);
      return next;
    });
  };

  const cancelEditSession = () => {
    setEditingRolId(null);
    setEditPermisos({});
    setModuloParentMap({});
    setModuloChildrenMap({});
    setEditingModuloIds(new Set());
  };

  const toggleModuloEditable = (modId: number) => {
    setEditingModuloIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const SIN_PERMISOS: Permisos = {
    ver: false,
    crear: false,
    editar: false,
    eliminar: false,
    aprobar: false,
  };

  // No tiene sentido que un módulo tenga Crear/Editar/Eliminar/Aprobar sin
  // Ver, ni que sea visible si el módulo que lo contiene no lo es. Por eso
  // esto cascadea en las dos direcciones:
  // - Apagar Ver apaga también los otros 4 permisos de esa misma fila, y
  //   apaga TODO en cascada hacia todos sus descendientes.
  // - Prender cualquier permiso (Ver u otro) prende Ver en esa fila y en
  //   todos sus ancestros, para que nada quede "tapado" por un padre oculto.
  const toggleEditPermiso = (modId: number, key: keyof Permisos) => {
    setEditPermisos((prev) => {
      const next = { ...prev };
      const actual = next[modId] || { ...SIN_PERMISOS };
      const nuevoValor = !actual[key];
      const fila: Permisos = { ...actual, [key]: nuevoValor };

      if (key === "ver" && !nuevoValor) {
        fila.crear = false;
        fila.editar = false;
        fila.eliminar = false;
        fila.aprobar = false;
      } else if (key !== "ver" && nuevoValor) {
        fila.ver = true;
      }

      next[modId] = fila;

      if (key === "ver" && !nuevoValor) {
        const apagarDescendientes = (id: number) => {
          (moduloChildrenMap[id] || []).forEach((childId) => {
            next[childId] = { ...SIN_PERMISOS };
            apagarDescendientes(childId);
          });
        };
        apagarDescendientes(modId);
      }

      if (fila.ver) {
        let ancestorId = moduloParentMap[modId];
        while (ancestorId != null) {
          const ancestorFila = next[ancestorId] || { ...SIN_PERMISOS };
          if (!ancestorFila.ver) {
            next[ancestorId] = { ...ancestorFila, ver: true };
          }
          ancestorId = moduloParentMap[ancestorId];
        }
      }

      return next;
    });
  };

  // Reconstruye el árbol a enviar al backend a partir de la copia de
  // trabajo: un módulo solo se incluye (y se recorren sus submódulos) si
  // quedó con al menos un permiso en true — mismo criterio que ya usa
  // RolFormBody.buildTree, así ambos flujos de guardado son consistentes.
  const buildModulosPayload = (mods: Modulo[]): any[] => {
    return mods
      .map((m) => {
        const permisos = editPermisos[m.mod_id] || m.permisos;
        const asignado = !!permisos && Object.values(permisos).some(Boolean);
        if (!asignado) return null;
        const node: any = {
          mod_id: m.mod_id,
          mod_nombre: m.mod_nombre,
          permisos,
        };
        if (m.subModulos?.length) {
          const children = buildModulosPayload(m.subModulos);
          if (children.length) node.subModulos = children;
        }
        return node;
      })
      .filter((x): x is any => x !== null);
  };

  const handleGuardarPermisos = (rol: Rol) => {
    setPendingRolData({
      rolId: rol.rolId,
      rolNombre: rol.rolNombre,
      rolDescripcion: rol.rolDescripcion,
      rolCodigo: rol.rolCodigo,
      rolActivo: rol.rolActivo,
      modulos: buildModulosPayload(rol.modulos || []),
    });
    setShowConfirmModal(true);
  };

  // Confirmación antes de guardar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRolData, setPendingRolData] = useState<{
    rolId?: number;
    rolNombre: string;
    rolDescripcion?: string;
    rolCodigo?: string;
    rolActivo?: boolean;
    modulos?: any[];
  } | null>(null);

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
      rolId?: number;
      rolNombre: string;
      rolDescripcion?: string;
      rolCodigo?: string;
      rolActivo?: boolean;
      modulos?: any[];
    }) => {
      if (isNew) {
        return rolesService.create({
          rolNombre: rolData.rolNombre,
          rolDescripcion: rolData.rolDescripcion,
          rolCodigo: rolData.rolCodigo!,
          rolActivo: rolData.rolActivo,
          modulos: rolData.modulos,
        });
      } else {
        return rolesService.update(rolData.rolId!, {
          rolNombre: rolData.rolNombre,
          rolDescripcion: rolData.rolDescripcion,
          rolCodigo: rolData.rolCodigo,
          rolActivo: rolData.rolActivo,
          modulos: rolData.modulos,
        });
      }
    },
    {
      onSuccess: () => {
        setSuccessMessage(isNew ? "Rol creado" : "Rol actualizado");
        loadRoles();
        closeModal();
        setEditingRolId(null);
        setEditPermisos({});
        setEditingModuloIds(new Set());
        setShowConfirmModal(false);
        setPendingRolData(null);
      },
      onError: (err) => {
        setErrorMessage(err.message);
        setShowConfirmModal(false);
        setPendingRolData(null);
      },
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

  const handleBuscar = () => {
    setSearchTerm(searchInput.trim());
  };

  const handleLimpiarFiltros = () => {
    setSearchInput("");
    setSearchTerm("");
    setEstadoFiltro("todos");
  };

  // Pool crudo de sugerencias — combina las tres columnas que también
  // consulta el filtro real (matchSearch).
  const searchSugerencias = useMemo(
    () =>
      (roles || []).flatMap((rol: Rol) => [
        rol.rolNombre ?? "",
        rol.rolCodigo ?? "",
        rol.rolDescripcion ?? "",
      ]),
    [roles],
  );

  const rolesFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return (roles || []).filter((rol: Rol) => {
      const matchSearch =
        !term ||
        rol.rolNombre?.toLowerCase().includes(term) ||
        rol.rolCodigo?.toLowerCase().includes(term) ||
        rol.rolDescripcion?.toLowerCase().includes(term);

      const matchEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activo" && rol.rolActivo) ||
        (estadoFiltro === "inactivo" && !rol.rolActivo);

      return matchSearch && matchEstado;
    });
  }, [roles, searchTerm, estadoFiltro]);

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
    const allRoleIds = new Set<number>(rolesFiltrados.map((r: Rol) => r.rolId));
    setExpandedRoles(allRoleIds);
  };

  const collapseAllRoles = () => {
    setExpandedRoles(new Set());
  };

  // Las 5 columnas de permisos, siempre visibles y en el mismo orden para
  // que todos los módulos queden alineados verticalmente — antes solo se
  // mostraban los permisos activos (sin los inactivos) y únicamente al
  // pasar el mouse por encima de la fila.
  const PERMISO_COLUMNAS: {
    key: keyof Permisos;
    label: string;
    activeColor: string;
  }[] = [
    { key: "ver", label: "Ver", activeColor: "bg-blue-100 text-blue-700" },
    {
      key: "crear",
      label: "Crear",
      activeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "editar",
      label: "Editar",
      activeColor: "bg-amber-100 text-amber-700",
    },
    {
      key: "eliminar",
      label: "Eliminar",
      activeColor: "bg-red-100 text-red-700",
    },
    {
      key: "aprobar",
      label: "Aprobar",
      activeColor: "bg-purple-100 text-purple-700",
    },
  ];

  // Renderizar permisos como columna fija: los 5 siempre presentes, en
  // gris los que no están concedidos. En modo editable, cada uno es un
  // botón clickeable en vez de un badge estático.
  const renderPermisosBadges = (
    permisos: Permisos | undefined,
    editable?: { onToggle: (key: keyof Permisos) => void },
  ) => (
    <div className="flex gap-1">
      {PERMISO_COLUMNAS.map((p) => {
        const activo = !!permisos?.[p.key];
        if (editable) {
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => editable.onToggle(p.key)}
              className={`w-16 shrink-0 text-center px-1.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                activo
                  ? `${p.activeColor} border-transparent`
                  : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          );
        }
        return (
          <span
            key={p.key}
            className={`w-16 shrink-0 text-center px-1.5 py-0.5 rounded text-xs font-medium ${
              activo ? p.activeColor : "bg-slate-100 text-slate-400"
            }`}
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );

  // Renderizar módulos recursivamente con diseño de árbol. Mientras el rol
  // "roleId" está en sesión de edición (editingRolId), cada línea muestra
  // su propio lápiz: al activarlo, sus 5 botones de permiso quedan
  // editables sin afectar las demás líneas.
  const renderModulosTree = (
    mods: Modulo[],
    level: number = 0,
    roleId: number,
  ): React.ReactNode => {
    const enSesionEdicion = editingRolId === roleId;
    return mods.map((m) => {
      const filaEditable = enSesionEdicion && editingModuloIds.has(m.mod_id);
      const permisosMostrados = enSesionEdicion
        ? editPermisos[m.mod_id] || m.permisos
        : m.permisos;

      return (
        <div key={`${roleId}-${m.mod_id}`} className="py-1">
          <div
            className="flex items-center gap-2 rounded-lg py-1 pr-2 transition-colors hover:bg-slate-100"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {level === 0 && (
              <Folder className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
            )}
            {level === 1 && (
              <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            )}
            {level >= 2 && <div className="w-3 flex-shrink-0" />}
            <span className="text-sm text-slate-700 font-medium flex-1 min-w-0 truncate">
              {m.mod_nombre}
            </span>
            {renderPermisosBadges(
              permisosMostrados,
              filaEditable
                ? { onToggle: (key) => toggleEditPermiso(m.mod_id, key) }
                : undefined,
            )}
            {enSesionEdicion && (
              <button
                type="button"
                onClick={() => toggleModuloEditable(m.mod_id)}
                className={`p-1 rounded transition-colors ${
                  filaEditable
                    ? "text-brand-600 bg-[#eef3ff]"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title={
                  filaEditable
                    ? "Bloquear edición de esta línea"
                    : "Editar permisos de esta línea"
                }
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {m.subModulos && m.subModulos.length > 0 && (
            <div className="mt-0.5">
              {renderModulosTree(m.subModulos, level + 1, roleId)}
            </div>
          )}
        </div>
      );
    });
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

  const handleModalSave = (rolData: {
    rolId?: number;
    rolNombre: string;
    rolDescripcion?: string;
    rolCodigo?: string;
    rolActivo?: boolean;
    modulos?: any[];
  }) => {
    setPendingRolData(rolData);
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingRolData) return;
    try {
      await saveRol(pendingRolData);
    } catch (err) {
      // El error ya se mostró en la notificación
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Shield}
          eyebrow="Seguridad"
          title="Roles"
          subtitle="Gestiona los roles y sus permisos en el sistema"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/seguridad/permisos-por-pagina"
                className="inline-flex items-center gap-1 rounded-lg bg-white/14 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                title="Ver permisos por página"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Por página</span>
              </Link>
              <button
                onClick={expandAllRoles}
                className="inline-flex items-center gap-1 rounded-lg bg-white/14 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                title="Expandir todos"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Expandir</span>
              </button>
              <button
                onClick={collapseAllRoles}
                className="inline-flex items-center gap-1 rounded-lg bg-white/14 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                title="Colapsar todos"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:inline">Colapsar</span>
              </button>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
              >
                <Plus className="w-4 h-4" />
                Nuevo Rol
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SuggestField
              label="Nombre, código o descripción"
              placeholder="Buscar..."
              value={searchInput}
              onChange={setSearchInput}
              suggestions={searchSugerencias}
              onEnter={handleBuscar}
            />

            <FilterField label="Estado">
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(
                    e.target.value as "todos" | "activo" | "inactivo",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={handleLimpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Cargando roles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
            {error.message || "Ocurrió un error al cargar los roles"}
          </div>
        ) : !roles || roles.length === 0 ? (
          <EmptyStateCard
            icon={Shield}
            title="No hay roles"
            subtitle="Comienza creando tu primer rol"
            action={
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-all"
              >
                Crear rol
              </button>
            }
          />
        ) : rolesFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Shield}
            title="Ningún rol coincide con los filtros"
          />
        ) : (
          <div className="space-y-4">
            {rolesFiltrados.map((rol: Rol) => {
              const isExpanded = expandedRoles.has(rol.rolId);
              const resumenPermisos = renderPermisosResumen(rol.modulos || []);

              return (
                <div
                  key={rol.rolId}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Rol Header */}
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      // No colapsar la fila mientras se está editando inline
                      // — se perdería el formulario sin guardar.
                      if (editingRolId === rol.rolId) return;
                      toggleRoleExpand(rol.rolId);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button className="p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="p-1.5 rounded-lg bg-[#eef3ff]">
                        {rol.rolActivo ? (
                          <Lock className="w-4 h-4 text-brand-600" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {rol.rolNombre}
                          </h3>
                          {rol.rolActivo ? (
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
                          {rol.rolDescripcion || "Sin descripción"}
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

                      {editingRolId === rol.rolId ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditSession();
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Cancelar edición"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGuardarPermisos(rol);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                            title="Guardar cambios"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditSession(rol);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Editar rol"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rol Body - Permisos expandidos, editables en línea */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Permisos asignados
                        </span>
                        {editingRolId === rol.rolId && (
                          <span className="text-xs text-brand-600 font-medium">
                            · usa el lápiz de cada línea para editarla
                          </span>
                        )}
                      </div>

                      {(rol.modulos || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-4 text-center">
                          No hay módulos asignados a este rol
                        </p>
                      ) : (
                        <>
                          {/* Buscador por nombre + filtro por tipo de permiso */}
                          <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="relative flex-1 min-w-0">
                              <input
                                type="text"
                                value={moduloSearchTerms[rol.rolId] || ""}
                                onChange={(e) =>
                                  setModuloSearchTerms((prev) => ({
                                    ...prev,
                                    [rol.rolId]: e.target.value,
                                  }))
                                }
                                placeholder="Buscar módulo..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                              />
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>

                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() =>
                                  setModuloPermisoFiltro((prev) => ({
                                    ...prev,
                                    [rol.rolId]: "todos",
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                  (moduloPermisoFiltro[rol.rolId] || "todos") ===
                                  "todos"
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                Todos
                              </button>
                              {PERMISO_COLUMNAS.map((p) => {
                                const activo =
                                  (moduloPermisoFiltro[rol.rolId] || "todos") ===
                                  p.key;
                                return (
                                  <button
                                    key={p.key}
                                    onClick={() =>
                                      setModuloPermisoFiltro((prev) => ({
                                        ...prev,
                                        [rol.rolId]: p.key,
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                      activo
                                        ? `${p.activeColor} border-transparent`
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                    title={`Ver solo módulos con permiso de ${p.label}`}
                                  >
                                    {p.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-[28rem] overflow-y-auto">
                            {(() => {
                              const modulosFiltrados = filterModulosByPermiso(
                                filterModulosBySearch(
                                  rol.modulos || [],
                                  moduloSearchTerms[rol.rolId] || "",
                                ),
                                moduloPermisoFiltro[rol.rolId] || "todos",
                                rol.rolId,
                              );
                              return modulosFiltrados.length === 0 ? (
                                <p className="text-sm text-slate-500 italic py-4 text-center">
                                  Ningún módulo coincide con la búsqueda o el
                                  filtro
                                </p>
                              ) : (
                                renderModulosTree(modulosFiltrados, 0, rol.rolId)
                              );
                            })()}
                          </div>
                        </>
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

      {/* Confirmación antes de guardar */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={isNew ? "Confirmar creación" : "Confirmar cambios"}
        message={
          isNew
            ? "¿Estás seguro de que deseas crear este rol?"
            : "¿Estás seguro de que deseas guardar los cambios de este rol?"
        }
        confirmText={isNew ? "Sí, crear" : "Sí, guardar"}
        cancelText="Cancelar"
        isLoading={isSaving}
        onConfirm={handleConfirmSave}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingRolData(null);
        }}
      />

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
      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onAction={() => setErrorMessage('')}
      />
    </div>
  );
};

export default RolesPage;
