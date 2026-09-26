import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Debe coincidir exactamente con JWT_SECRET del backend (ver .env.local).
// Sin fallback hardcodeado a propósito: si falta la env var, se rechaza
// todo en vez de caer a un secreto adivinable/público.
const SECRET_STRING = process.env.JWT_SECRET;
const SECRET_KEY = SECRET_STRING ? new TextEncoder().encode(SECRET_STRING) : null;

// Qué roles son válidos lo decide el backend contra pc_roles (JwtAuthGuard):
// el proxy corre en el edge sin acceso a la BD, así que acá solo se rechaza
// un token sin rol o con "USUARIO" (interno sin rol del portal, ver
// AuthService.loginUsuarioInterno). Un rol inactivo pasa el proxy pero cada
// llamada al API da 401 y services/core/interceptors.ts manda al login. Antes
// había una lista escrita a mano: un rol nuevo no entraba sin desplegar.
const ROL_SIN_ACCESO = "USUARIO";

// Preserva a dónde iba el usuario (ej. un link de correo a una solicitud
// puntual) en un ?next= para que login/page.tsx pueda regresarlo ahí tras
// autenticarse, en vez del fijo "/inicio" de siempre.
//
// `debug`: motivo del rechazo, visible en la URL de redirect (pestaña
// Network/barra de direcciones) — temporal, para diagnosticar el bloqueo de
// cookies de terceros sin depender de los Runtime Logs de Vercel (no
// accesibles desde acá). Eliminar junto con el resto de logs de diagnóstico
// una vez resuelto (ver documentacion/Portal Clientes/Login permisos/login.md).
function redirectToLogin(req: NextRequest, debug: string) {
  const loginUrl = new URL("/login", req.url);
  const destino = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (destino && destino !== "/") {
    loginUrl.searchParams.set("next", destino);
  }
  loginUrl.searchParams.set("debug", debug);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Permitir acceso libre a login
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (!SECRET_KEY) {
    console.error("JWT_SECRET no configurado en el frontend — rechazando todas las rutas protegidas.");
    return redirectToLogin(req, "no-secret");
  }

  // 2️⃣ Obtener token
  const token = req.cookies.get("pc_token")?.value;

  if (!token) {
    // Log temporal para diagnosticar el bloqueo de cookies de terceros
    // (ver documentacion/Portal Clientes/Login permisos/login.md):
    // si el navegador nunca guardó/mandó pc_token, este es el caso que
    // dispara — distingue "no llegó ninguna cookie" de "llegó pero es
    // inválida" (más abajo) o "rol rechazado".
    console.warn(
      `[proxy] Sin cookie pc_token → redirigiendo a /login. path=${pathname} cookies_presentes=${
        req.cookies
          .getAll()
          .map((c) => c.name)
          .join(",") || "ninguna"
      }`,
    );
    return redirectToLogin(req, "no-cookie");
  }

  try {
    // 3️⃣ Verificar JWT (firma + expiración)
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });

    // 4️⃣ Rechazar tokens sin rol del portal, aunque la firma sea válida
    const rol = String(payload.rol ?? "").trim().toUpperCase();
    if (!rol || rol === ROL_SIN_ACCESO) {
      console.warn(`[proxy] Token sin rol del portal ("${payload.rol}") → redirigiendo a /login. path=${pathname}`);
      const response = redirectToLogin(req, `rol-rechazado-${payload.rol}`);
      response.cookies.delete("pc_token");
      return response;
    }

    // 5️⃣ Continuar si es válido
    return NextResponse.next();
  } catch (error: any) {
    console.error(`[proxy] JWT inválido → redirigiendo a /login. path=${pathname} error=${error?.message || error}`);

    const response = redirectToLogin(req, `jwt-invalido-${error?.code || error?.name || "desconocido"}`);
    response.cookies.delete("pc_token");
    return response;
  }
}

// Una entrada por carpeta de primer nivel de src/app que exige sesión.
// Fuera a propósito: login, forgot-password, reset-password (públicas),
// unauthorized y la raíz "/" (solo redirige a /login). Una carpeta nueva
// en src/app que no esté acá carga sin login.
export const config = {
  matcher: [
    "/inicio/:path*",
    "/solicitudes/:path*",
    "/pedidos/:path*",
    "/consultas/:path*",
    "/pqrs/:path*",
    "/parametrizacion/:path*",
    "/seguridad/:path*",
    "/perfil/:path*",
  ],
};
