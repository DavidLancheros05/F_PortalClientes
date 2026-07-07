"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CrearUsuariosPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/seguridad/usuarios?new=true");
  }, [router]);

  return null;
}
