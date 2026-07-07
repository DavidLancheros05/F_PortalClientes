"use client";

import { useEffect, useState } from "react";
import {
  estadosService,
  Estado,
} from "@/services/admin/parametrizacion/estados.service";
import ConfirmModal from "@/components/modals/ConfirmModal";
import SuccessModal from "@/components/modals/SuccessModal";

export default function EstadosPage() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState<number | "">("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoCodigo, setEditandoCodigo] = useState("");
  const [editandoDescripcion, setEditandoDescripcion] = useState("");
  const [editandoOrden, setEditandoOrden] = useState<number | "">("");
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
    estadoCode?: string;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  const cargarEstados = async () => {
    setLoading(true);
    try {
      const data = await estadosService.getAll();
      setEstados(data);
    } catch (error) {
      console.error(error);
      setEstados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstados();
  }, []);

  const crearEstado = async () => {
    if (!codigo.trim() || !descripcion.trim() || orden === "") {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Campos incompletos',
        message: 'Por favor completa código, descripción y orden',
      });
      return;
    }

    setSubmitting(true);
    try {
      await estadosService.create({
        codigo: codigo.trim().toUpperCase(),
        descripcion: descripcion.trim(),
        orden: Number(orden),
      });
      setCodigo("");
      setDescripcion("");
      setOrden("");
      await cargarEstados();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Estado creado',
        message: 'El estado ha sido creado exitosamente',
      });
    } catch (error) {
      console.error(error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al crear el estado',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (estado: Estado) => {
    setEditandoId(estado.estado_id);
    setEditandoCodigo(estado.codigo);
    setEditandoDescripcion(estado.descripcion);
    setEditandoOrden(estado.orden);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoCodigo("");
    setEditandoDescripcion("");
    setEditandoOrden("");
  };

  const guardarEdicion = async (estadoId: number) => {
    if (
      !editandoCodigo.trim() ||
      !editandoDescripcion.trim() ||
      editandoOrden === ""
    ) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Campos incompletos',
        message: 'Código, descripción y orden son obligatorios',
      });
      return;
    }

    try {
      await estadosService.update(estadoId, {
        codigo: editandoCodigo.trim().toUpperCase(),
        descripcion: editandoDescripcion.trim(),
        orden: Number(editandoOrden),
      });
      cancelarEdicion();
      await cargarEstados();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Estado actualizado',
        message: 'El estado ha sido actualizado exitosamente',
      });
    } catch (error) {
      console.error(error);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Error al actualizar el estado',
      });
    }
  };

  const eliminarEstado = (estado: Estado) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Eliminar estado',
      message: `¿Deseas eliminar el estado ${estado.codigo}?`,
      isDangerous: true,
      confirmText: 'Eliminar',
      estadoCode: estado.codigo,
      action: async () => {
        try {
          await estadosService.remove(estado.estado_id);
          await cargarEstados();
          setModalState({
            isOpen: true,
            type: 'success',
            title: 'Estado eliminado',
            message: 'El estado ha sido eliminado exitosamente',
          });
        } catch (error) {
          console.error(error);
          setModalState({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el estado. Puede estar en uso.',
          });
        }
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !submitting) {
      action();
    }
    if (e.key === "Escape" && editandoId) {
      cancelarEdicion();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-2xl text-white">🧭</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estados</h1>
              <p className="text-sm text-gray-600">
                Administra los estados del flujo de solicitudes
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Agregar Nuevo Estado
            </h2>
            <p className="text-sm text-gray-600">
              Ingresa codigo, descripcion y orden
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, crearEstado)}
                placeholder="Codigo (ej: PEND)"
                className="px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
              />
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, crearEstado)}
                placeholder="Descripcion"
                className="px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
              />
              <input
                type="number"
                value={orden}
                onChange={(e) =>
                  setOrden(e.target.value === "" ? "" : Number(e.target.value))
                }
                onKeyDown={(e) => handleKeyPress(e, crearEstado)}
                placeholder="Orden"
                className="px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
              />
              <button
                onClick={crearEstado}
                disabled={
                  !codigo.trim() ||
                  !descripcion.trim() ||
                  orden === "" ||
                  submitting
                }
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !codigo.trim() ||
                  !descripcion.trim() ||
                  orden === "" ||
                  submitting
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {submitting ? "Agregando..." : "Agregar Estado"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Estados Registrados
                </h2>
                <p className="text-sm text-gray-600">
                  {estados.length} estado{estados.length !== 1 ? "s" : ""} en el
                  sistema
                </p>
              </div>
              <button
                onClick={cargarEstados}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              >
                Actualizar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Cargando estados...</p>
              </div>
            ) : estados.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-400">📄</span>
                </div>
                <p className="text-gray-600">No hay estados registrados</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Codigo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Descripcion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {estados.map((estado) => (
                    <tr key={estado.estado_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editandoId === estado.estado_id ? (
                          <input
                            value={editandoCodigo}
                            onChange={(e) => setEditandoCodigo(e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          estado.codigo
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editandoId === estado.estado_id ? (
                          <input
                            value={editandoDescripcion}
                            onChange={(e) =>
                              setEditandoDescripcion(e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          estado.descripcion
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editandoId === estado.estado_id ? (
                          <input
                            type="number"
                            value={editandoOrden}
                            onChange={(e) =>
                              setEditandoOrden(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          estado.orden
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {editandoId === estado.estado_id ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => guardarEdicion(estado.estado_id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => iniciarEdicion(estado)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarEstado(estado)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

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
