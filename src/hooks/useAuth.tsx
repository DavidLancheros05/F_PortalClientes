// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function useAuth(requiredRoles?: number | number[]) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {

    console.log("hooks useAuth")
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return { user, logout };
}
