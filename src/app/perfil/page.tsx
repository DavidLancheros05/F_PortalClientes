"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteDetailResponse } from "@/types/api.types";
import {
  Building,
  FileText,
  MapPin,
  Mail,
  Users,
  KeyRound,
  Loader2,
} from "lucide-react";

export default function PerfilPage() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [perfil, setPerfil] = useState<ClienteDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (user?.rol?.nombre !== "CLIENTE") {
      setLoading(false);
      return;
    }

    clientesService
      .getPerfil()
      .then(setPerfil)
      .catch((err) =>
        setError(err?.response?.data?.message || err?.message || "Error cargando el perfil"),
      )
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (user?.rol?.nombre !== "CLIENTE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Esta página es solo para clientes.</p>
      </div>
    );
  }

  const iniciales = (perfil?.cli_razon_social || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-600 mt-2">
              Datos de tu cuenta en el Portal de Clientes
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-white truncate">
                {perfil?.cli_razon_social}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Cliente {perfil?.cli_estado === "A" ? "activo" : "inactivo"}
              </p>
            </div>
          </div>

          <div className="p-8 space-y-5">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  NIT / Documento
                </p>
                <p className="text-sm text-gray-900 font-mono mt-0.5">
                  {perfil?.cli_nro_identificacion}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Dirección
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {perfil?.cli_direccion || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Correo
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {perfil?.cli_correo || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Ejecutivo asignado
                </p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {perfil?.ejecutivo?.nombre || "Sin asignar"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-8 py-6">
            <Link
              href="/perfil/cambiar-contrasena"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-medium"
            >
              <KeyRound className="w-4 h-4" />
              Cambiar contraseña
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
