"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// Paginador estándar para listados/tablas del portal — filas por página
// (mínimo 10) + indicador de página + anterior/siguiente. Reutilizar en
// vez de reimplementar paginación ad-hoc en cada página de listado.
export function TablePagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#eef1f6]">
      <div className="flex items-center gap-2 text-sm text-[#64748b]">
        <span>Filas por página:</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="border border-[#e2e8f0] rounded-lg px-2 py-1 text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#0050c7] focus:border-transparent"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-[#64748b]">
          Página <span className="font-semibold text-[#0f172a]">{page}</span>{" "}
          de <span className="font-semibold text-[#0f172a]">{totalPages}</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#475569] border border-[#e2e8f0] rounded-lg hover:bg-[#f1f5f9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#475569] border border-[#e2e8f0] rounded-lg hover:bg-[#f1f5f9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
