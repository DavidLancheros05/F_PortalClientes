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
function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL("/login", req.url);
  const destino = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (destino && destino !== "/") {
    loginUrl.searchParams.set("next", destino);
  }
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
    return redirectToLogin(req);
  }

  // 2️⃣ Obtener token
  const token = req.cookies.get("pc_token")?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  try {
    // 3️⃣ Verificar JWT (firma + expiración)
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });

    // 4️⃣ Rechazar roles fuera de la whitelist, aunque la firma sea válida
    if (!ROLES_PERMITIDOS.includes(String(payload.rol))) {
      const response = redirectToLogin(req);
      response.cookies.delete("pc_token");
      return response;
    }

    // 5️⃣ Continuar si es válido
    return NextResponse.next();
  } catch (error: any) {
    console.error("JWT inválido:", error?.message || error);

    const response = redirectToLogin(req);
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
