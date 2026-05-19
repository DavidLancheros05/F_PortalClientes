# ⚠️ Deuda Técnica: Inconsistencia en Respuestas del Backend

## Problema

El backend devuelve respuestas con **estructuras inconsistentes** para el mismo endpoint. Esto obliga al frontend a usar "defensive programming" para extraer datos.

### Ejemplos Observados

#### Crear Solicitud (`POST /solicitudes`)

El endpoint devuelve el `solicitud_id` en **diferentes niveles**:

```json
// Formato 1 (esperado)
{
  "ok": true,
  "data": {
    "solicitud_id": 123
  }
}

// Formato 2 (también observado)
{
  "ok": true,
  "data": {
    "data": {
      "solicitud_id": 123
    }
  }
}

// Formato 3 (también observado)
{
  "ok": true,
  "solicitud_id": 123
}

// Formato 4 (también observado)
{
  "ok": true,
  "data": {
    "sol_id": 123
  }
}
```

### Frontend Workaround

Para manejar esto, el frontend usa:

```typescript
const solicitudId =
  response?.data?.data?.solicitud_id ||
  response?.data?.solicitud_id ||
  response?.data?.sol_id ||
  response?.solicitud_id ||
  response?.sol_id;
```

**Esto es una bandera roja.** Significa que el contrato del API no es estable.

---

## Impacto

1. **Código defensivo repetido** en múltiples lugares
2. **Difícil de mantener** — cambios en responses backend requieren cambios en frontend
3. **Riesgo de bugs** — si el backend devuelve una estructura nueva, el frontend puede silenciosamente fallar
4. **Mala experiencia de desarrollo** — qué estructura es "correcta"?
5. **Problemas en testing** — hay que mockear múltiples formatos

---

## Solución Recomendada

### Opción 1: Estandarizar Respuestas Backend ⭐ (PREFERIDA)

**Todos los endpoints deben devolver:**

```typescript
{
  ok: boolean,
  data: {
    [fields]: any  // datos específicos del endpoint
  },
  message?: string,
  error?: string
}
```

**Ejemplo:**

```json
{
  "ok": true,
  "data": {
    "solicitud_id": 123,
    "numero_solicitud": "SOL-2026-05-001",
    "cliente_id": 45,
    "estado_id": 2,
    "fecha_creacion": "2026-05-15T10:30:00Z"
  }
}
```

### Opción 2: Frontend Crea Adapter (Temporal)

Mientras se arregla el backend:

```typescript
// src/utils/response-normalizers.ts
export function extractSolicitudId(response: any): number {
  const id =
    response?.data?.data?.solicitud_id ||
    response?.data?.solicitud_id ||
    response?.data?.sol_id ||
    response?.solicitud_id ||
    response?.sol_id;

  if (!id || isNaN(id)) {
    throw new Error("No se pudo extraer solicitud_id");
  }

  return Number(id);
}
```

**Estado actual:** Opción 2 implementada (workaround)

---

## Checklist para Backend

- [ ] Auditar todos los endpoints en `/solicitudes`
- [ ] Documentar estructura esperada de respuesta
- [ ] Estandarizar a siempre devolver `{ ok, data, message? }`
- [ ] Asegurar `data` siempre contiene los campos específicos del endpoint
- [ ] Never nest `data.data`
- [ ] Actualizar documentación de OpenAPI/Swagger
- [ ] Hacer test para validar estructura de respuesta

---

## Referencias en Frontend

Este problema se maneja en:

- `src/utils/response-normalizers.ts` — Helper para extraer valores
- `src/services/solicitudes.service.ts` — Uso de `extractSolicitudId()`

Si el backend se arregla, estos helpers se pueden eliminar completamente.
