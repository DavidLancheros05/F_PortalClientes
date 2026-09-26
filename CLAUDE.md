# Frontend_Portal (F_PortalClientes)

Next.js App Router (`src/app/**/page.tsx`), Tailwind v4, deploy en Vercel.
`npm run dev` levanta en el puerto **4002** (`next dev -p 4002`). Contexto
general del proyecto (repos, puertos, sesión, cómo verificar) en
`C:\DAVID\CN\CLAUDE.md`.

## Llegada al backend

- **Todo** el tráfico al backend pasa por URL relativa `/api/*`: el cliente axios
  (`src/services/core/api.ts`, `baseURL = "/api"`, `withCredentials: true`) y
  cualquier link directo (ej. `getArchivoPreviewUrl`). El rewrite de
  `next.config.ts` lo reenvía a `${BACKEND_URL}/api/*`. Así la cookie
  `pc_token` es de primera parte (antes, con URL absoluta a onrender.com,
  Safari y el bloqueo de cookies de terceros la descartaban).
- `BACKEND_URL` se resuelve en **build time**. Si falta o queda viejo en Vercel,
  el rewrite cae al default `http://127.0.0.1:3001` y todo `/api/*` da 404
  "Cannot GET". Cambiar la env var en Vercel no alcanza: hay que forzar un
  redeploy **sin build cache**.
- Servicios en `src/services/*.service.ts` (uno por dominio), todos sobre `api.ts`.

## Autenticación y rutas protegidas

- El gate no es un `middleware.ts` sino **`src/proxy.ts`**: verifica la cookie
  `pc_token` con `JWT_SECRET` (mismo valor que el backend, en `.env.local`) y
  si falta o es inválida redirige a `/login` con 307 antes de cargar la página.
- `matcher` actual: `/inicio`, `/solicitudes`, `/pedidos`, `/consultas`, `/pqrs`,
  `/parametrizacion`, `/seguridad`, `/perfil`. **Una carpeta nueva de primer
  nivel en `src/app` que no esté ahí carga sin login.**
- Sesión en el cliente: `src/context/AuthContext.tsx` + `localStorage.user`
  (perfil). No hay `localStorage.token`.

## Menú dinámico

- El menú sale 100% de BD (`pc_modulos` + `pc_rol_modulo`), no de las rutas del
  código. Llega en la respuesta del login, se guarda en `localStorage.modulos`
  y lo pintan `Header.tsx`/`Sidebar.tsx` vía
  `src/components/layout/useMenuModel.ts`. Un cambio de permisos no se ve hasta
  volver a iniciar sesión. Checklist en
  `documentacion/Portal Clientes/Login permisos/menu-dinamico-pc-modulos.md`.
- Página nueva que deba verse en el menú: migración que inserte el módulo en
  `pc_modulos` **y** sus filas `rm_ver=1` en `pc_rol_modulo` (plantillas:
  `20260716_actualizar_modulos_pqrs.sql`, `20260721_crear_modulos_consultas.sql`).
- La ruta de un módulo se elige en `seguridad/modulos/page.tsx` con un `<select>`
  que solo ofrece páginas existentes, leídas de `src/data/app-routes.json`.
  **Orden**: construir la página → `npm run routes:generate` → crear/editar el
  módulo. Si la ruta no aparece en el select, `app-routes.json` está viejo.
- Un módulo padre con hijos nunca es clickeable, solo despliega (por diseño). Si
  el padre debe ser visitable, agregarle un hijo propio con su misma ruta.
- Si un módulo "no aparece" y los permisos se ven bien, revisar que `mod_ruta`
  sea una página que exista de verdad.

## UI y patrones

- Tablas: nunca armar `<th>`/`<td>` a mano, usar los componentes compartidos
  Th/Td/Tr (columna Acciones con `sticky`).
- Errores y confirmaciones con `ErrorModal`/modales del sistema de diseño, no
  `alert()`/`confirm()`. Sistema de diseño en `documentacion/Portal Clientes/parte visual/`.
- Las páginas deben renderizar de inmediato, con carga parcial por sección, no un
  spinner de pantalla completa. Estado en
  `documentacion/Portal Clientes/parte visual/LOADING_UX_AUDIT.md`.
- Filtros de listados en la URL (`useSearchParams` + `router.replace`) para que
  sobrevivan al "Volver".
- Un ancestro con `backdrop-blur`/`filter` crea containing block para hijos
  `position: fixed`: los modales de pantalla completa van con
  `createPortal(..., document.body)`.
- Plantillas de documento con placeholders (`{{cliente_nombre}}`,
  `{{cliente_nit}}`, `{{numero_solicitud}}`, `{{representante_legal_*}}`) se
  generan aquí con `html2pdf.js` en `src/lib/carta-pdf.util.ts`.

## Gotchas

- **Turbopack puede servir CSS cacheado** aun después de reiniciar `npm run dev`
  (ej. tokens nuevos en `@theme` de `globals.css` que no llegan). Fix: borrar
  `.next` antes de volver a correr `npm run dev`.
- `npx tsc --noEmit` como chequeo intermedio; `npm run build` solo antes de
  pushear (Vercel revienta con errores que `next dev` no muestra).
- `npm run db:doc` (`scripts/generate-db-doc.ts`) genera `DATABASE.md` en la
  raíz del repo (hoy no existe; requiere `.env.local` con `DB_SERVER`/`DB_PORT`/
  `DB_USER`/`DB_PASSWORD`/`DB_NAME`). Para el esquema actual, mejor consultar en
  vivo con `db-query.mjs` o revisar las migraciones.
