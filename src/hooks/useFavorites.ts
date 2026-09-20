"use client";

import { useCallback, useEffect, useState } from "react";

export interface FavoritoModulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta: string;
}

const STORAGE_KEY = "pc_menu_favoritos";
const CHANGE_EVENT = "pc-menu-favoritos-change";

function readStored(): FavoritoModulo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoritoModulo =>
        item &&
        typeof item.mod_id === "number" &&
        typeof item.mod_nombre === "string" &&
        typeof item.mod_ruta === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(favoritos: FavoritoModulo[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));
  } catch {
    // localStorage no disponible — el favorito simplemente no persiste.
  }
}

// Favoritos del menú (páginas marcadas con la estrella) — igual que
// useMenuPosition, se guardan en localStorage por dispositivo, no en el
// perfil del usuario en BD. El evento custom permite que Sidebar y el panel
// de búsqueda del header (que pueden montarse en simultáneo, uno visible a
// la vez según el layout) se mantengan sincronizados sin recargar.
export function useFavorites() {
  const [favoritos, setFavoritos] = useState<FavoritoModulo[]>([]);

  useEffect(() => {
    setFavoritos(readStored());
    function handleChange() {
      setFavoritos(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const isFavorito = useCallback(
    (modId: number) => favoritos.some((f) => f.mod_id === modId),
    [favoritos],
  );

  const toggleFavorito = useCallback((item: FavoritoModulo) => {
    const actuales = readStored();
    const yaEsta = actuales.some((f) => f.mod_id === item.mod_id);
    const nuevos = yaEsta
      ? actuales.filter((f) => f.mod_id !== item.mod_id)
      : [...actuales, item];
    writeStored(nuevos);
    setFavoritos(nuevos);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { favoritos, isFavorito, toggleFavorito };
}
