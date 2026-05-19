// src/app/solicitudes/nueva/page.tsx
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { useUltimaSolicitud } from "@/hooks/useUltimaSolicitud";
import SolicitudFormContent from "./SolicitudFormContent";
import { AlertCircle } from "lucide-react";

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useContext(AuthContext);

  const { ultimaSolicitud, loading: solicitudLoading, tieneBorrador, puedeCrearNueva } = useUltimaSolicitud({
    clienteId: user?.cliente_id,
    enabled: !authLoading && !!user?.cliente_id,
  });

  // Si hay una solicitud BORRADOR, redirige a editarla (Caso 2)
  useEffect(() => {
    if (!solicitudLoading && tieneBorrador && ultimaSolicitud?.sol_id) {
      console.log(`[📝 NUEVA SOLICITUD] Redirigiendo a BORRADOR existente: ${ultimaSolicitud.sol_id}`);
      router.replace(`/solicitudes/${ultimaSolicitud.sol_id}/editar`);
    }
  }, [solicitudLoading, tieneBorrador, ultimaSolicitud, router]);

  if (authLoading || solicitudLoading) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Verificando solicitudes...</p>
        </div>
      </div>
    );
  }

  // Si no puede crear nueva (tiene PENDIENTE/REVISIÓN activa)
  if (!puedeCrearNueva) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Solicitud en Proceso</h2>
            <p className="text-sm text-gray-600 mb-4">
              Actualmente tienes una solicitud activa. Complétala antes de crear una nueva.
            </p>
            <button
              onClick={() => router.push("/solicitudes/cliente")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Ver mis solicitudes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Crear nueva solicitud (Caso 1 o Caso 5)
  return <SolicitudFormContent />;
}
