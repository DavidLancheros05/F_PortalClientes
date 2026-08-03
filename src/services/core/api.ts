import axios from "axios";
import { setupInterceptors } from "./interceptors";

// URL relativa (mismo origen que la app, ej. f-portal-clientes.vercel.app),
// no la URL absoluta del backend (b-portalclientes-1.onrender.com). El
// rewrite de next.config.ts (`/api/:path*` → `${BACKEND_URL}/api/:path*`)
// hace de proxy server-side hacia el backend real, verificado en vivo (pasa
// Set-Cookie intacto). Antes esto pegaba directo a NEXT_PUBLIC_API_URL
// (cross-site real: vercel.app ↔ onrender.com) — la cookie httpOnly pc_token
// del login quedaba como cookie de terceros para el navegador aunque tuviera
// SameSite=None;Secure bien puesto, y Safari (ITP) o cualquiera con
// "bloquear cookies de terceros" en Chrome/Edge nunca la guardaba: el login
// se veía exitoso en los logs del backend pero la sesión nunca quedaba
// activa (confirmado en vivo, ver documentacion/migracion-auth-httponly.md).
// Con URL relativa, el navegador ve todo como mismo origen — la cookie pasa
// a ser de primera parte, sin depender de configuraciones de privacidad del
// visitante.
const baseURL = "/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Ya no es estrictamente necesario para el mismo origen (el navegador manda
  // cookies same-site solo) — se deja por si algún consumidor externo llega
  // a pegarle a este cliente desde otro origen.
  withCredentials: true,
});

setupInterceptors(api);

export default api;