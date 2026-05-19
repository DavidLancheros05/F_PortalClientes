"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  User,
  Briefcase,
  TrendingUp,
  Building,
  FileText,
  PlusCircle,
} from "lucide-react";
import ConfirmModal from "@/components/modals/ConfirmModal";

// Roles reales
const ROLES = {
  ADMIN: 1,
  CLIENTE: 2,
  EJECUTIVO: 3,
  COMERCIAL: 4,
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    usr_id: number;
    usuario_nombre: string;
    usuario_email: string;
    usuario_activo: boolean;
    rol_id?: number;
    rol?: { rol_id: number; nombre: string; codigo: string };
    cliente_id?: number;
    clientes?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactiveModalOpen, setInactiveModalOpen] = useState(false);

  const getRolConfig = (rol_id?: number, rolNombre?: string) => {
    // Si hay nombre en el objeto rol, usarlo como prioridad
    if (rolNombre) {
      const normalized = rolNombre.toUpperCase();
      if (normalized === 'ADMINISTRADOR' || normalized === 'ADMINISTRACION') {
        return {
          name: "Administrador",
          icon: Shield,
          color: "purple",
          gradient: "from-purple-500 to-purple-600",
        };
      }
      if (normalized === 'CLIENTE') {
        return {
          name: "Cliente",
          icon: User,
          color: "blue",
          gradient: "from-blue-500 to-blue-600",
        };
      }
      if (normalized === 'EJECUTIVO') {
        return {
          name: "Ejecutivo",
          icon: Briefcase,
          color: "green",
          gradient: "from-green-500 to-green-600",
        };
      }
      if (normalized === 'COMERCIAL') {
        return {
          name: "Comercial",
          icon: TrendingUp,
          color: "amber",
          gradient: "from-amber-500 to-amber-600",
        };
      }
    }

    // Si no hay nombre, usar rol_id
    if (rol_id) {
      switch (rol_id) {
        case ROLES.ADMIN:
          return {
            name: "Administrador",
            icon: Shield,
            color: "purple",
            gradient: "from-purple-500 to-purple-600",
          };
        case ROLES.CLIENTE:
          return {
            name: "Cliente",
            icon: User,
            color: "blue",
            gradient: "from-blue-500 to-blue-600",
          };
        case ROLES.EJECUTIVO:
          return {
            name: "Ejecutivo",
            icon: Briefcase,
            color: "green",
            gradient: "from-green-500 to-green-600",
          };
        case ROLES.COMERCIAL:
          return {
            name: "Comercial",
            icon: TrendingUp,
            color: "amber",
            gradient: "from-amber-500 to-amber-600",
          };
      }
    }

    return {
      name: "Usuario",
      icon: User,
      color: "gray",
      gradient: "from-gray-500 to-gray-600",
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser.activo) {
        setInactiveModalOpen(true);
        return;
      }

      setUser(parsedUser);
      setLoading(false);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const handleInactiveUserClose = () => {
    setInactiveModalOpen(false);
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const roleConfig = getRolConfig(user.rol_id, user.rol?.nombre);
  const RoleIcon = roleConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className={`p-3 ${roleConfig.color === 'amber' ? 'bg-amber-100' : `bg-${roleConfig.color}-100`} rounded-xl`}>
              <RoleIcon className={`w-6 h-6 ${roleConfig.color === 'amber' ? 'text-amber-600' : `text-${roleConfig.color}-600`}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Bienvenido, {user.usuario_nombre}
              </p>
              <p className="text-gray-600">
                Rol: {roleConfig.name}
              </p>
            </div>
          </div>
        </div>

        {/* ADMIN */}
        {user.rol_id === ROLES.ADMIN && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Administración</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/clientes/nuevo")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <PlusCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-purple-700">
                    Crear Cliente
                  </span>
                </div>
              </button>
              <button
                onClick={() => router.push("/clientes")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <Building className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-purple-700">
                    Ver Clientes
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CLIENTE */}
        {user.rol_id === ROLES.CLIENTE && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Solicitudes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/solicitudes")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-blue-700">
                    Ver solicitudes
                  </span>
                </div>
              </button>
              <button
                onClick={() => router.push("/solicitudes/nueva")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <PlusCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-blue-700">
                    Nueva solicitud
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* EJECUTIVO */}
        {user.rol_id === ROLES.EJECUTIVO && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Solicitudes Pendientes</h2>
            <div className="flex">
              <button
                onClick={() => router.push("/solicitudes/pendientes")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-green-700">
                    Ver solicitudes pendientes
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* COMERCIAL */}
        {user.rol_id === ROLES.COMERCIAL && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Área Comercial</h2>
            <div className="flex">
              <button
                onClick={() => router.push("/solicitudes/revision")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all group"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-amber-700">
                    Revisar solicitudes
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={inactiveModalOpen}
        title="Usuario Inactivo"
        message="Tu usuario está inactivo. Contacta al administrador."
        confirmText="Aceptar"
        isDangerous={true}
        onConfirm={handleInactiveUserClose}
        onCancel={handleInactiveUserClose}
      />
    </div>
  );
}