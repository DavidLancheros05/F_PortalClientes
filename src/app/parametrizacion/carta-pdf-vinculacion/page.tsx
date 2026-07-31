"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Esta pantalla se fusionó con "Tipos de documentos" el 2026-07-27 — la
// Carta de Vinculación ahora es un Tipos_documentos con
// tdo_origen='CARTA_APROBACION', usando el mismo editor (negrilla, tamaño,
// viñeta) que el resto de documentos en vez de tener su propia pantalla con
// un <textarea> plano. Ver
// documentacion/mejoras/rediseno-gestionar-comite-credito.md y la migración
// 20260727_unificar_carta_vinculacion_en_tipos_documentos.sql. Se deja este
// redirect (en vez de borrar la ruta) por si algún acceso directo viejo
// sigue apuntando acá.
export default function CartaPdfVinculacionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/parametrizacion/documentos");
  }, [router]);

  return null;
}
