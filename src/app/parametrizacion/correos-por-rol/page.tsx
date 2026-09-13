"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { correosRolService } from "@/services/parametrizacion/correos-rol.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { AtSign } from "lucide-react";
import type { RolResponse, CorreoPorRolResponse } from "@/types/api.types";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CorreosPorRolPage() {
  const [roles, setRoles] = useState<RolResponse[]>([]);
  const [items, setItems] = useState<CorreoPorRolResponse[]>([]);
  const [rolId, setRolId] = useState<number | "">("");
  const [email, setEmail] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "success" | "confirm";
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
    item?: CorreoPorRolResponse;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
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

  const crear = () => {
    if (!isFormValid) return;

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar creación",
      message: `¿Deseas agregar el correo ${email.trim()} para este rol?`,
      confirmText: "Sí, agregar",
      action: async () => {
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
            type: "success",
            title: "Correo creado",
            message: "El correo por rol ha sido creado exitosamente",
          });
        } catch (error: any) {
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error.message || "Error al crear",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const iniciarEdicion = (item: CorreoPorRolResponse) => {
    setEditingId(item.correo_id);
    setEditingEmail(item.email);
  };

  const guardarEdicion = () => {
    if (!editingId || !emailRegex.test(editingEmail.trim())) return;

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar cambios",
      message: `¿Deseas guardar el correo ${editingEmail.trim()}?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await correosRolService.update(editingId, {
            email: editingEmail.trim(),
          });

          setEditingId(null);
          setEditingEmail("");
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Correo actualizado",
            message: "El correo ha sido actualizado exitosamente",
          });
        } catch (error: any) {
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error.message || "Error al actualizar",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const toggleEstado = (item: CorreoPorRolResponse) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: item.activo ? "Inactivar correo" : "Activar correo",
      message: `Deseas ${item.activo ? "inactivar" : "activar"} este correo?`,
      isDangerous: item.activo,
      confirmText: item.activo ? "Inactivar" : "Activar",
      item,
      action: async () => {
        try {
          await correosRolService.toggleEstado(item.correo_id, !item.activo);
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `El correo ha sido ${item.activo ? "inactivado" : "activado"} correctamente`,
          });
        } catch (error: any) {
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error.message || "Error al actualizar estado",
          });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeaderCard
          icon={AtSign}
          eyebrow="Parametrización"
          title="Correos por rol"
          subtitle="Administra a qué correo llegan las notificaciones de cada rol."
          actions={
            <Link
              href="/parametrizacion/formatos-de-correos"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              Ir a plantillas de notificaciones
            </Link>
          }
        >
          <div className="flex flex-wrap gap-4">
            <select
              value={rolId}
              onChange={(e) =>
                setRolId(e.target.value ? Number(e.target.value) : "")
              }
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm min-w-[220px]"
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
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm flex-1 min-w-[220px]"
            />

            <button
              onClick={crear}
              disabled={submitting || !isFormValid}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </PageHeaderCard>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
          Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
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
                      className="text-brand-600 font-semibold"
                    >
                      Guardar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => iniciarEdicion(item)}
                        className="text-brand-600 font-semibold"
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
        </div>
      )}
      </div>

      {/* Modals */}
      {modalState.type === "error" && (
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

      {modalState.type === "success" && (
        <SuccessModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          actionText="Aceptar"
          onAction={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === "confirm" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText || "Confirmar"}
          isDangerous={modalState.isDangerous}
          isLoading={submitting}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
