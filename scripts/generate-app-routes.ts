// Genera la lista de rutas reales del frontend (una por cada page.tsx/page.ts
// bajo src/app) a un JSON estático. Se usa en la pantalla de administración
// de módulos (seguridad/modulos) para avisar si la ruta que se le va a
// asignar a un módulo de menú no corresponde a ninguna página real —
// exactamente el tipo de error que causó que "" quedara
// apuntando a una ruta que nunca existió (ver
// documentacion/CLAUDE.md, gotcha de 2026-09-13).
//
// Correr con: npm run routes:generate (regenerar cuando se agreguen o
// borren páginas).

import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");
const OUTPUT_FILE = path.join(process.cwd(), "src", "data", "app-routes.json");

function walk(dir: string, segments: string[], routes: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const hasPage = entries.some(
    (e) => e.isFile() && (e.name === "page.tsx" || e.name === "page.ts"),
  );
  if (hasPage) {
    const route = "/" + segments.join("/");
    routes.push(route === "/" ? "/" : route.replace(/\/+/g, "/"));
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Carpetas especiales de Next.js App Router que no aportan un segmento
    // de URL navegable directamente, o que no aplican a rutas de menú.
    if (entry.name.startsWith("_")) continue;
    if (entry.name === "api") continue;

    walk(path.join(dir, entry.name), [...segments, entry.name], routes);
  }
}

const routes: string[] = [];
walk(APP_DIR, [], routes);
routes.sort();

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(routes, null, 2) + "\n", "utf-8");

console.log(`Generadas ${routes.length} rutas en ${OUTPUT_FILE}`);
