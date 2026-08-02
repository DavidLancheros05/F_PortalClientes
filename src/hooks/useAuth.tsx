// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function useAuth(requiredRoles?: number | number[]) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Ya no hay `token` en localStorage (Fase 2 de la migración de auth —
    // el JWT real vive en la cookie httpOnly pc_token, invisible a JS). La
    // señal de "hay sesión" pasa a ser la sola presencia de `user`; la
    // credencial real la valida el backend en cada request via la cookie.
    const userStr = localStorage.getItem("user");

    if (!userStr) {
      const destino = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?next=${encodeURIComponent(destino)}`);
      return;
    }

    const parsedUser = JSON.parse(userStr);

    // Validación de rol
    // console.log("requiredRoles: ", requiredRoles)
    if (requiredRoles) {
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      if (!rolesArray.includes(parsedUser.rol_id)) {
        router.push("/unauthorized");
        return;
      }
    }

    // Validación de cliente habilitado
    if (parsedUser.rol_id === 2 && !parsedUser.clientes?.[0]?.cli_acceso_portal_clientes) {
      router.push("/unauthorized");
      return;
    }

    setUser(parsedUser);
  }, [router, requiredRoles]);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return { user, logout };
}
