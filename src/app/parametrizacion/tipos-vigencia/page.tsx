"use client";

import { useEffect, useState } from "react";
import { Pencil, Power, Save, X } from "lucide-react";
import { tiposVigenciaService } from "@/services/admin/parametrizacion/tipos-vigencia.service";
import { TipoVigencia } from "@/services/admin/parametrizacion/tipos-vigencia.types";
import { ConfirmModal, SuccessModal } from "@/components/modals";

export default function TiposVigenciaPage() {
  const [items, setItems] = useState<TipoVigencia[]>([]);
  const [loading, setLoading] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [editandoDescripcion, setEditandoDescripcion] = useState("");

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

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await tiposVigenciaService.getAll();
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const iniciarEdicion = (item: TipoVigencia) => {
    setEditandoId(item.tipoVigenciaId);
    setEditandoNombre(item.nombre);
    setEditandoDescripcion(item.descripcion || "");
  };

  const guardarEdicion = async () => {
    if (!editandoId || !editandoNombre.trim()) return;

    try {
      await tiposVigenciaService.update(editandoId, {
        nombre: editandoNombre.trim(),
        descripcion: editandoDescripcion.trim(),
      });
      setEditandoId(null);
      await cargarDatos();
      setModalState({
        isOpen: true,
        type: "success",
        title: "Actualizado exitosamente",
        message: "El tipo de vigencia ha sido actualizado",
      });
    } catch (e) {
      console.error(e);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Error al actualizar el tipo de vigencia",
      });
    }
  };

  const toggleEstado = (item: TipoVigencia) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: item.estado
        ? "Inactivar tipo de vigencia"
        : "Activar tipo de vigencia",
      message: `¿Deseas ${item.estado ? "inactivar" : "activar"} "${item.nombre}"? ${
        item.estado
          ? "Dejará de estar disponible para elegir en el formulario de tipos de documento."
          : ""
      }`,
      isDangerous: item.estado,
      confirmText: item.estado ? "Inactivar" : "Activar",
      action: async () => {
        try {
          await tiposVigenciaService.update(item.tipoVigenciaId, {
            estado: !item.estado,
          });
          await cargarDatos();
          setModalState({
            isOpen: true,
            type: "success",
            title: "Operación exitosa",
            message: `El tipo de vigencia ha sido ${item.estado ? "inactivado" : "activado"}`,
          });
        } catch (e) {
          console.error(e);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al cambiar el estado del tipo de vigencia",
          });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-6">
            <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
              Tipos de vigencia
            </p>
            <p className="text-gray-600 mt-2">
              Nombres y descripciones de las reglas de vigencia disponibles al
              configurar un tipo de documento. El código de cada tipo es fijo
              (lo reconoce la lógica de validación); no se pueden crear ni
              eliminar tipos desde aquí, solo editar su nombre, descripción y
              estado.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Cargando...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  No hay tipos de vigencia registrados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gradient-to-r from-indigo-100 via-blue-100 to-cyan-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-indigo-950 uppercase tracking-wider border-b border-blue-200">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr
                        key={item.tipoVigenciaId}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 align-top">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {item.codigo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 align-top">
                          {editandoId === item.tipoVigenciaId ? (
                            <input
                              type="text"
                              value={editandoNombre}
                              onChange={(e) =>
                                setEditandoNombre(e.target.value)
                              }
                              className="border border-gray-300 px-2 py-1 rounded w-56 text-sm"
                            />
                          ) : (
                            item.nombre
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 align-top max-w-[360px]">
                          {editandoId === item.tipoVigenciaId ? (
                            <textarea
                              rows={2}
                              value={editandoDescripcion}
                              onChange={(e) =>
                                setEditandoDescripcion(e.target.value)
                              }
                              className="border border-gray-300 px-2 py-1 rounded w-full text-sm"
                            />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">
                              {item.descripcion || "-"}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 align-top">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              item.estado
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.estado ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm align-top">
                          {editandoId === item.tipoVigenciaId ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={guardarEdicion}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                              >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => iniciarEdicion(item)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => toggleEstado(item)}
                                className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <Power className="mr-1 h-3.5 w-3.5" />
                                {item.estado ? "Inactivar" : "Activar"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
