"use client";

import { useEffect, useRef, useState } from "react";
import { FilterField } from "./FilterField";

export interface EjecutivoFilterOption {
  id: string;
  nombre: string;
}

interface EjecutivoFilterFieldProps {
  label?: string;
  ejecutivos: EjecutivoFilterOption[];
  /** ejecutivo_id seleccionado como string, o "" cuando no hay filtro aplicado. */
  value: string;
  onChange: (ejecutivoId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Filtro de ejecutivo con búsqueda por nombre — mismo patrón que
// ClienteFilterField. El usuario puede escribir para filtrar sugerencias
// en vez de desplazarse por un <select> largo.
export function EjecutivoFilterField({
  label = "Ejecutivo",
  ejecutivos,
  value,
  onChange,
  disabled = false,
  placeholder = "Nombre del ejecutivo...",
  className,
}: EjecutivoFilterFieldProps) {
  const seleccionado =
    ejecutivos.find((e) => e.id === value) || null;
  const [busqueda, setBusqueda] = useState(
    seleccionado?.nombre ?? "",
  );
  const [mostrarLista, setMostrarLista] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Si el valor cambia desde afuera (ej. "Limpiar filtros"), sincroniza el
  // texto mostrado con el ejecutivo que corresponde a ese id.
  useEffect(() => {
    setBusqueda(seleccionado?.nombre ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!mostrarLista) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMostrarLista(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarLista]);

  const term = busqueda.trim().toLowerCase();
  const sugerencias = term
    ? ejecutivos.filter((e) =>
        e.nombre.toLowerCase().includes(term),
      )
    : ejecutivos;

  return (
    <FilterField
      label={label}
      className={`relative ${className ?? ""}`}
      ref={containerRef}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={busqueda}
        disabled={disabled}
        onFocus={() => setMostrarLista(true)}
        onChange={(event) => {
          setBusqueda(event.target.value);
          setMostrarLista(true);
          if (value) onChange("");
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      />
      {mostrarLista && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {value && (
            <div
              onClick={() => {
                onChange("");
                setBusqueda("");
                setMostrarLista(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-gray-500"
            >
              Todos
            </div>
          )}
          {sugerencias.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Sin resultados
            </div>
          ) : (
            sugerencias.map((ejecutivo) => (
              <div
                key={ejecutivo.id}
                onClick={() => {
                  onChange(ejecutivo.id);
                  setBusqueda(ejecutivo.nombre);
                  setMostrarLista(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {ejecutivo.nombre}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </FilterField>
  );
}
