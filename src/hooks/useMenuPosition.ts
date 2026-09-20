"use client";

import { useCallback, useEffect, useState } from "react";

export type MenuPosition = "top" | "left";

const STORAGE_KEY = "pc_menu_position";
const CHANGE_EVENT = "pc-menu-position-change";

function readStored(): MenuPosition {
  if (typeof window === "undefined") return "top";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "left" ? "left" : "top";
  } catch {
    return "top";
  }
}

// Preferencia de posición del menú (arriba/izquierda), por dispositivo — se
// guarda en localStorage, no en el perfil del usuario en BD (decisión
// explícita: no hace falta que viaje entre dispositivos). El toggle vive en
// /perfil; Layout.tsx lee este hook para decidir si renderiza el nav en el
// header o un Sidebar aparte. El evento custom `pc-menu-position-change`
// (además del nativo `storage`, que solo dispara en OTRAS pestañas) es lo
// que permite que Layout reaccione al cambio hecho en /perfil sin recargar
// la página, dentro de la misma pestaña.
export function useMenuPosition(): [MenuPosition, (value: MenuPosition) => void] {
  const [position, setPositionState] = useState<MenuPosition>("top");

  useEffect(() => {
    setPositionState(readStored());
    function handleChange() {
      setPositionState(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const setPosition = useCallback((value: MenuPosition) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage no disponible (modo privado, cuota llena, etc.) — la
      // preferencia simplemente no persiste, no es un error fatal.
    }
    setPositionState(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [position, setPosition];
}
