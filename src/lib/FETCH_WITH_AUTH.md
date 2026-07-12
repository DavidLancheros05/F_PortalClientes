# fetchWithAuth - Guía de uso

Función utilitaria que automáticamente agrega el token JWT a todos los fetch hacia la API.

## Propósito

Evitar tener que repetir el código de obtener el token y agregarlo a los headers en cada página.

## Cómo usar

En lugar de:

```typescript
const token = localStorage.getItem("token");
const res = await fetch("/api/endpoint", {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

Simplemente usa:

```typescript
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const res = await fetchWithAuth("/api/endpoint", {
  method: "POST",
  body: JSON.stringify(data),
});
```

## Ventajas

- ✅ Automáticamente agrega el token JWT al header `Authorization`
- ✅ Reduce código repetitivo
- ✅ Punto centralizado para manejar autenticación
- ✅ Si el token cambia en el futuro, solo hay que modificar un archivo

## Ejemplos

### GET

```typescript
const roles = await fetchWithAuth("/api/seguridad/roles");
const json = await roles.json();
```

### POST

```typescript
const res = await fetchWithAuth("/api/clientes", {
  method: "POST",
  body: JSON.stringify({ razonSocial: "Mi Empresa" }),
});
```

### PUT

```typescript
const res = await fetchWithAuth(`/api/roles/${id}`, {
  method: "PUT",
  body: JSON.stringify({ rolNombre: "Admin" }),
});
```

### PATCH

```typescript
const res = await fetchWithAuth(`/api/tipos/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ estado: true }),
});
```

## Headers personalizados

Si necesitas agregar headers adicionales, pasalos normalmente:

```typescript
const res = await fetchWithAuth("/api/endpoint", {
  method: "POST",
  headers: {
    "X-Custom-Header": "value",
  },
  body: JSON.stringify(data),
});
```

El token JWT se agregará automáticamente.

## Regla de oro

**Nunca hagas `fetch()` directo hacia `/api/*` sin usar `fetchWithAuth`.**
