"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, InboxIcon, Clock, CheckCircle, BarChart3, Settings } from "lucide-react";

export default function PQRSPage() {
  const router = useRouter();

  const opciones = [
    {
      titulo: "Nueva PQRS",
      descripcion: "Crear una nueva petición, queja, reclamo o solicitud",
      icon: Plus,
      href: "/pqrs/nueva",
      color: "blue",
    },
    {
      titulo: "Mis PQRS",
      descripcion: "Ver todas mis PQRS creadas",
      icon: InboxIcon,
      href: "/pqrs/mis-pqrs",
      color: "green",
    },
    {
      titulo: "Bandeja",
      descripcion: "PQRS asignadas para gestión",
      icon: InboxIcon,
      href: "/pqrs/bandeja",
      color: "purple",
    },
    {
      titulo: "Pendientes",
      descripcion: "PQRS pendientes de resolver",
      icon: Clock,
      href: "/pqrs/pendientes",
      color: "orange",
    },
    {
      titulo: "Aprobaciones",
      descripcion: "PQRS en espera de aprobación",
      icon: CheckCircle,
      href: "/pqrs/aprobaciones",
      color: "cyan",
    },
    {
      titulo: "Historial",
      descripcion: "Ver historial de cambios",
      icon: Clock,
      href: "/pqrs/historial",
      color: "slate",
    },
    {
      titulo: "Reportes",
      descripcion: "Análisis y estadísticas",
      icon: BarChart3,
      href: "/pqrs/reportes",
      color: "indigo",
    },
    {
      titulo: "Configuración",
      descripcion: "Configurar PQRS",
      icon: Settings,
      href: "/pqrs/configuracion",
      color: "gray",
    },
  ];

  const colorClasses = {
    blue: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700",
    green: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700",
    purple: "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700",
    orange: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700",
    cyan: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700",
    slate: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700",
    indigo: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
    gray: "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-blue-800 mb-2">
              Gestión de PQRS
            </h1>
            <p className="text-gray-600">
              Peticiones, Quejas, Reclamos y Solicitudes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {opciones.map((opcion) => {
              const Icon = opcion.icon;
              const colorClass = colorClasses[opcion.color as keyof typeof colorClasses];

              return (
                <button
                  key={opcion.href}
                  onClick={() => router.push(opcion.href)}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${colorClass}`}
                >
                  <Icon className="h-8 w-8 mb-3" />
                  <h3 className="font-semibold text-left mb-1">{opcion.titulo}</h3>
                  <p className="text-sm opacity-80 text-left">{opcion.descripcion}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}