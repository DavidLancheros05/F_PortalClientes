"use client";

import { Plus } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onCreateClick?: () => void;
  showCreateButton?: boolean;
}

export function EmptyState({
  title = "No tienes PQRS creadas aún",
  description = "Crea una nueva PQRS para comenzar a reportar peticiones, quejas, reclamos o sugerencias.",
  onCreateClick,
  showCreateButton = true,
}: EmptyStateProps) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-200">
        <svg
          className="w-10 h-10 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">{description}</p>
      {showCreateButton && onCreateClick && (
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Crear nueva PQRS
        </button>
      )}
    </div>
  );
}
