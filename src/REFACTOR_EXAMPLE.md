# Ejemplo: Refactorizar con useFetch

## ANTES (con código repetido)

```typescript
"use client";

import { useState, useEffect } from "react";
import { rolesService } from "@/services/seguridad/roles.service";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await rolesService.getAll();
      setRoles(data);
    } catch (err) {
      setError(err.message);
      alert(err.message); // ❌ Alert feo
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async (rolData) => {
    try {
      await rolesService.create(rolData);
      alert("Rol creado"); // ❌ Alert feo
      await loadRoles();
    } catch (err) {
      alert(err.message); // ❌ Repetido
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{roles.map(...)}</div>;
}
```

## DESPUÉS (con useFetch + useNotification)

```typescript
"use client";

import { useEffect } from "react";
import { useFetch, useMutation } from "@/hooks/useFetch";
import { useNotification } from "@/context/NotificationContext";
import { rolesService } from "@/services/seguridad/roles.service";

export default function RolesPage() {
  const notification = useNotification();

  // ✅ Cargar datos
  const { data: roles, loading, execute: loadRoles } = useFetch(
    () => rolesService.getAll(),
    {
      onSuccess: () => notification.success("Roles cargados"),
      onError: (err) => notification.error(err.message),
    }
  );

  // ✅ Crear rol
  const { mutate: createRole, isLoading: isCreating } = useMutation(
    (rolData) => rolesService.create(rolData),
    {
      onSuccess: () => {
        notification.success("Rol creado exitosamente");
        loadRoles();
      },
      onError: (err) => notification.error(err.message),
    }
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreate = async (rolData) => {
    try {
      await createRole(rolData);
    } catch {
      // El error ya se mostró en onError
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {roles?.map((rol) => (
        <div key={rol.rol_id}>{rol.rol_nombre}</div>
      ))}
      <button
        onClick={() => handleCreate({...})}
        disabled={isCreating} // ✅ Botón deshabilitado mientras se procesa
      >
        {isCreating ? "Guardando..." : "Crear"}
      </button>
    </div>
  );
}
```

## Cambios principales

| Antes                             | Después                         |
| --------------------------------- | ------------------------------- |
| `setLoading`, `setError` manuales | `useFetch` automático           |
| `try/catch/finally` repetido      | Centralizado en el hook         |
| `alert()` para errores            | `useNotification()` elegante    |
| Botones sin estado de carga       | `disabled={isLoading}`          |
| Sin sincronización automática     | `onSuccess` callback automático |

## Beneficios

✅ **60% menos código**
✅ **Notificaciones hermosas** en lugar de alerts
✅ **Botones con estado** (deshabilitado mientras se procesa)
✅ **Sincronización automática** (recarga datos después de crear)
✅ **Manejo de errores consistente** en toda la app

## Próximo paso

Refactorizar todas las páginas para usar `useFetch` + `useNotification`
