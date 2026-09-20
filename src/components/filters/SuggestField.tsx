"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterField } from "./FilterField";

interface SuggestFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** Pool crudo de candidatos (ej. `usuarios.map(u => u.nombre)`) — el
   * componente deduplica internamente y filtra por `value` cuando hay algo
   * escrito; con el campo vacío muestra todos los valores disponibles. */
  suggestions: string[];
  onEnter?: () => void;
  className?: string;
}

// Campo de filtro de texto libre con dropdown de sugerencias — al hacer foco
// (sin escribir nada) muestra todos los valores disponibles; al escribir, los
// acota a los que contengan el término. Generaliza el patrón que ya existía
// a mano en parametrizacion/clientes/acceso/page.tsx (razón social / NIT).
// Elegir una sugerencia solo llena el input, no dispara ninguna búsqueda —
// el filtro real se sigue aplicando con el botón Buscar (o Enter), igual
// que el resto de los filtros del proyecto. Ver
// documentacion/Portal Clientes/parte visual/rediseno-sugerencias-filtros-texto.md.
export function SuggestField({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  onEnter,
  className,
}: SuggestFieldProps) {
  const [mostrarLista, setMostrarLista] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Con el campo vacío se listan todos los valores disponibles (para poder
  // explorar el catálogo con solo hacer foco, sin tener que escribir algo
  // primero) — al escribir, se acota a los que contengan el término.
  const sugerencias = useMemo(() => {
    const term = value.trim().toLowerCase();
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const candidato of suggestions) {
      const texto = candidato ?? "";
      if (texto === "" || vistos.has(texto)) continue;
      if (term && !texto.toLowerCase().includes(term)) continue;
      vistos.add(texto);
      resultado.push(texto);
    }
    return resultado;
  }, [suggestions, value]);

  // No basta con onBlur del input: el clic sobre un ítem de la lista
  // dispara blur antes que el click, y el ítem nunca llega a seleccionarse.
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

  return (
    <FilterField label={label} className={`relative ${className ?? ""}`} ref={containerRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onFocus={() => setMostrarLista(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setMostrarLista(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {mostrarLista && sugerencias.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {sugerencias.map((texto) => (
            <div
              key={texto}
              onClick={() => {
                onChange(texto);
                setMostrarLista(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              {texto}
            </div>
          ))}
        </div>
      )}
    </FilterField>
  );
}
