"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usuariosService } from "@/services/usuarios/usuarios.service";
import { clientesService } from "@/services/clientes/clientes.service";
import { rolesService } from "@/services/seguridad/roles.service";

type Rol = {
  rol_id: number;
  rol_nombre: string;
  rol_codigo?: string;
};

type Cliente = {
  id: number;
  razonSocial: string;
  correo?: string;
  email?: string;
  usuarioId?: number | null;
};

export default function CrearUsuarioPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cliente_id: "",
    usuario_email: "",
    usuario_password: "",
    usuario_rol_id: "",
  });

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const data = await rolesService.getAll();
        const mapped = (Array.isArray(data) ? data : [])
          .map((item: any) => ({
            rol_id: Number(item.rol_id),
            rol_nombre: String(item.rol_nombre || ""),
            rol_codigo: String(item.rol_codigo || ""),
          }))
          .filter(
            (item: Rol) => Number.isInteger(item.rol_id) && item.rol_id > 0,
          );

        setRoles(mapped);
      } catch (err: any) {
        setError(err?.message || "Error cargando roles");
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const selectedRol = useMemo(
    () => roles.find((rol) => rol.rol_id === Number(formData.usuario_rol_id)),
    [roles, formData.usuario_rol_id],
  );

  const isClienteRole = useMemo(() => {
    const code = String(selectedRol?.rol_codigo || "")
      .toUpperCase()
      .trim();
    const name = String(selectedRol?.rol_nombre || "")
      .toUpperCase()
      .trim();
    return code === "CLIENTE" || name === "CLIENTE";
  }, [selectedRol]);

  const selectedCliente = useMemo(
    () => clientes.find((item) => item.id === Number(formData.cliente_id)),
    [clientes, formData.cliente_id],
  );

  const clientesSinUsuario = useMemo(
    () =>
      clientes.filter(
        (item) => item.usuarioId === null || item.usuarioId === undefined,
      ),
    [clientes],
  );

  useEffect(() => {
    const fetchClientes = async () => {
      if (!isClienteRole) return;
      try {
        setLoadingClientes(true);
        const data = await clientesService.getAll();
        const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
          id: Number(item.id || item.cliente_id),
          razonSocial: String(item.razonSocial || ""),
          email: String(item.email || "").trim(),
          usuarioId:
            item.usuarioId === null || item.usuarioId === undefined
              ? null
              : Number(item.usuarioId),
        }));

        setClientes(mapped);
      } catch (err: any) {
        setError(err?.message || "Error cargando clientes");
      } finally {
        setLoadingClientes(false);
      }
    };

    fetchClientes();
  }, [isClienteRole]);

  useEffect(() => {
    if (!isClienteRole) {
      setFormData((prev) => ({ ...prev, cliente_id: "" }));
      return;
    }

    if (selectedCliente?.email && !formData.usuario_email) {
      setFormData((prev) => ({
        ...prev,
        usuario_email: selectedCliente.email || "",
      }));
    }
  }, [isClienteRole, selectedCliente, formData.usuario_email]);

  const isValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.usuario_email);

    if (isClienteRole && !Number(formData.cliente_id)) {
      return false;
    }

    return (
      emailOk &&
      formData.usuario_password.length >= 6 &&
      Number(formData.usuario_rol_id) > 0
    );
  }, [formData, isClienteRole]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      setError("Completa correctamente todos los campos");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        nombre: isClienteRole
          ? String(selectedCliente?.razonSocial || "").trim()
          : formData.usuario_email.trim().toLowerCase(),
        usuario_email: formData.usuario_email.trim().toLowerCase(),
        usuario_password: formData.usuario_password,
        usuario_rol_id: Number(formData.usuario_rol_id),
        usuario_activo: true,
      };

      await usuariosService.create(payload);

      setSuccess("Usuario creado correctamente");
      setFormData({
        cliente_id: "",
        usuario_email: "",
        usuario_password: "",
        usuario_rol_id: "",
      });

      setTimeout(() => {
        router.push("/usuarios");
      }, 900);
    } catch (err: any) {
      setError(err?.message || "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear usuario</h1>
      <p className="text-sm text-gray-600 mb-6">
        Configura credenciales y rol del nuevo usuario.
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-4 bg-white border border-gray-200 rounded-xl p-5"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Rol
          </label>
          <select
            value={formData.usuario_rol_id}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                usuario_rol_id: e.target.value,
                cliente_id: "",
                usuario_email: "",
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
            disabled={loadingRoles}
          >
            <option value="">Seleccione un rol</option>
            {roles.map((rol) => (
              <option key={rol.rol_id} value={rol.rol_id}>
                {rol.rol_nombre}
              </option>
            ))}
          </select>
        </div>

        {isClienteRole && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cliente
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => {
                const clienteId = e.target.value;
                const cliente = clientes.find(
                  (c) => c.id === Number(clienteId),
                );
                setFormData((prev) => ({
                  ...prev,
                  cliente_id: clienteId,
                  usuario_email: cliente?.correo || "",
                }));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
              disabled={loadingClientes}
            >
              <option value="">Seleccione un cliente sin usuario</option>
              {clientesSinUsuario.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razonSocial}
                </option>
              ))}
            </select>
          </div>
        )}

        {(!isClienteRole || Number(formData.cliente_id) > 0) && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Usuario (correo)
              </label>
              <input
                type="email"
                value={formData.usuario_email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usuario_email: e.target.value,
                  }))
                }
                placeholder="correo@empresa.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contrasena
              </label>
              <input
                type="text"
                value={formData.usuario_password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usuario_password: e.target.value,
                  }))
                }
                placeholder="Escriba la contrasena o use 123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    usuario_password: "123456",
                  }))
                }
                className="mt-2 text-xs text-blue-700 hover:underline"
              >
                Usar contrasena automatica: 123456
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <div className="pt-2 flex gap-2">
          <button
            type="submit"
            disabled={!isValid || saving || loadingRoles}
            className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear usuario"}
          </button>
          <Link
            href="/usuarios"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
