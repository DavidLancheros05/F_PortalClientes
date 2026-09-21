// Lógica pura de construcción del árbol de menú — extraída de Header.tsx
// para que Sidebar.tsx (menú a la izquierda) pueda mostrar exactamente los
// mismos módulos/agrupaciones virtuales/orden/permisos que el menú de
// arriba, sin duplicar ~200 líneas de reglas (agrupación de Solicitudes/
// Documentos/Indicadores, Formularios en Parametrización, etc.) que ya
// probaron ser frágiles a mano (ver comentarios originales en Header.tsx).

// Interfaz para los permisos
export interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

// Interfaz de módulo
export interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string; // Viene del backend
  mod_icono?: string; // Opcional
  mod_posicion?: number;
  mod_padre_id?: number | null;
  mod_activo?: boolean; // Estado del módulo
  permisos: Permisos;
  subModulos?: Modulo[]; // Puede tener submódulos
}

export function useMenuModel(modulos: Modulo[], isAdmin: boolean) {
  const normalizeText = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase();

  const getSubModulosConFallback = (modulo: Modulo): Modulo[] => {
    const subModulos = Array.isArray(modulo.subModulos)
      ? modulo.subModulos
      : [];
    const moduloNombre = String(modulo.mod_nombre || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase();

    const esParametrizacion = moduloNombre === "parametrizacion";
    const resolverJerarquiaSolicitudes = (items: Modulo[]): Modulo[] => {
      const esSolicitudes = normalizeText(modulo.mod_nombre) === "solicitudes";
      // Solo aplicar agrupación virtual (Solicitudes/Documentos/Indicadores)
      // al módulo "Solicitudes" raíz cuya ruta empieza con /solicitudes.
      // El módulo "Solicitudes" de Parametrización (/parametrizacion/solicitudes)
      // tiene hijos propios (Días de Respuesta, Motivos de Rechazo, etc.) que
      // no deben ser reagrupados ni filtrados.
      const rutaModulo = normalizeText(modulo.mod_ruta || "");
      if (!esSolicitudes || !rutaModulo.startsWith("/solicitudes")) {
        return items;
      }

      const childrenByName = new Map(
        items.map((item) => [normalizeText(item.mod_nombre), item]),
      );

      const categoriaSolicitudesExistente = childrenByName.get("solicitudes");
      const categoriaDocumentosExistente = childrenByName.get("documentos");
      const categoriaIndicadoresExistente = childrenByName.get("indicadores");

      if (
        categoriaSolicitudesExistente?.subModulos?.length ||
        categoriaDocumentosExistente?.subModulos?.length ||
        categoriaIndicadoresExistente?.subModulos?.length
      ) {
        return items;
      }

      const nuevos: Modulo[] = [];

      const solicitudesHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        // Excluir nodos que ya tienen sub-módulos (ej. "Flujo Solicitud")
        // para que no se agrupen en la categoría virtual "Solicitudes".
        if (Array.isArray(item.subModulos) && item.subModulos.length > 0)
          return false;
        if (!ruta)
          return nombre.includes("solicitud") && !nombre.includes("document");
        return (
          ruta.startsWith("/solicitudes") &&
          !ruta.includes("documento") &&
          !ruta.includes("indicador")
        );
      });

      const documentosHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        return (
          ruta.startsWith("/documentos") ||
          ruta.includes("documento") ||
          nombre.includes("documento")
        );
      });

      const indicadoresHijos = items.filter((item) => {
        const ruta = normalizeText(item.mod_ruta || "");
        const nombre = normalizeText(item.mod_nombre || "");
        return (
          ruta.startsWith("/indicadores") ||
          ruta.startsWith("/admin/indicadores") ||
          nombre.includes("indicador")
        );
      });

      const buildVirtualNode = (
        id: number,
        nombre: string,
        ruta: string,
        hijos: Modulo[],
      ): Modulo => ({
        mod_id: id,
        mod_nombre: nombre,
        mod_ruta: ruta,
        permisos: {
          ver: true,
          crear: false,
          editar: false,
          eliminar: false,
          aprobar: false,
        },
        subModulos: hijos,
      });

      if (categoriaSolicitudesExistente || solicitudesHijos.length > 0) {
        nuevos.push(
          categoriaSolicitudesExistente ||
            buildVirtualNode(
              -2101,
              "Solicitudes",
              "/solicitudes/solicitudes",
              solicitudesHijos,
            ),
        );
      }

      if (categoriaDocumentosExistente || documentosHijos.length > 0) {
        nuevos.push(
          categoriaDocumentosExistente ||
            buildVirtualNode(
              -2102,
              "Documentos",
              "/solicitudes/documentos",
              documentosHijos,
            ),
        );
      }

      if (categoriaIndicadoresExistente || indicadoresHijos.length > 0) {
        const hijosIndicadores = indicadoresHijos.length > 0
          ? indicadoresHijos
          : [
              buildVirtualNode(-2110, "Por área", "/solicitudes/indicadores", []),
              buildVirtualNode(-2111, "Por solicitud", "/solicitudes/indicadores/solicitud", []),
            ];
        nuevos.push(
          categoriaIndicadoresExistente ||
            buildVirtualNode(-2103, "Indicadores", "/solicitudes/indicadores", hijosIndicadores),
        );
      }

      return nuevos.length > 0 ? nuevos : items;
    };

    if (!isAdmin || !esParametrizacion) {
      return resolverJerarquiaSolicitudes(subModulos);
    }

    const subModulosConFormularios = (() => {
      const esItemFormulario = (item: Modulo) =>
        normalizeText(item.mod_ruta || "").startsWith(
          "/parametrizacion/formulario",
        );
      const hijosFormulario = subModulos.filter(esItemFormulario);
      if (hijosFormulario.length <= 1) return subModulos;

      const resto = subModulos.filter((item) => !esItemFormulario(item));
      const posicionGrupo = Math.min(
        ...hijosFormulario.map((h) => Number(h.mod_posicion ?? 0)),
      );

      return [
        ...resto,
        {
          mod_id: -1002,
          mod_nombre: "Formularios",
          mod_ruta: "/parametrizacion/formularios",
          mod_posicion: posicionGrupo,
          permisos: {
            ver: true,
            crear: false,
            editar: false,
            eliminar: false,
            aprobar: false,
          },
          subModulos: hijosFormulario,
        },
      ];
    })();

    return resolverJerarquiaSolicitudes(subModulosConFormularios);
  };

  const resolveModuloRoute = (modulo: Modulo): string | undefined => {
    const nombre = modulo.mod_nombre?.trim().toLowerCase();
    if (nombre === "mis solicitudes") {
      return "/solicitudes/cliente";
    }
    return modulo.mod_ruta;
  };

  const sortModulosByOrden = (items: Modulo[]): Modulo[] => {
    return [...items].sort((a, b) => {
      const ordenA = Number(a.mod_posicion ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b.mod_posicion ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.mod_id - b.mod_id;
    });
  };

  const tieneHijosConPermiso = (
    modulo: Modulo,
    visitados: Set<number> = new Set(),
  ): boolean => {
    // Guarda contra ciclos en mod_padre_id (ej. un módulo mal configurado
    // que termina siendo su propio ancestro) — sin esto, un dato corrupto
    // del backend cuelga el navegador con "Maximum call stack size
    // exceeded" en vez de simplemente no mostrar ese módulo.
    if (visitados.has(modulo.mod_id)) return false;
    visitados.add(modulo.mod_id);
    const hijos = getSubModulosConFallback(modulo);
    return hijos.some((hijo) => {
      if (hijo.mod_activo === false) return false;
      if (hijo.permisos?.ver) return true;
      return tieneHijosConPermiso(hijo, visitados);
    });
  };

  const hasVisibleDescendants = (modulo: Modulo): boolean => {
    const subItems = getSubModulosConFallback(modulo);
    return subItems.some((item) => {
      if (item.mod_activo === false) return false; // Filtrar inactivos
      if (item.permisos?.ver) return true;
      if (!Array.isArray(item.subModulos) || item.subModulos.length === 0) {
        return false;
      }
      return item.subModulos.some((nested) => nested.permisos?.ver);
    });
  };

  const topLevelModulos = sortModulosByOrden(modulos).filter(
    (m) => (m.mod_activo !== false) && (m.permisos.ver || hasVisibleDescendants(m)),
  );

  const mostrarRolDirecto = topLevelModulos.length === 0;

  // Lista plana de todo ítem navegable (con ruta propia y permiso de ver),
  // con su "breadcrumb" (nombres desde el módulo raíz hasta él) — para el
  // buscador del menú y para poder marcar cualquier ítem como favorito sin
  // importar en qué nivel de anidamiento esté.
  const getFlatSearchableItems = (): { modulo: Modulo; breadcrumb: string[] }[] => {
    const resultado: { modulo: Modulo; breadcrumb: string[] }[] = [];
    const visitados = new Set<number>();

    const visitar = (items: Modulo[], breadcrumb: string[]) => {
      for (const item of sortModulosByOrden(items)) {
        if (item.mod_activo === false) continue;
        if (visitados.has(item.mod_id)) continue; // guarda contra ciclos
        visitados.add(item.mod_id);
        const ruta = resolveModuloRoute(item);
        if (item.permisos?.ver && ruta) {
          resultado.push({ modulo: item, breadcrumb });
        }
        const hijos = getSubModulosConFallback(item);
        if (hijos.length > 0) {
          visitar(hijos, [...breadcrumb, item.mod_nombre]);
        }
      }
    };

    visitar(topLevelModulos, []);
    return resultado;
  };

  return {
    getSubModulosConFallback,
    resolveModuloRoute,
    sortModulosByOrden,
    tieneHijosConPermiso,
    hasVisibleDescendants,
    topLevelModulos,
    mostrarRolDirecto,
    getFlatSearchableItems,
  };
}

// Compara la ruta actual (usePathname()) contra la ruta de un módulo para
// decidir si debe verse "seleccionado" en el menú — exacta, o la actual es
// una subruta de la del módulo (ej. módulo "/solicitudes/nueva" activo
// también en "/solicitudes/nueva?clienteId=1" vía pathname, o en detalle
// anidado tipo "/pqrs/123" bajo un módulo "/pqrs"). No usa startsWith a
// secas para evitar falsos positivos tipo "/solicitudes" marcando activo
// también a "/solicitudes-otra-cosa".
export function isModuloActivo(
  pathname: string | null | undefined,
  ruta: string | undefined,
): boolean {
  if (!pathname || !ruta) return false;
  if (pathname === ruta) return true;
  return pathname.startsWith(`${ruta}/`);
}
