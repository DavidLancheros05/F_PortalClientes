"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import SolicitudFormContent from "../nueva/SolicitudFormContent";

export default function VerSolicitudPage() {
  const params = useParams();
  const idStr = String(params.id);

  // console.log("[VerSolicitudPage] Renderizando con ID:", idStr);

  // Solo permitir IDs numéricos
  const isValidId = /^\d+$/.test(idStr);

  // console.log("[VerSolicitudPage] ¿Es válido?", isValidId);

  // Si no es válido, llamar a notFound() para que Next.js busque otras rutas
  if (!isValidId) {
    // console.log("[VerSolicitudPage] ID inválido, llamando notFound()");
    notFound();
  }

  // console.log("[VerSolicitudPage] Renderizando SolicitudFormContent con ID:", idStr);
  const id = Number(idStr);
  return <SolicitudFormContent solicitudId={id} readOnly />;
}
