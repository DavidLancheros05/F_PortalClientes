import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_STRING = "mi_super_secreto";
const SECRET_KEY = new TextEncoder().encode(SECRET_STRING);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Permitir acceso libre a login
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // 2️⃣ Obtener token
  const token = req.cookies.get("pc_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // 3️⃣ Verificar JWT
    await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });

    // 4️⃣ Continuar si es válido
    return NextResponse.next();
  } catch (error: any) {
    console.error("JWT inválido:", error?.message || error);

    const response = NextResponse.redirect(new URL("/login", req.url));
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
