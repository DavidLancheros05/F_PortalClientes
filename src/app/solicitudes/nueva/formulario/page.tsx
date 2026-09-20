"use client";

import { useContext, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { useUltimaSolicitud } from "@/hooks/useUltimaSolicitud";
import SolicitudFormContent from "../SolicitudFormContent";

export default function NuevaSolicitudFormularioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const esCliente =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "CLIENTE";
  const clienteIdParam = Number(searchParams.get("clienteId"));
  const clienteId = esCliente
    ? user?.cliente_id
    : Number.isFinite(clienteIdParam) && clienteIdParam > 0
      ? clienteIdParam
      : undefined;

  const { ultimaSolicitud, loading, tieneBorrador, puedeCrearNueva } = useUltimaSolicitud({
    clienteId,
    enabled: !authLoading && !!clienteId,
  });

  useEffect(() => {
    if (!loading && tieneBorrador && ultimaSolicitud?.sol_id) {
      router.replace(`/solicitudes/${ultimaSolicitud.sol_id}/editar`);
    }
  }, [loading, tieneBorrador, ultimaSolicitud, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-5.8rem)] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Preparando formulario...</p>
        </div>
      </div>
    );
  }

  if (!clienteId) {
    return (
      <div className="flex min-h-[calc(100vh-5.8rem)] items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="text-base font-bold text-slate-900">Selecciona un cliente primero</h1>
          <p className="mt-2 text-sm text-slate-600">
            Regresa al inicio de la solicitud para elegir el ejecutivo y el cliente.
          </p>
          <button
            type="button"
            onClick={() => router.push("/solicitudes/nueva")}
            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!puedeCrearNueva && !tieneBorrador) {
    return (
      <div className="flex min-h-[calc(100vh-5.8rem)] items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="text-base font-bold text-slate-900">Ya tienes una solicitud en proceso</h1>
          <p className="mt-2 text-sm text-slate-600">
            Debes esperar a que se resuelva antes de crear una nueva solicitud.
          </p>
          <button
            type="button"
            onClick={() => router.push("/solicitudes/nueva")}
            className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <SolicitudFormContent
      clienteId={esCliente ? undefined : clienteId}
      ultimaSolicitud={ultimaSolicitud}
      // Fijo en vez de depender de router.back(): a esta página siempre se
      // llega desde /solicitudes/nueva (el selector de cliente para
      // usuarios internos, o el punto de entrada directo para CLIENTE), así
      // que "Atrás" debe volver siempre ahí — sin este returnTo,
      // handleVolver caía a window.history.length/router.back(), que podía
      // saltar más lejos si el navegador no tenía en su historial la
      // página /solicitudes/nueva (ej. se entró por URL directa).
      returnTo="/solicitudes/nueva"
    />
  );
}
