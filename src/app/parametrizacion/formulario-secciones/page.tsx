"use client";

import { useEffect, useState } from "react";
import {
  formularioSeccionesService,
  type FormularioSeccion,
} from "@/services/parametrizacion/formulario-secciones.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Layers } from "lucide-react";

export default function FormularioSeccionesPage() {
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState<number>(1);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [editingDescripcion, setEditingDescripcion] = useState("");
  const [editingOrden, setEditingOrden] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "success" | "confirm";
    title: string;
    message: string;
    action?: () => void;
    confirmText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const isFormValid = nombre.trim().length > 0 && orden > 0;

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await formularioSeccionesService.getAll();
      setSecciones(data);
    } catch (error) {
      console.error(error);
      setSecciones([]);
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
      message: `¿Deseas agregar la sección "${nombre.trim()}"?`,
      confirmText: "Sí, agregar",
      action: async () => {
        setSubmitting(true);
        try {
          await formularioSeccionesService.create({
            formulario_id: 0,
            fse_nombre: nombre.trim(),
            fse_descripcion: descripcion.trim() || undefined,
            fse_orden: orden,
          });

          setNombre("");
          setDescripcion("");
          setOrden(1);
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Sección creada",
            message: "La sección ha sido creada exitosamente",
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

  const iniciarEdicion = (seccion: FormularioSeccion) => {
    setEditingId(seccion.fse_id);
    setEditingNombre(seccion.fse_nombre);
    setEditingDescripcion(seccion.fse_descripcion || "");
    setEditingOrden(seccion.fse_orden);
  };

  const guardarEdicion = () => {
    if (!editingId || editingNombre.trim().length === 0 || editingOrden <= 0)
      return;

    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Confirmar cambios",
      message: `¿Deseas guardar los cambios de la sección "${editingNombre.trim()}"?`,
      confirmText: "Sí, guardar",
      action: async () => {
        setSubmitting(true);
        try {
          await formularioSeccionesService.update(editingId, {
            fse_nombre: editingNombre.trim(),
            fse_descripcion: editingDescripcion.trim() || "",
            fse_orden: editingOrden,
          });

          setEditingId(null);
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Sección actualizada",
            message: "La sección ha sido actualizada exitosamente",
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

  const toggleEstado = (seccion: FormularioSeccion) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: seccion.fse_estado ? "Inactivar sección" : "Activar sección",
      message: `¿Deseas ${seccion.fse_estado ? "inactivar" : "activar"} esta sección?`,
      isDangerous: seccion.fse_estado,
      confirmText: seccion.fse_estado ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await formularioSeccionesService.toggleEstado(
            seccion.fse_id,
            !seccion.fse_estado,
          );
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `La sección ha sido ${seccion.fse_estado ? "inactivada" : "activada"}`,
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
      <div className="max-w-6xl mx-auto">
        <PageHeaderCard
          icon={Layers}
          eyebrow="Parametrización"
          title="Secciones del formulario"
          subtitle="Administra las secciones disponibles para agrupar preguntas."
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Nombre de la sección"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm col-span-2"
            />

            <input
              type="number"
              min={1}
              placeholder="Orden"
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value))}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm"
            />

            <button
              onClick={crear}
              disabled={submitting || !isFormValid}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Guardando..." : "Agregar"}
            </button>
          </div>

          <textarea
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm w-full"
            rows={2}
          />
        </PageHeaderCard>

      {/* Tabla */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
          Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Orden</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {secciones.map((seccion) => (
              <tr key={seccion.fse_id} className="border-t">
                <td className="p-2 text-center">
                  {editingId === seccion.fse_id ? (
                    <input
                      type="number"
                      min={1}
                      value={editingOrden}
                      onChange={(e) => setEditingOrden(Number(e.target.value))}
                      className="border px-2 py-1 w-20"
                    />
                  ) : (
                    seccion.fse_orden
                  )}
                </td>
                <td className="p-2">
                  {editingId === seccion.fse_id ? (
                    <input
                      type="text"
                      value={editingNombre}
                      onChange={(e) => setEditingNombre(e.target.value)}
                      className="border px-2 py-1 w-full"
                    />
                  ) : (
                    seccion.fse_nombre
                  )}
                </td>
                <td className="p-2">
                  {editingId === seccion.fse_id ? (
                    <textarea
                      value={editingDescripcion}
                      onChange={(e) => setEditingDescripcion(e.target.value)}
                      className="border px-2 py-1 w-full"
                      rows={2}
                    />
                  ) : (
                    seccion.fse_descripcion || "—"
                  )}
                </td>
                <td className="p-2 text-center">
                  {seccion.fse_estado ? "Activo" : "Inactivo"}
                </td>
                <td className="p-2 text-center space-x-2">
                  {editingId === seccion.fse_id ? (
                    <button
                      onClick={guardarEdicion}
                      className="text-brand-600 font-semibold"
                    >
                      Guardar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => iniciarEdicion(seccion)}
                        className="text-brand-600 font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleEstado(seccion)}
                        className="text-amber-600"
                      >
                        {seccion.fse_estado ? "Inactivar" : "Activar"}
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
