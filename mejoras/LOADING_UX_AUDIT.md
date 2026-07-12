# Auditoría: renderizar primero, cargar datos después

## Contexto

Varias páginas bloquean el render completo con un `if (loading) return <LoadingModal ... />`
(o similar) hasta que termina de responder el backend — mientras tanto no se ve nada más
que un modal de carga, aunque el resto del layout (header, títulos, botones) no dependa
de esos datos. Eso se siente más lento de lo que realmente es.

**Patrón de arreglo**: quitar el `return` que bloquea toda la página, dejar que el shell
se renderice de inmediato, y mostrar un indicador de carga puntual solo dentro de las
secciones que sí dependen del fetch (listas, tablas, paneles), como en `formulario-editor`.

## Ya corregidas

- **`src/app/parametrizacion/formulario-editor/page.tsx`** — quitado el
  `if (loading) return <LoadingModal .../>` que bloqueaba toda la página. Ahora el header
  y los dos paneles (Secciones / Preguntas) se renderizan de inmediato; cada panel muestra
  "Cargando secciones..." / "Cargando preguntas..." mientras llega la data. También se
  corrigió el aviso de "esta versión no tiene preguntas" para que no aparezca falsamente
  mientras `loading` sigue en `true`.

- **`src/app/solicitudes/mis-documentos/page.tsx`** — el header y los botones ya
  renderizaban de inmediato (no era un bloqueo total), pero la carga se sentía lenta
  por una causa distinta: el backend (`GET /solicitudes/mis-documentos`) calculaba
  el representante legal en cada carga reconstruyendo el formulario renderizable
  completo (`FormularioRenderizableService`), el paso más caro de todo el endpoint,
  aunque ese dato solo se usa si el cliente llega a pulsar "Descargar plantilla".
  Se extrajo a un endpoint aparte (`GET /solicitudes/:id/representante-legal`) que
  el frontend solo pide bajo demanda, justo antes de generar una plantilla de tipo
  `TEXTO` (las de tipo `PDF_SOLICITUD` ni lo necesitan). De paso se cambió el
  placeholder de "Cargando tus documentos..." por un skeleton de filas en vez de
  una caja de texto plana.

- **`src/app/solicitudes/nueva/SolicitudFormContent.tsx`** (usada tanto por
  `/solicitudes/nueva` como por `/solicitudes/[id]/editar`) — el
  `if (loadingInitial || secciones.length === 0) return (...)` reemplazaba la
  página entera por una pantalla de "Cargando formulario..." sin encabezado
  ni botón "Atrás". Ahora el encabezado (título, versión, botón Atrás) se
  renderiza de inmediato y solo el cuerpo (sidebar de secciones + panel de
  preguntas) alterna entre el indicador de carga y el contenido real.

- **`src/app/solicitudes/[id]/detalle/page.tsx`** — el `if (loading) return
  <LoadingModal .../>` bloqueaba toda la página. Ahora el contenedor y el
  botón "Volver" se renderizan de inmediato; la tarjeta de encabezado
  muestra un skeleton mientras carga y el grid de secciones muestra tarjetas
  skeleton hasta que llega la respuesta del backend.

## Pendientes por revisar

Encontradas por tener un `if (loading)` (u otro nombre de bandera similar) que podría estar
bloqueando el render completo — falta confirmar cada una y aplicar el mismo patrón:

- `src/app/dashboard/page.tsx`
- `src/app/parametrizacion/clientes/[id]/page.tsx`
- `src/app/parametrizacion/formularios/page.tsx`
- `src/app/parametrizacion/formularios/[formularioId]/versiones/page.tsx`
- `src/app/parametrizacion/formulario-preguntas/[id]/opciones/components/OpcionesTable.tsx`
- `src/app/pqrs/[id]/page.tsx`
- `src/app/pqrs/gestionar/[id]/page.tsx`
- `src/app/solicitudes/gestion-auxiliar-servicio-al-cliente/[id]/gestionar/page.tsx`
- `src/app/solicitudes/gestion-comite-credito-1/[id]/gestionar/page.tsx`
- `src/app/solicitudes/gestion-comite-credito-2/[id]/gestionar/page.tsx`
- `src/app/solicitudes/gestion-ejecutivo-negocios/[id]/registrar/page.tsx`
- `src/app/solicitudes/gestion-oficial-de-cumplimiento/[id]/gestionar/page.tsx`

Nota: esta lista salió de un `grep` por el patrón `if (loading)` en `src/app` — puede haber
páginas con el mismo problema usando otro nombre de variable (`cargando`, `isLoading`, etc.)
que no quedaron capturadas. También falta confirmar, página por página, si el `if (loading)`
realmente bloquea todo el render o si ya tienen un manejo parcial aceptable.
