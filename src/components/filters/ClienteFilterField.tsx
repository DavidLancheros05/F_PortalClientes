"use client";

import { useEffect, useRef, useState } from "react";
import { FilterField } from "./FilterField";

export interface ClienteFilterOption {
  cli_id: number;
  cli_razon_social: string;
  cli_nro_identificacion?: string | null;
}

interface ClienteFilterFieldProps {
  label?: string;
  clientes: ClienteFilterOption[];
  /** cli_id seleccionado como string, o "" cuando no hay filtro aplicado. */
  value: string;
  onChange: (cliId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Filtro de cliente estándar: campo de texto que busca por razón social o
// NIT y muestra sugerencias apenas se empieza a escribir (o al hacer foco,
// si está vacío) — reemplaza los <select> de "Cliente" que antes obligaban
// a desplazarse por decenas de clientes sin poder buscar por NIT. Reutilizar
// en toda página con un filtro de cliente en vez de reimplementar el
// dropdown a mano.
export function ClienteFilterField({
  label = "Cliente",
  clientes,
  value,
  onChange,
  disabled = false,
  placeholder = "Nombre o NIT...",
  className,
}: ClienteFilterFieldProps) {
  const seleccionado = clientes.find((c) => String(c.cli_id) === value) || null;
  const [busqueda, setBusqueda] = useState(seleccionado?.cli_razon_social ?? "");
  const [mostrarLista, setMostrarLista] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Si el valor cambia desde afuera (ej. "Limpiar filtros", o el propio
  // padre resetea la selección por otra dependencia), sincroniza el texto
  // mostrado con el cliente que corresponde a ese cli_id.
  useEffect(() => {
    setBusqueda(seleccionado?.cli_razon_social ?? "");
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
    ? clientes.filter(
        (c) =>
          c.cli_razon_social.toLowerCase().includes(term) ||
          (c.cli_nro_identificacion || "").toLowerCase().includes(term),
      )
    : clientes;

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
            sugerencias.map((cliente) => (
              <div
                key={cliente.cli_id}
                onClick={() => {
                  onChange(String(cliente.cli_id));
                  setBusqueda(cliente.cli_razon_social);
                  setMostrarLista(false);
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {cliente.cli_razon_social}
                </div>
                {cliente.cli_nro_identificacion && (
                  <div className="text-xs text-gray-500">
                    NIT {cliente.cli_nro_identificacion}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </FilterField>
  );
}
