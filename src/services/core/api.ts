import axios from "axios";
import { setupInterceptors } from "./interceptors";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const baseURL = `${backendUrl}/api`;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Necesario para que el navegador guarde/mande la cookie httpOnly pc_token
  // que pone el backend (Fase 1 de documentacion/migracion-auth-httponly.md
  // en B_PortalClientes) — sin esto, al ser cross-site (vercel.app ↔
  // onrender.com), el navegador ignora el Set-Cookie de la respuesta.
  withCredentials: true,
});

setupInterceptors(api);

export default api;