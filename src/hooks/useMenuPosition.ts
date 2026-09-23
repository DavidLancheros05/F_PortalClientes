"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import api from "@/services/core/api";

export type MenuPosition = "top" | "left";

// Cache local solo para pintar sin parpadeo antes de que AuthContext termine
// de restaurar el usuario (que sí trae menu_position, ver login.dto en el
// backend) — NO es la fuente de verdad. La fuente de verdad es la cuenta en
// BD (cli_menu_posicion/usr_menu_posicion), para que la preferencia viaje
// entre dispositivos y no se pierda si algo limpia localStorage (ver
// clearSessionStorage). Antes esto vivía solo en localStorage
// (pc_menu_position) y quedaba atado a cada navegador.
const CACHE_KEY = "pc_menu_position_cache";
// Clave vieja (localStorage-solamente, previa a que esto viviera en BD) —
// se sigue leyendo una sola vez como fallback para no perder la preferencia
// de quien ya la tenía configurada en este navegador.
const LEGACY_KEY = "pc_menu_position";

function readCache(): MenuPosition {
  if (typeof window === "undefined") return "top";
  try {
    const value =
      window.localStorage.getItem(CACHE_KEY) ??
      window.localStorage.getItem(LEGACY_KEY);
    return value === "left" ? "left" : "top";
  } catch {
    return "top";
  }
}

function writeCache(value: MenuPosition) {
  try {
    window.localStorage.setItem(CACHE_KEY, value);
  } catch {
    // localStorage no disponible — la preferencia sigue viajando por BD.
  }
}

export function useMenuPosition(): [MenuPosition, (value: MenuPosition) => void] {
  const { user, setMenuPositionLocal } = useContext(AuthContext);
  const [position, setPositionState] = useState<MenuPosition>(readCache);

  // Cuando el perfil del usuario carga/cambia (login, otra pestaña, etc.),
  // la posición guardada en BD manda sobre el cache local.
  useEffect(() => {
    if (user?.menu_position === "left" || user?.menu_position === "top") {
      setPositionState(user.menu_position);
      writeCache(user.menu_position);
    }
  }, [user?.menu_position]);

  const setPosition = useCallback(
    (value: MenuPosition) => {
      // Optimista: refleja el cambio de inmediato, sin esperar la respuesta.
      setPositionState(value);
      writeCache(value);
      setMenuPositionLocal(value);
      api.patch("/auth/menu-position", { position: value }).catch((err) => {
        console.error("[useMenuPosition] No se pudo guardar la preferencia:", err);
      });
    },
    [setMenuPositionLocal],
  );

  return [position, setPosition];
}
