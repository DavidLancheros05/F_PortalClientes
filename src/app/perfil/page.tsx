"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteDetailResponse } from "@/types/api.types";
import {
  FileText,
  MapPin,
  Mail,
  Users,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function DatoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[14px] px-4 py-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#003d99]" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8]">
          {label}
        </p>
        <p className="text-[13.5px] font-semibold text-[#0f172a] mt-0.5 break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

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
    const inicialesUsuario = (user?.nombre || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[linear-gradient(120deg,#003d99_0%,#0050c7_100%)] px-8 py-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {inicialesUsuario}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#c3d5f5] mb-0.5">
                  Mi perfil
                </p>
                <h1 className="text-[19px] font-bold text-white truncate">
                  {user?.nombre}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-blue-100 text-sm mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#93c5fd]" />
                  {user?.rol?.descripcion || user?.rol?.nombre}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-8">
              <DatoCard icon={Mail} label="Correo" value={user?.email || "-"} />
              <DatoCard icon={ShieldCheck} label="Rol" value={user?.rol?.nombre || "-"} />
            </div>

            <div className="border-t border-gray-100 px-8 py-6">
              <Link
                href="/perfil/cambiar-contrasena"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#003d99] hover:bg-[#0047b3] hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all"
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

  const iniciales = (perfil?.cli_razon_social || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const clienteActivo = perfil?.cli_estado === "A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[linear-gradient(120deg,#003d99_0%,#0050c7_100%)] px-8 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#c3d5f5] mb-0.5">
                Mi perfil
              </p>
              <h1 className="text-[19px] font-bold text-white truncate">
                {perfil?.cli_razon_social}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-blue-100 text-sm mt-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: clienteActivo ? "#4ade80" : "#f87171" }}
                />
                Cliente {clienteActivo ? "activo" : "inactivo"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-8">
            <DatoCard
              icon={FileText}
              label="NIT / Documento"
              value={perfil?.cli_nro_identificacion || "-"}
            />
            <DatoCard
              icon={MapPin}
              label="Dirección"
              value={perfil?.cli_direccion || "-"}
            />
            <DatoCard
              icon={Mail}
              label="Correo"
              value={perfil?.cli_correo || "-"}
            />
            <DatoCard
              icon={Users}
              label="Ejecutivo asignado"
              value={perfil?.ejecutivo?.nombre || "Sin asignar"}
            />
          </div>

          <div className="border-t border-gray-100 px-8 py-6">
            <Link
              href="/perfil/cambiar-contrasena"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#003d99] hover:bg-[#0047b3] hover:-translate-y-px text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] transition-all"
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
