import type { NextConfig } from "next";

const backend =
  process.env.BACKEND_URL?.replace(/\/$/, "") || "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${backend}/api/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/solicitudes/gestion-auxiliar-servicio-cliente",
        destination: "/solicitudes/listado-de-solicitudes-pentientes-gestion-auxiliar-servicio-cliente",
        permanent: false,
      },
      {
        source: "/solicitudes/listado-de-solicitudes-pentientes-aprobacion-desaprobacion",
        destination: "/solicitudes/listado-de-solicitudes-pentientes-gestion-auxiliar-servicio-cliente",
        permanent: true,
      },
      {
        source: "/solicitudes/listado-de-solicitudes-pentientes-aprobacion-desaprobacion/:path*",
        destination: "/solicitudes/listado-de-solicitudes-pentientes-gestion-auxiliar-servicio-cliente/:path*",
        permanent: true,
      },
      {
        source: "/solicitudes/gestion-concepto-ejecutivo",
        destination: "/solicitudes/listado-de-solicitudes-pendientes-gestion-ejecutivo-negocios",
        permanent: false,
      },
      {
        source: "/solicitudes/concepto-ejecutivo",
        destination: "/solicitudes/listado-de-solicitudes-pendientes-gestion-ejecutivo-negocios",
        permanent: true,
      },
      {
        source: "/solicitudes/concepto-ejecutivo/:path*",
        destination: "/solicitudes/listado-de-solicitudes-pendientes-gestion-ejecutivo-negocios/:path*",
        permanent: true,
      },
      {
        source: "/solicitudes/ejecutivo",
        destination: "/solicitudes/listado-de-solicitudes-pendientes-gestion-ejecutivo-negocios",
        permanent: true,
      },
      {
        source: "/solicitudes/ejecutivo/:path*",
        destination: "/solicitudes/listado-de-solicitudes-pendientes-gestion-ejecutivo-negocios",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
