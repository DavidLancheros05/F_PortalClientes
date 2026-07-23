"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Search } from "lucide-react";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface SearchableSelectProps {
  options: Array<{ id: string | number; label: string }>;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción",
  disabled = false,
  searchPlaceholder = "Buscar...",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options?.find(
    (opt) => String(opt.id) === String(value)
  );

  const searchTermNormalizado = normalizar(searchTerm);
  const filteredOptions = !options || options.length === 0
    ? []
    : searchTermNormalizado === ""
      ? options
      : options.filter((opt) => {
          const label = normalizar(String(opt.label));
          return label.includes(searchTermNormalizado);
        });

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionId: string | number) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-2 py-1 rounded border border-gray-300 bg-white text-left text-sm text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && !disabled && (
            <X
              className="w-4 h-4 text-gray-500 hover:text-gray-700"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-max"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: menuPosition.width,
            maxWidth: `calc(100vw - ${menuPosition.left + 10}px)`,
          }}
        >
          {/* Buscador */}
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm || ""}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Lista de opciones */}
          <ul className="max-h-64 overflow-y-auto">
            {!options || options.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-gray-500">
                No hay opciones disponibles
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-gray-500">
                No se encontraron opciones para "{searchTerm}"
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                if (!option || !option.id) return null;
                return (
                  <li key={`${option.id}-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        String(option.id) === String(value)
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
