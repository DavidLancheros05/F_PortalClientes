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

// Máximo de botones de número de página a mostrar a la vez (sin contar
// primera/última cuando quedan fuera del rango visible).
const VISIBLE_PAGES = 5;

// Paginador estándar para listados/tablas del portal — filas por página
// (mínimo 10) + botones de número de página + anterior/siguiente. Reutilizar
// en vez de reimplementar paginación ad-hoc en cada página de listado.
export function TablePagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  let pageStart = Math.max(1, page - Math.floor(VISIBLE_PAGES / 2));
  let pageEnd = Math.min(totalPages, pageStart + VISIBLE_PAGES - 1);
  if (pageEnd - pageStart + 1 < VISIBLE_PAGES) {
    pageStart = Math.max(1, pageEnd - VISIBLE_PAGES + 1);
  }
  const pageNumbers = Array.from(
    { length: pageEnd - pageStart + 1 },
    (_, i) => pageStart + i,
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#eef1f6]">
      <div className="flex items-center gap-2 text-sm text-[#64748b]">
        <span>Filas por página:</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="border border-[#e2e8f0] rounded-lg px-2 py-1 text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 items-center flex-wrap justify-center">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#475569] border border-[#e2e8f0] rounded-lg hover:bg-[#f1f5f9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="flex items-center gap-1">
          {pageStart > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f1f5f9] transition-colors"
              >
                1
              </button>
              {pageStart > 2 && <span className="px-2 text-[#94a3b8]">…</span>}
            </>
          )}

          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-brand-600 text-white"
                  : "border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"
              }`}
            >
              {p}
            </button>
          ))}

          {pageEnd < totalPages && (
            <>
              {pageEnd < totalPages - 1 && (
                <span className="px-2 text-[#94a3b8]">…</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f1f5f9] transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

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
  );
}
