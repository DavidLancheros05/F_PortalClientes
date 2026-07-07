"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FolderTree,
  Plus,
  Edit,
  GripVertical,
  X,
  Move,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { modulosManagementService } from "@/services/modulos.service";

interface Modulo {
  mod_id: number;
  mod_codigo?: string;
  mod_nombre: string;
  mod_ruta: string;
  mod_icono?: string;
  mod_posicion?: number;
  mod_padre_id?: number | null;
  mod_activo?: boolean;
  subModulos: Modulo[];
}

interface ModuloPadreTreeSelectProps {
  nodes: Modulo[];
  value: number | null;
  onChange: (id: number | null) => void;
  excludedIds: Set<number>;
}

const ModuloPadreTreeSelect: React.FC<ModuloPadreTreeSelectProps> = ({
  nodes,
  value,
  onChange,
  excludedIds,
}) => {
  const [treeOpen, setTreeOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const moduloNombreById = useMemo(() => {
    const map = new Map<number, string>();
    const walk = (ns: Modulo[]) => {
      ns.forEach((n) => {
        map.set(n.mod_id, n.mod_nombre);
        if (n.subModulos) walk(n.subModulos);
      });
    };
    walk(nodes);
    return map;
  }, [nodes]);

  const selectedLabel = value ? moduloNombreById.get(value) : null;

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderTree = (nodeList: Modulo[], depth = 0): React.ReactNode[] => {
    const orderedNodes = [...nodeList].sort(
      (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
    );

    return orderedNodes.map((node) => {
      const isExcluded = excludedIds.has(node.mod_id);
      const hasChildren = node.subModulos && node.subModulos.length > 0;
      const isExpanded = expandedIds.has(node.mod_id);

      return (
        <div key={node.mod_id}>
          <div
            className={`flex items-center gap-1 px-3 py-2 cursor-pointer rounded transition-colors ${
              isExcluded
                ? "text-slate-300 cursor-not-allowed"
                : value === node.mod_id
                  ? "bg-blue-100 text-blue-900"
                  : "hover:bg-slate-100 text-slate-700"
            }`}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.mod_id);
                }}
                className="p-0.5 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <span
              onClick={() => {
                if (!isExcluded) {
                  onChange(node.mod_id);
                  setTreeOpen(false);
                }
              }}
              className="flex-1 text-sm"
            >
              {node.mod_nombre}
            </span>
          </div>

          {hasChildren && isExpanded && !isExcluded && (
            <div>
              {renderTree(node.subModulos || [], depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTreeOpen(!treeOpen)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-left text-sm text-slate-700 flex items-center justify-between"
      >
        <span>
          {selectedLabel || "-- Ninguno (módulo principal) --"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            treeOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {treeOpen && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-2 border border-slate-200 rounded-lg bg-white shadow-lg"
          onMouseLeave={() => setTreeOpen(false)}
        >
          <div className="max-h-96 overflow-y-auto">
            <div
              className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-sm text-slate-700 border-b border-slate-100"
              onClick={() => {
                onChange(null);
                setTreeOpen(false);
              }}
            >
              -- Ninguno (módulo principal) --
            </div>
            {renderTree(nodes)}
          </div>
        </div>
      )}
    </div>
  );
};

const ModulosPage = () => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  const [draggingModuloId, setDraggingModuloId] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    targetId: number;
    position: "above" | "below";
  } | null>(null);
  const [blockedTargetId, setBlockedTargetId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Estado para colapso/expansión
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());

  // Filtro de estado - por defecto mostrar "todos"
  const [estadoFiltro, setEstadoFiltro] = useState<
    "todos" | "activos" | "inactivos"
  >("todos");

  const [formData, setFormData] = useState({
    nombre: "",
    padre_id: null as number | null,
    icono: "",
    orden: 0,
  });

  const isCreateFormValid = formData.nombre.trim() !== "";

  const moduloNombreById = useMemo(() => {
    const map = new Map<number, string>();

    const walk = (nodes: Modulo[]) => {
      nodes.forEach((node) => {
        map.set(node.mod_id, node.mod_nombre);
        if (Array.isArray(node.subModulos) && node.subModulos.length > 0) {
          walk(node.subModulos);
        }
      });
    };

    walk(modulos);
    return map;
  }, [modulos]);

  const slugifySegment = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  const normalizeRoute = (rawRoute: string) => {
    const trimmed = String(rawRoute || "").trim();
    if (!trimmed) return "";

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const collapsed = withLeadingSlash.replace(/\/+/g, "/");

    if (collapsed.length > 1 && collapsed.endsWith("/")) {
      return collapsed.slice(0, -1);
    }

    return collapsed;
  };

  const generateRoute = (nombre: string, padreId: number | null) => {
    const segment = slugifySegment(nombre);
    if (!segment) return "";

    const parentRoute = padreId ? parentRouteById.get(padreId) : null;
    if (!parentRoute) return `/${segment}`;
    return normalizeRoute(`${parentRoute}/${segment}`);
  };

  const parentRouteById = useMemo(() => {
    const map = new Map<number, string>();

    const walk = (nodes: Modulo[]) => {
      nodes.forEach((node) => {
        map.set(node.mod_id, normalizeRoute(node.mod_ruta));
        if (Array.isArray(node.subModulos) && node.subModulos.length > 0) {
          walk(node.subModulos);
        }
      });
    };

    walk(modulos);
    return map;
  }, [modulos]);

  const getDescendantIds = (modulo: Modulo | null): Set<number> => {
    const ids = new Set<number>();

    if (!modulo) {
      return ids;
    }

    const walk = (node: Modulo) => {
      ids.add(node.mod_id);
      node.subModulos.forEach(walk);
    };

    walk(modulo);
    return ids;
  };

  const excludedParentIds = useMemo(
    () => getDescendantIds(editingModulo),
    [editingModulo],
  );


  // Función para obtener todos los IDs de una rama (para colapso)
  const getBranchIds = (node: Modulo): number[] => {
    const ids: number[] = [];
    const walk = (n: Modulo) => {
      ids.push(n.mod_id);
      n.subModulos.forEach(walk);
    };
    walk(node);
    return ids;
  };

  // Función para verificar si un nodo debe mostrarse (considerando colapso)
  const isNodeVisible = (
    nodeId: number,
    collapsedSet: Set<number>,
  ): boolean => {
    // Buscar el nodo en el árbol
    const findNode = (nodes: Modulo[]): Modulo | null => {
      for (const node of nodes) {
        if (node.mod_id === nodeId) return node;
        const found = findNode(node.subModulos);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(modulos);
    if (!node) return true;

    // Verificar si algún ancestro está colapsado
    const checkAncestors = (currentNode: Modulo): boolean => {
      if (!currentNode.mod_padre_id) return true;
      if (collapsedSet.has(currentNode.mod_padre_id)) return false;

      const findParent = (nodes: Modulo[]): Modulo | null => {
        for (const n of nodes) {
          if (n.mod_id === currentNode.mod_padre_id) return n;
          const found = findParent(n.subModulos);
          if (found) return found;
        }
        return null;
      };

      const parent = findParent(modulos);
      if (!parent) return true;
      return checkAncestors(parent);
    };

    return checkAncestors(node);
  };

  const flattenedRows = useMemo(() => {
    const rows: Array<{
      node: Modulo;
      modulo: string;
      submodulo: string;
      subsubmodulo: string;
      depth: number;
      pathIds: number[];
      isVisible: boolean;
      hasChildren: boolean;
      isCollapsed: boolean;
    }> = [];

    const walk = (
      nodes: Modulo[],
      path: string[] = [],
      pathIds: number[] = [],
    ) => {
      const orderedNodes = [...nodes].sort(
        (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
      );

      orderedNodes.forEach((node) => {
        const nextPath = [...path, node.mod_nombre];
        const nextPathIds = [...pathIds, node.mod_id];
        const hasChildren = node.subModulos && node.subModulos.length > 0;
        const isCollapsed = collapsedNodes.has(node.mod_id);
        const isVisible = isNodeVisible(node.mod_id, collapsedNodes);

        rows.push({
          node,
          modulo: nextPath[0] || "",
          submodulo: nextPath[1] || "",
          subsubmodulo: nextPath[2] || "",
          depth: nextPath.length - 1,
          pathIds: nextPathIds,
          isVisible,
          hasChildren,
          isCollapsed,
        });

        // Solo continuar si el nodo no está colapsado
        if (
          !isCollapsed &&
          Array.isArray(node.subModulos) &&
          node.subModulos.length > 0
        ) {
          walk(node.subModulos, nextPath, nextPathIds);
        }
      });
    };

    walk(modulos);
    return rows;
  }, [modulos, collapsedNodes]);

  const draggingRow = useMemo(
    () =>
      draggingModuloId
        ? flattenedRows.find((r) => r.node.mod_id === draggingModuloId)
        : null,
    [draggingModuloId, flattenedRows],
  );

  const clearDragState = () => {
    setDraggingModuloId(null);
    setDropIndicator(null);
    setBlockedTargetId(null);
  };

  const handleCellDragStart = (
    e: React.DragEvent<HTMLTableCellElement>,
    targetModuloId: number | undefined,
  ) => {
    if (!targetModuloId) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(targetModuloId));
    setDraggingModuloId(targetModuloId);
    setDropIndicator(null);
    setBlockedTargetId(null);
  };

  const fetchModulos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await modulosManagementService.getAllModulos();
      setModulos(data);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const basePayload = {
        nombre: formData.nombre,
        ruta: generateRoute(formData.nombre, formData.padre_id),
        padre_id: formData.padre_id,
        icono: formData.icono,
        orden: Number(formData.orden) || 0,
      };

      if (editingModulo) {
        await modulosManagementService.updateModulo(editingModulo.mod_id, basePayload);
      } else {
        await modulosManagementService.createModulo(basePayload);
      }

      alert(
        editingModulo
          ? "Módulo actualizado correctamente"
          : "Módulo creado correctamente",
      );
      setFormData({ nombre: "", padre_id: null, icono: "", orden: 0 });
      setEditingModulo(null);
      setModalOpen(false);
      await fetchModulos();
    } catch (err: any) {
      console.error("❌ Error:", err);
      alert(err.message || "Error desconocido");
    }
  };

  const openEditModal = (modulo: Modulo) => {
    setEditingModulo(modulo);
    setFormData({
      nombre: modulo.mod_nombre,
      padre_id: modulo.mod_padre_id || null,
      icono: modulo.mod_icono || "",
      orden: Number(modulo.mod_posicion ?? 0),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingModulo(null);
    setFormData({ nombre: "", padre_id: null, icono: "", orden: 0 });
  };

  const handleInactivarModulo = async () => {
    if (!editingModulo) return;

    const confirmed = window.confirm(
      `Se inactivara el modulo "${editingModulo.mod_nombre}". Deseas continuar?`,
    );

    if (!confirmed) return;

    try {
      setDeactivating(true);
      await modulosManagementService.deleteModulo(editingModulo.mod_id);
      alert("Modulo inactivado correctamente");
      closeModal();
      await fetchModulos();
    } catch (err: any) {
      alert(err?.message || "Error inactivando modulo");
    } finally {
      setDeactivating(false);
    }
  };

  const getSiblingsByParentId = (
    nodes: Modulo[],
    parentId: number | null,
  ): Modulo[] => {
    if (parentId === null) {
      return [...nodes];
    }

    const stack = [...nodes];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.mod_id === parentId) {
        return [...(current.subModulos || [])];
      }
      if (Array.isArray(current.subModulos) && current.subModulos.length > 0) {
        stack.push(...current.subModulos);
      }
    }

    return [];
  };

  const getModuloById = (nodes: Modulo[], moduloId: number): Modulo | null => {
    const stack = [...nodes];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (current.mod_id === moduloId) {
        return current;
      }
      if (Array.isArray(current.subModulos) && current.subModulos.length > 0) {
        stack.push(...current.subModulos);
      }
    }
    return null;
  };

  const draggingBlockIds = useMemo(() => {
    if (!draggingModuloId) {
      return new Set<number>();
    }

    return getDescendantIds(getModuloById(modulos, draggingModuloId));
  }, [draggingModuloId, modulos]);

  const getParentId = (moduloId: number | null) => {
    if (moduloId === null) return null;
    const modulo = getModuloById(modulos, moduloId);
    return modulo?.mod_padre_id ?? null;
  };

  // Función corregida para validar drop por nivel
  const validateDropByLevel = (
    sourceRow: {
      node: Modulo;
      depth: number;
    },
    targetRow: {
      node: Modulo;
      depth: number;
    },
  ) => {
    const sourceParentId = sourceRow.node.mod_padre_id ?? null;
    const targetParentId = targetRow.node.mod_padre_id ?? null;

    // Nivel 0: Módulos principales
    if (sourceRow.depth === 0) {
      const allowed = targetRow.depth === 0;
      return {
        allowed,
        message: allowed
          ? "✓ Módulo principal: puede moverse entre módulos principales"
          : "✗ Módulo principal: solo puede moverse entre módulos principales",
      };
    }

    // Nivel 1: Submódulos
    if (sourceRow.depth === 1) {
      const allowed =
        targetRow.depth === 1 && sourceParentId === targetParentId;
      return {
        allowed,
        message: allowed
          ? "✓ Submódulo: puede moverse dentro del mismo módulo padre"
          : "✗ Submódulo: solo puede moverse dentro del mismo módulo padre",
      };
    }

    // Nivel 2 y superiores: Sub-submódulos
    // Obtener el padre inmediato en el nivel 1
    const getParentAtDepth1 = (row: typeof sourceRow): number | null => {
      if (row.depth === 1) return row.node.mod_id;

      let current = row.node;
      let currentDepth = row.depth;

      while (currentDepth > 1 && current.mod_padre_id) {
        const parent = getModuloById(modulos, current.mod_padre_id);
        if (!parent) break;
        current = parent;
        currentDepth--;
      }

      return currentDepth === 1 ? current.mod_id : null;
    };

    const sourceParentAtDepth1 = getParentAtDepth1(sourceRow);
    const targetParentAtDepth1 = getParentAtDepth1(targetRow);

    const allowed =
      targetRow.depth === sourceRow.depth &&
      sourceParentAtDepth1 !== null &&
      sourceParentAtDepth1 === targetParentAtDepth1;

    return {
      allowed,
      message: allowed
        ? "✓ Elemento: puede moverse dentro del mismo grupo"
        : "✗ Elemento: solo puede moverse dentro del mismo nivel jerárquico y grupo",
    };
  };

  const saveModuloPosition = async (
    modulo: Modulo,
    orden: number,
    padreId: number | null,
  ) => {
    await modulosManagementService.updateModulo(modulo.mod_id, {
      nombre: modulo.mod_nombre,
      ruta: modulo.mod_ruta || "",
      icono: modulo.mod_icono || "",
      padre_id: padreId,
      orden,
    });
  };

  const handleDropOnRow = async (
    targetNode: Modulo,
    dropPosition: "above" | "below" = "above",
  ) => {
    if (!draggingModuloId || draggingModuloId === targetNode.mod_id) {
      clearDragState();
      return;
    }

    const sourceRow = flattenedRows.find(
      (r) => r.node.mod_id === draggingModuloId,
    );
    const targetRow = flattenedRows.find(
      (r) => r.node.mod_id === targetNode.mod_id,
    );

    if (!sourceRow || !targetRow) {
      clearDragState();
      return;
    }

    const sourceParentId = sourceRow.node.mod_padre_id ?? null;
    const validation = validateDropByLevel(sourceRow, targetRow);
    if (!validation.allowed) {
      alert(validation.message);
      clearDragState();
      return;
    }

    // Determinar el nuevo padre basado en la profundidad
    let newParentId: number | null = sourceParentId;
    if (sourceRow.depth === 0) {
      newParentId = null;
    }
    // Para depth >= 1, mantener el mismo padre

    const sourceModulo = getModuloById(modulos, draggingModuloId);
    if (!sourceModulo) {
      clearDragState();
      return;
    }

    const oldSiblings = getSiblingsByParentId(modulos, sourceParentId)
      .filter((m) => m.mod_id !== draggingModuloId)
      .sort(
        (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
      );

    const newSiblingsBase = getSiblingsByParentId(modulos, newParentId)
      .filter((m) => m.mod_id !== draggingModuloId)
      .sort(
        (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
      );

    let insertIndex = newSiblingsBase.findIndex(
      (m) => m.mod_id === targetNode.mod_id,
    );
    if (insertIndex < 0) {
      insertIndex = newSiblingsBase.length;
    } else if (dropPosition === "below") {
      insertIndex += 1;
    }

    const newSiblings = [...newSiblingsBase];
    newSiblings.splice(insertIndex, 0, sourceModulo);

    if (
      sourceParentId === newParentId &&
      newSiblings.every(
        (item, idx) => item.mod_id === newSiblingsBase[idx]?.mod_id,
      )
    ) {
      clearDragState();
      return;
    }

    try {
      setSavingOrder(true);

      if (sourceParentId !== newParentId) {
        for (let index = 0; index < oldSiblings.length; index += 1) {
          await saveModuloPosition(
            oldSiblings[index],
            index + 1,
            sourceParentId,
          );
        }
      }

      for (let index = 0; index < newSiblings.length; index += 1) {
        const item = newSiblings[index];
        const parentForItem =
          item.mod_id === sourceModulo.mod_id
            ? newParentId
            : (item.mod_padre_id ?? null);
        await saveModuloPosition(item, index + 1, parentForItem);
      }

      await fetchModulos();
    } catch (err) {
      console.error("Error guardando nuevo orden", err);
      alert(err instanceof Error ? err.message : "No se pudo guardar el orden");
    } finally {
      setSavingOrder(false);
      clearDragState();
    }
  };

  const handleDropToRoot = async () => {
    if (!draggingModuloId) return;

    const sourceRow = flattenedRows.find(
      (r) => r.node.mod_id === draggingModuloId,
    );
    if (!sourceRow) {
      clearDragState();
      return;
    }

    if (sourceRow.depth > 0) {
      alert("Solo un módulo principal se puede soltar en el nivel de módulos.");
      clearDragState();
      return;
    }

    const sourceModulo = getModuloById(modulos, draggingModuloId);
    if (!sourceModulo) {
      clearDragState();
      return;
    }

    const sourceParentId = sourceRow.node.mod_padre_id ?? null;
    const newParentId: number | null = null;

    if (sourceParentId === null && sourceRow.depth === 0) {
      clearDragState();
      return;
    }

    try {
      setSavingOrder(true);

      const oldSiblings = getSiblingsByParentId(modulos, sourceParentId)
        .filter((m) => m.mod_id !== draggingModuloId)
        .sort(
          (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
        );

      const rootSiblings = getSiblingsByParentId(modulos, null)
        .filter((m) => m.mod_id !== draggingModuloId)
        .sort(
          (a, b) => Number(a.mod_posicion || 0) - Number(b.mod_posicion || 0),
        );

      if (sourceParentId !== null) {
        for (let index = 0; index < oldSiblings.length; index += 1) {
          await saveModuloPosition(
            oldSiblings[index],
            index + 1,
            sourceParentId,
          );
        }
      }

      const reorderedRoots = [...rootSiblings, sourceModulo];
      for (let index = 0; index < reorderedRoots.length; index += 1) {
        const item = reorderedRoots[index];
        const parentForItem =
          item.mod_id === sourceModulo.mod_id
            ? newParentId
            : (item.mod_padre_id ?? null);
        await saveModuloPosition(item, index + 1, parentForItem);
      }

      await fetchModulos();
    } catch (err) {
      console.error("Error moviendo a raiz", err);
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo mover el modulo a raiz",
      );
    } finally {
      setSavingOrder(false);
      clearDragState();
    }
  };

  const handleRowDragOver = (
    e: React.DragEvent<HTMLTableRowElement>,
    targetNodeId: number,
  ) => {
    if (!draggingModuloId) return;

    e.preventDefault();
    const sourceRow = flattenedRows.find(
      (r) => r.node.mod_id === draggingModuloId,
    );
    const targetRow = flattenedRows.find((r) => r.node.mod_id === targetNodeId);

    if (!sourceRow || !targetRow) {
      setDropIndicator(null);
      setBlockedTargetId(null);
      return;
    }

    const validation = validateDropByLevel(sourceRow, targetRow);
    if (!validation.allowed) {
      setDropIndicator(null);
      setBlockedTargetId(targetNodeId);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position: "above" | "below" =
      offsetY < rect.height / 2 ? "above" : "below";

    setBlockedTargetId(null);

    setDropIndicator((prev) => {
      if (
        prev &&
        prev.targetId === targetNodeId &&
        prev.position === position
      ) {
        return prev;
      }
      return { targetId: targetNodeId, position };
    });
  };

  // Función para toggle colapso
  const toggleCollapse = (nodeId: number) => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Función para colapsar/expandir todos
  const collapseAll = () => {
    const allNodeIds = new Set<number>();
    const collectIds = (nodes: Modulo[]) => {
      nodes.forEach((node) => {
        if (node.subModulos && node.subModulos.length > 0) {
          allNodeIds.add(node.mod_id);
          collectIds(node.subModulos);
        }
      });
    };
    collectIds(modulos);
    setCollapsedNodes(allNodeIds);
  };

  const expandAll = () => {
    setCollapsedNodes(new Set());
  };

  const getDepthPrefix = (depth: number) => {
    if (depth === 0) return "";
    return "  ".repeat(depth - 1) + "└─ ";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Administrar Módulos
              </h1>
            </div>

            {/* Botones de colapso/expansión */}
            <div className="flex gap-2">
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
                title="Colapsar todos"
              >
                <MinusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Colapsar todo</span>
              </button>
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1"
                title="Expandir todos"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Expandir todo</span>
              </button>
            </div>
          </div>
          <p className="text-slate-500 ml-12">
            Gestiona la estructura jerárquica de los módulos del sistema
          </p>
        </div>

        {/* Drag Status */}
        {savingOrder && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700">Guardando nuevo orden...</p>
          </div>
        )}

        {draggingRow && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700">
              Arrastrando: <strong>{draggingRow.node.mod_nombre}</strong>
              <span className="ml-2 text-amber-600">
                ({draggingRow.depth === 0 && "Módulo principal"}
                {draggingRow.depth === 1 && "Submódulo"}
                {draggingRow.depth >= 2 && "Sub-submódulo"})
              </span>
            </p>
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`mb-6 p-4 rounded-xl border-2 border-dashed transition-all ${
            draggingRow && draggingRow.depth > 0
              ? "border-red-300 bg-red-50/50 text-red-500"
              : "border-blue-300 bg-blue-50/50 text-blue-600 hover:bg-blue-50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggingRow && draggingRow.depth > 0) {
              setBlockedTargetId(-1);
              setDropIndicator(null);
            }
          }}
          onDrop={handleDropToRoot}
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <Move className="w-4 h-4" />
            {draggingRow && draggingRow.depth > 0
              ? "No permitido para este nivel. Solo módulos principales pueden soltarse aquí."
              : "Suelta aquí para mover el módulo al nivel raíz"}
          </div>
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Plus className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              {editingModulo ? "Editar Módulo" : "Nuevo Módulo"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del módulo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Usuarios, Roles, Reportes..."
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Módulo padre
                </label>
                <ModuloPadreTreeSelect
                  nodes={modulos}
                  value={formData.padre_id}
                  onChange={(id) =>
                    setFormData({
                      ...formData,
                      padre_id: id,
                    })
                  }
                  excludedIds={excludedParentIds}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Icono (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Users, Settings, BarChart..."
                  value={formData.icono}
                  onChange={(e) =>
                    setFormData({ ...formData, icono: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Posición
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Orden de visualización"
                  value={formData.orden}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orden: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {editingModulo && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingModulo(null);
                    setFormData({
                      nombre: "",
                      padre_id: null,
                      icono: "",
                      orden: 0,
                    });
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
              <button
                type="submit"
                disabled={!isCreateFormValid || loading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {editingModulo ? "Actualizar" : "Crear Módulo"}
              </button>
            </div>
          </form>
        </div>

        {/* Filtro de Estado */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm text-slate-700 font-medium">
            Filtrar por estado:
          </label>
          <select
            value={estadoFiltro}
            onChange={(e) =>
              setEstadoFiltro(
                e.target.value as "todos" | "activos" | "inactivos",
              )
            }
            className="px-3 py-1 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {/* Modules Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Cargando módulos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Módulo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Submódulo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sub-submódulo
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flattenedRows
                    .filter((row) => {
                      if (!row.isVisible) return false;
                      if (estadoFiltro === "activos")
                        return row.node.mod_activo !== false;
                      if (estadoFiltro === "inactivos")
                        return row.node.mod_activo === false;
                      return true;
                    })
                    .map(
                      ({
                        node,
                        modulo,
                        submodulo,
                        subsubmodulo,
                        depth,
                        pathIds,
                        hasChildren,
                        isCollapsed,
                      }) => (
                        <tr
                          key={node.mod_id}
                          className={`transition-all ${
                            draggingModuloId === node.mod_id
                              ? "bg-blue-50"
                              : draggingBlockIds.has(node.mod_id)
                                ? "bg-blue-50/50"
                                : "hover:bg-slate-50"
                          }`}
                          onDragOver={(e) => handleRowDragOver(e, node.mod_id)}
                          onDrop={() =>
                            handleDropOnRow(
                              node,
                              dropIndicator?.targetId === node.mod_id
                                ? dropIndicator.position
                                : "above",
                            )
                          }
                          style={
                            dropIndicator?.targetId === node.mod_id
                              ? {
                                  boxShadow:
                                    dropIndicator.position === "above"
                                      ? "inset 0 2px 0 0 #3b82f6"
                                      : "inset 0 -2px 0 0 #3b82f6",
                                }
                              : blockedTargetId === node.mod_id
                                ? {
                                    boxShadow: "inset 0 0 0 2px #ef4444",
                                  }
                                : undefined
                          }
                        >
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {node.mod_id}
                          </td>
                          <td
                            className="px-6 py-3 cursor-move group"
                            draggable={Boolean(pathIds[0])}
                            onDragStart={(e) =>
                              handleCellDragStart(e, pathIds[0])
                            }
                            onDragEnd={clearDragState}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              {depth === 0 &&
                                (hasChildren ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCollapse(node.mod_id);
                                    }}
                                    className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                  >
                                    {isCollapsed ? (
                                      <ChevronRight className="w-4 h-4 text-slate-500" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-500" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-5" />
                                ))}
                              {depth === 0 &&
                                (isCollapsed ? (
                                  <Folder className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <FolderOpen className="w-4 h-4 text-blue-500" />
                                ))}
                              <span className="text-sm text-slate-700">
                                {modulo}
                              </span>
                              {hasChildren && (
                                <span className="text-xs text-slate-400 ml-1">
                                  ({node.subModulos.length})
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`px-6 py-3 ${pathIds[1] ? "cursor-move group" : ""}`}
                            draggable={Boolean(pathIds[1])}
                            onDragStart={(e) =>
                              handleCellDragStart(e, pathIds[1])
                            }
                            onDragEnd={clearDragState}
                          >
                            {submodulo !== "-" ? (
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-sm text-slate-600">
                                  {submodulo}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td
                            className={`px-6 py-3 ${pathIds[2] ? "cursor-move group" : ""}`}
                            draggable={Boolean(pathIds[2])}
                            onDragStart={(e) =>
                              handleCellDragStart(e, pathIds[2])
                            }
                            onDragEnd={clearDragState}
                          >
                            {subsubmodulo !== "-" ? (
                              <div className="flex items-center gap-2 pl-4">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <span className="text-sm text-slate-600">
                                  {subsubmodulo}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {typeof node.mod_activo === "boolean" ? (
                              node.mod_activo ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  Activo
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                  Inactivo
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {dropIndicator?.targetId === node.mod_id && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                  {dropIndicator.position === "above"
                                    ? "↑"
                                    : "↓"}
                                </span>
                              )}
                              {blockedTargetId === node.mod_id && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                  ✕
                                </span>
                              )}
                              <button
                                onClick={() => openEditModal(node)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
              </table>

              {flattenedRows.filter((row) => row.isVisible).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No hay módulos visibles. Expande algunas ramas para verlos.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Edit className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {editingModulo
                      ? `Editar Módulo [ID: ${editingModulo.mod_id}]`
                      : "Crear Módulo"}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del módulo"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                    La ruta se genera automáticamente
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Icono
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del icono"
                    value={formData.icono}
                    onChange={(e) =>
                      setFormData({ ...formData, icono: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Módulo padre
                  </label>
                  <ModuloPadreTreeSelect
                    nodes={modulos}
                    value={formData.padre_id}
                    onChange={(id) =>
                      setFormData({
                        ...formData,
                        padre_id: id,
                      })
                    }
                    excludedIds={excludedParentIds}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Posición
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formData.orden}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orden: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {editingModulo &&
                    (editingModulo.mod_activo !== false ? (
                      <button
                        type="button"
                        onClick={handleInactivarModulo}
                        disabled={deactivating}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {deactivating ? "Inactivando..." : "Inactivar"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingModulo) return;
                          if (
                            !window.confirm(
                              `¿Seguro que deseas activar el módulo "${editingModulo.mod_nombre}"?`,
                            )
                          )
                            return;
                          setDeactivating(true);
                          try {
                            await modulosManagementService.activarModulo(
                              editingModulo.mod_id,
                            );
                            alert("Módulo activado correctamente");
                            closeModal();
                            await fetchModulos();
                          } catch (err: any) {
                            alert(err?.message || "Error activando módulo");
                          } finally {
                            setDeactivating(false);
                          }
                        }}
                        disabled={deactivating}
                        className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {deactivating ? "Activando..." : "Activar"}
                      </button>
                    ))}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={deactivating}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                    >
                      {editingModulo ? "Actualizar" : "Crear"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulosPage;
