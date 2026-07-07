"use client";

import { useParams } from "next/navigation";
import SolicitudFormContent from "../../nueva/SolicitudFormContent";

export default function SolicitudDetalleClientePage() {
  const params = useParams();
  const id = Number(params.id);

  return <SolicitudFormContent solicitudId={id} readOnly />;
}
