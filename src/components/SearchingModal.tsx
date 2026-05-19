"use client";

import { useSearching } from "@/context/SearchingContext";

export function SearchingModal() {
  const { isSearching } = useSearching();

  if (!isSearching) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg font-semibold text-gray-800">Buscando solicitudes...</p>
          <p className="text-sm text-gray-500">Por favor espera mientras consultamos los datos</p>
        </div>
      </div>
    </div>
  );
}
