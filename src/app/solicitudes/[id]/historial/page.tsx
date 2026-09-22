"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SolicitudHistorialPage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = params?.id;

  useEffect(() => {
    if (solicitudId) {
      router.replace(`/solicitudes/${solicitudId}/detalle`);
    }
  }, [router, solicitudId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-from text-sm text-gray-500">
      Cargando detalle de la solicitud...
    </div>
  );
}
