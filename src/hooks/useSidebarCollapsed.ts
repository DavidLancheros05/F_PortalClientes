"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pc_sidebar_collapsed";
const CHANGE_EVENT = "pc-sidebar-collapsed-change";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Si el Sidebar (layout "izquierda") está colapsado a una franja angosta —
// mismo criterio de persistencia que useMenuPosition/useFavorites
// (localStorage por dispositivo, no en el perfil del usuario en BD).
export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(readStored());
    function handleChange() {
      setCollapsedState(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // localStorage no disponible — no persiste, pero el toggle sigue
      // funcionando en memoria para esta sesión.
    }
    setCollapsedState(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [collapsed, setCollapsed];
}
