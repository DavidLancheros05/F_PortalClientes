import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Debe coincidir exactamente con JWT_SECRET del backend (ver .env.local).
// Sin fallback hardcodeado a propósito: si falta la env var, se rechaza
// todo en vez de caer a un secreto adivinable/público.
const SECRET_STRING = process.env.JWT_SECRET;
const SECRET_KEY = SECRET_STRING
  ? new TextEncoder().encode(SECRET_STRING)
  : null;

// Misma whitelist que BACKEND/src/auth/jwt-auth.guard.ts (ROLES_PERMITIDOS)
// — se duplica a propósito porque frontend y backend son repos git
// separados sin código compartido. Si se agrega un rol nuevo, actualizar
// ambos lados.
const ROLES_PERMITIDOS = [
  "CLIENTE",
  "EJECUTIVO",
  "COMERCIAL",
  "ADMINISTRACION",
  "ADMIN",
  "ASC",
  "OC",
  "CC1",
  "CC2",
];

// Preserva a dónde iba el usuario (ej. un link de correo a una solicitud
// puntual) en un ?next= para que login/page.tsx pueda regresarlo ahí tras
// autenticarse, en vez del fijo "/inicio" de siempre.
//
// `debug`: motivo del rechazo, visible en la URL de redirect (pestaña
// Network/barra de direcciones) — temporal, para diagnosticar el bloqueo de
// cookies de terceros sin depender de los Runtime Logs de Vercel (no
// accesibles desde acá). Quitar junto con el resto de logs de diagnóstico
// una vez resuelto (ver documentacion/migracion-auth-httponly.md).
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
    console.error(
      "JWT_SECRET no configurado en el frontend — rechazando todas las rutas protegidas.",
    );
    return redirectToLogin(req, "no-secret");
  }

  // 2️⃣ Obtener token
  const token = req.cookies.get("pc_token")?.value;

  if (!token) {
    // Log temporal para diagnosticar el bloqueo de cookies de terceros
    // (ver documentacion/migracion-auth-httponly.md en B_PortalClientes):
    // si el navegador nunca guardó/mandó pc_token, este es el caso que
    // dispara — distingue "no llegó ninguna cookie" de "llegó pero es
    // inválida" (más abajo) o "rol rechazado".
    console.warn(
      `[proxy] Sin cookie pc_token → redirigiendo a /login. path=${pathname} cookies_presentes=${req.cookies.getAll().map((c) => c.name).join(",") || "ninguna"}`,
    );
    return redirectToLogin(req, "no-cookie");
  }

  try {
    // 3️⃣ Verificar JWT (firma + expiración)
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });

    // 4️⃣ Rechazar roles fuera de la whitelist, aunque la firma sea válida
    if (!ROLES_PERMITIDOS.includes(String(payload.rol))) {
      console.warn(
        `[proxy] Rol "${payload.rol}" fuera de la whitelist → redirigiendo a /login. path=${pathname}`,
      );
      const response = redirectToLogin(req, `rol-rechazado-${payload.rol}`);
      response.cookies.delete("pc_token");
      return response;
    }

    // 5️⃣ Continuar si es válido
    return NextResponse.next();
  } catch (error: any) {
    console.error(
      `[proxy] JWT inválido → redirigiendo a /login. path=${pathname} error=${error?.message || error}`,
    );

    const response = redirectToLogin(
      req,
      `jwt-invalido-${error?.code || error?.name || "desconocido"}`,
    );
    response.cookies.delete("pc_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/solicitudes/:path*",
    "/pedidos/:path*",
    "/consultas/:path*",
    "/aprobaciones/:path*",
    "/condiciones-financieras/:path*",
    "/admin/:path*",
    "/perfil/:path*",
  ],
};
