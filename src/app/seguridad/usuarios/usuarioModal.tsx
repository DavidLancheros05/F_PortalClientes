"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { usuariosService } from "@/services/usuarios/usuarios.service";

interface Rol {
  rol_id: number;
  rol_nombre: string;
}

interface Usuario {
  usr_id: number;
  nombre: string;
  usuario_email: string;
  usuario_activo: boolean;
  usuario_created_at: string;
  rol?: {
    rol_id: number;
    rol_nombre: string;
  };
}

interface UsuarioModalProps {
  usuario: Usuario | null;
  isNew: boolean;
  roles: Rol[];
  onClose: (reloadNeeded: boolean) => void;
}

const UsuarioModal: React.FC<UsuarioModalProps> = ({
  usuario,
  isNew,
  roles,
  onClose,
}) => {
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [email, setEmail] = useState(usuario?.usuario_email || "");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState(usuario?.rol?.rol_id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    if (isNew && !usuarioLogin.trim()) {
      setError("El usuario (login) es requerido");
      return;
    }
    if (!rolId) {
      setError("El rol es requerido");
      return;
    }

    // Para nuevo usuario, la contraseña es requerida
    if (isNew && !password.trim()) {
      setError("La contraseña es requerida para nuevos usuarios");
      return;
    }

    // Validar email (solo si se ingresó, ya que es opcional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email)) {
      setError("Email inválido");
      return;
    }

    try {
      setLoading(true);

      if (isNew) {
        await usuariosService.create({
          nombre: nombre,
          usuario_login: usuarioLogin.trim(),
          usuario_email: email,
          usuario_password: password,
          usuario_rol_id: Number(rolId),
          usuario_activo: true,
        });
      } else {
        await usuariosService.update(usuario?.usr_id!, {
          nombre: nombre,
          usuario_email: email,
          usuario_rol_id: Number(rolId),
          usuario_activo: usuario?.usuario_activo,
          ...(password ? { usuario_password: password } : {}),
        });
      }

      onClose(true);
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Error procesando usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? "Nuevo Usuario" : "Editar Usuario"}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="p.ej. Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Usuario (login) */}
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario (login) *
              </label>
              <input
                type="text"
                value={usuarioLogin}
                onChange={(e) => setUsuarioLogin(e.target.value)}
                placeholder="p.ej. jperez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Es lo que la persona va a escribir para iniciar sesión.
              </p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol *
            </label>
            <select
              value={rolId}
              onChange={(e) => setRolId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol) => (
                <option key={rol.rol_id} value={rol.rol_id}>
                  {rol.rol_nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña {isNew && "*"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isNew
                  ? "Contraseña requerida"
                  : "Dejar en blanco para no cambiar"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            {!isNew && (
              <p className="text-xs text-gray-500 mt-1">
                Dejar en blanco para mantener la contraseña actual
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioModal;
