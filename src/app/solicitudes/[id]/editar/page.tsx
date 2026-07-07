"use client";

import { useParams, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import SolicitudFormContent from "../../nueva/SolicitudFormContent";

export default function EditarSolicitudPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idStr = String(params.id);
  const returnTo = searchParams.get("returnTo");

  console.log("[EditarSolicitudPage] Renderizando con ID:", idStr);

  // Solo permitir IDs numéricos
  const isValidId = /^\d+$/.test(idStr);

  console.log("[EditarSolicitudPage] ¿Es válido?", isValidId);

  // Si no es válido, llamar a notFound() para que Next.js busque otras rutas
  if (!isValidId) {
    console.log("[EditarSolicitudPage] ID inválido, llamando notFound()");
    notFound();
  }

  console.log("[EditarSolicitudPage] Renderizando SolicitudFormContent con ID:", idStr);
  const id = Number(idStr);
  return <SolicitudFormContent solicitudId={id} readOnly={false} returnTo={returnTo || undefined} />;
}
