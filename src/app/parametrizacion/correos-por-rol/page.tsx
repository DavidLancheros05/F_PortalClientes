"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { correosRolService } from "@/services/parametrizacion/correos-rol.service";
import ConfirmModal from "@/components/modals/ConfirmModal";
import SuccessModal from "@/components/modals/SuccessModal";

type RolBasico = {
  rol_id: number;
  rol_nombre: string;
  rol_codigo: string;
};

type CorreoPorRol = {
  correo_id: number;
  rol_id: number;
  rol_nombre: string;
  rol_codigo: string;
  email: string;
  activo: boolean;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CorreosPorRolPage() {
  const [roles, setRoles] = useState<RolBasico[]>([]);
  const [items, setItems] = useState<CorreoPorRol[]>([]);
  const [rolId, setRolId] = useState<number | "">("");
  const [email, setEmail] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'error' | 'success' | 'confirm';
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
    item?: CorreoPorRol;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  const isFormValid =
    rolId !== "" && email.trim().length > 0 && emailRegex.test(email.trim());

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [rolesData, itemsData] = await Promise.all([
        correosRolService.getRoles(),
        correosRolService.getAll(),
      ]);

      setRoles(rolesData);
      setItems(itemsData);
    } catch (error) {
      console.error(error);
      setRoles([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const crear = async () => {
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      await correosRolService.create({
        rol_id: rolId,
        email: email.trim(),
      });

      setRolId("");
      setEmail("");
      await cargarDatos();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Correo creado',
        message: 'El correo por rol ha sido creado exitosamente',
      });
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || "Error al crear",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (item: CorreoPorRol) => {
    setEditingId(item.correo_id);
    setEditingEmail(item.email);
  };

  const guardarEdicion = async () => {
    if (!editingId || !emailRegex.test(editingEmail.trim())) return;

    try {
      await correosRolService.update(editingId, {
        email: editingEmail.trim(),
      });

      setEditingId(null);
      setEditingEmail("");
      await cargarDatos();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Correo actualizado',
        message: 'El correo ha sido actualizado exitosamente',
      });
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || "Error al actualizar",
      });
    }
  };

  const toggleEstado = (item: CorreoPorRol) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: item.activo ? 'Inactivar correo' : 'Activar correo',
      message: `Deseas ${item.activo ? "inactivar" : "activar"} este correo?`,
      isDangerous: item.activo,
      confirmText: item.activo ? 'Inactivar' : 'Activar',
      item,
      action: async () => {
        try {
          await correosRolService.toggleEstado(item.correo_id, !item.activo);
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: 'success',
            title: 'Operación exitosa',
            message: `El correo ha sido ${item.activo ? 'inactivado' : 'activado'} correctamente`,
          });
        } catch (error: any) {
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: error.message || "Error al actualizar estado",
          });
        }
      },
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Correos por Rol</h1>
        <Link
          href="/parametrizacion/notificaciones"
          className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Ir a plantillas de notificaciones
        </Link>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4">
        <select
          value={rolId}
          onChange={(e) =>
            setRolId(e.target.value ? Number(e.target.value) : "")
          }
          className="border px-3 py-2 rounded min-w-[220px]"
        >
          <option value="">Selecciona un rol</option>
          {roles.map((rol) => (
            <option key={rol.rol_id} value={rol.rol_id}>
              {rol.rol_nombre}
            </option>
          ))}
        </select>

        <input
          type="email"
          placeholder="correo@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-3 py-2 rounded flex-1 min-w-[220px]"
        />

        <button
          onClick={crear}
          disabled={submitting || !isFormValid}
          className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Guardando..." : "Agregar"}
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="w-full bg-white rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Rol</th>
              <th className="p-2">Codigo</th>
              <th className="p-2">Email</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.correo_id} className="border-t">
                <td className="p-2 text-center">{item.rol_nombre}</td>
                <td className="p-2 text-center">{item.rol_codigo}</td>
                <td className="p-2 text-center">
                  {editingId === item.correo_id ? (
                    <input
                      type="email"
                      value={editingEmail}
                      onChange={(e) => setEditingEmail(e.target.value)}
                      className="border px-2 py-1 w-full"
                    />
                  ) : (
                    item.email
                  )}
                </td>
                <td className="p-2 text-center">
                  {item.activo ? "Activo" : "Inactivo"}
                </td>
                <td className="p-2 text-center space-x-2">
                  {editingId === item.correo_id ? (
                    <button
                      onClick={guardarEdicion}
                      className="text-indigo-600"
                    >
                      Guardar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => iniciarEdicion(item)}
                        className="text-indigo-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleEstado(item)}
                        className="text-amber-600"
                      >
                        {item.activo ? "Inactivar" : "Activar"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modals */}
      {modalState.type === 'error' && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Aceptar"
          isDangerous={true}
          onConfirm={() => setModalState({ ...modalState, isOpen: false })}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === 'success' && (
        <SuccessModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          actionText="Aceptar"
          onAction={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === 'confirm' && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText || 'Confirmar'}
          isDangerous={modalState.isDangerous}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
            setModalState({ ...modalState, isOpen: false });
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
