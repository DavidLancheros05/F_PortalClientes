"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { useMenuModel, isModuloActivo, type Modulo } from "@/components/layout/useMenuModel";
import { useFavorites } from "@/hooks/useFavorites";

interface Props {
  modulos: Modulo[];
  isAdmin: boolean;
  pathname: string | null;
  /** Se llama al hacer click en un resultado/favorito — usado para cerrar
   * el popover en el layout "top" (en el Sidebar no hace falta, es fijo). */
  onNavigate?: () => void;
  /** "dark" (default): fondo/inputs para el Sidebar, que es azul de marca.
   * "light": fondo blanco, para el popover del header. */
  variant?: "dark" | "light";
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Buscador + favoritos del menú — compartido entre Sidebar (layout
// "izquierda", siempre visible) y el popover del Header (layout "arriba").
// Con el campo de búsqueda vacío muestra los favoritos marcados con
// estrella; al escribir, los reemplaza por resultados que coincidan por
// nombre en cualquier nivel del árbol (no solo el nivel raíz).
export function MenuSearchPanel({ modulos, isAdmin, pathname, onNavigate, variant = "dark" }: Props) {
  const { getFlatSearchableItems } = useMenuModel(modulos, isAdmin);
  const { favoritos, isFavorito, toggleFavorito } = useFavorites();
  const [term, setTerm] = useState("");

  const items = useMemo(() => getFlatSearchableItems(), [modulos, isAdmin]);

  const resultados = useMemo(() => {
    const buscado = normalize(term);
    if (!buscado) return [];
    return items.filter(({ modulo, breadcrumb }) =>
      normalize([...breadcrumb, modulo.mod_nombre].join(" ")).includes(buscado),
    );
  }, [items, term]);

  const isDark = variant === "dark";
  const inputClass = isDark
    ? "w-full pl-9 pr-8 py-2 rounded-lg bg-white/14 placeholder:text-white/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
    : "w-full pl-9 pr-8 py-2 rounded-lg border border-[#e5e7eb] text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-brand-500";
  const iconClass = isDark ? "text-white/60" : "text-[#94a3b8]";
  const sectionLabelClass = isDark ? "text-white/60" : "text-[#94a3b8]";
  const rowClass = (activo: boolean) =>
    isDark
      ? `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
          activo ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/14"
        }`
      : `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
          activo ? "bg-[#e7edfb] text-brand-600 font-semibold" : "text-[#0f172a] hover:bg-[#f1f5f9]"
        }`;
  const starIdleClass = isDark ? "text-white/40 hover:text-white" : "text-[#cbd5e1] hover:text-amber-500";

  const renderItem = (modulo: Modulo, breadcrumb: string[]) => {
    const ruta = modulo.mod_ruta;
    const activo = isModuloActivo(pathname, ruta);
    const favorito = isFavorito(modulo.mod_id);
    return (
      <div key={modulo.mod_id} className="group flex items-center gap-1">
        <Link href={ruta} onClick={onNavigate} className={`flex-1 min-w-0 ${rowClass(activo)}`}>
          <span className="truncate">
            {breadcrumb.length > 0 && (
              <span className={`${isDark ? "text-white/50" : "text-[#94a3b8]"} font-normal`}>
                {breadcrumb.join(" / ")} /{" "}
              </span>
            )}
            {modulo.mod_nombre}
          </span>
        </Link>
        <button
          type="button"
          onClick={() =>
            toggleFavorito({
              mod_id: modulo.mod_id,
              mod_nombre: modulo.mod_nombre,
              mod_ruta: ruta,
            })
          }
          title={favorito ? "Eliminar de favoritos" : "Agregar a favoritos"}
          className={`shrink-0 p-1.5 rounded-md transition-colors ${favorito ? "text-amber-400" : starIdleClass}`}>
          <Star className="w-4 h-4" fill={favorito ? "currentColor" : "none"} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${iconClass}`} />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar en el menú..."
          className={inputClass}
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm("")}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${iconClass}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {term ? (
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className={`px-2.5 py-2 text-sm ${sectionLabelClass}`}>Sin resultados</p>
          ) : (
            resultados.map(({ modulo, breadcrumb }) => renderItem(modulo, breadcrumb))
          )}
        </div>
      ) : favoritos.length > 0 ? (
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          <p className={`px-2.5 pt-1 pb-1 text-[10.5px] font-bold uppercase tracking-wide ${sectionLabelClass}`}>
            Favoritos
          </p>
          {favoritos.map((f) => (
            <div key={f.mod_id} className="group flex items-center gap-1">
              <Link
                href={f.mod_ruta}
                onClick={onNavigate}
                className={`flex-1 min-w-0 ${rowClass(isModuloActivo(pathname, f.mod_ruta))}`}>
                <span className="truncate">{f.mod_nombre}</span>
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorito(f)}
                title="Eliminar de favoritos"
                className="shrink-0 p-1.5 rounded-md text-amber-400">
                <Star className="w-4 h-4" fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
