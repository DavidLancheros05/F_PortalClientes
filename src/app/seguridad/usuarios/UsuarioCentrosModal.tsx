"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Check, Star } from "lucide-react";
import { usuariosCentrosService, CentroOperacion } from "@/services/usuarios-centros/usuarios-centros.service";
import { centrosOperacionService } from "@/services/centros-operacion/centros-operacion.service";
import { ConfirmModal } from "@/components/modals";

interface Centro {
  id: number; // antes co_id
  nombre: string;
  activo: boolean;
}

interface UsuarioCentrosModalProps {
  usuarioId: number;
  usuarioNombre: string;
  onClose: () => void;
}

const UsuarioCentrosModal: React.FC<UsuarioCentrosModalProps> = ({
  usuarioId,
  usuarioNombre,
  onClose,
}) => {
  const [centrosAsignados, setCentrosAsignados] = useState<CentroOperacion[]>(
    [],
  );
  const [centrosDisponibles, setCentrosDisponibles] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [showConfirmAssign, setShowConfirmAssign] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  // ======================================================
  // ✅ SOLO UNA CARGA INICIAL (cuando abre modal)
  // ======================================================
  useEffect(() => {
    loadInicial();
  }, [usuarioId]);

  const loadInicial = async () => {
    try {
      setLoading(true);
      setError(null);

      const asignados = await usuariosCentrosService.getCentrosByUsuario(usuarioId);
      setCentrosAsignados(asignados);

      const disponibles = await centrosOperacionService.getAll();
      setCentrosDisponibles(disponibles.map((c: any) => ({ id: c.cop_id, nombre: c.cop_nombre, activo: c.cop_estado })));
    } catch (err: any) {
      console.error("Error inicial:", err);
      setError(err.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const refreshAsignados = async () => {
    try {
      const asignados = await usuariosCentrosService.getCentrosByUsuario(usuarioId);
      setCentrosAsignados(asignados);
    } catch (err: any) {
      console.error("Error refrescando asignados:", err);
    }
  };

  // ======================================================
  // ASIGNAR
  // ======================================================
  const iniciarAsignacion = () => {
    if (!selectedCentro) {
      setError("Selecciona un centro");
      return;
    }
    setShowConfirmAssign(true);
  };

  const handleAssignCentro = async () => {
    try {
      setLoading(true);
      setError(null);
      await usuariosCentrosService.assignCentro(usuarioId, Number(selectedCentro), false);

      setSelectedCentro("");
      setShowConfirmAssign(false);

      // 🔥 SOLO refresca asignados
      await refreshAsignados();
    } catch (err: any) {
      setShowConfirmAssign(false);
      setError(err.message || "Error asignando centro");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // ELIMINAR
  // ======================================================
  const handleRemoveCentro = async (centroId: number) => {
    try {
      setLoading(true);
      setError(null);

      await usuariosCentrosService.removeCentro(usuarioId, centroId);

      await refreshAsignados();
    } catch (err: any) {
      setError(err.message || "Error removiendo centro");
    } finally {
      setLoading(false);
      setConfirmRemoveId(null);
    }
  };

  // ======================================================
  // DEFAULT
  // ======================================================
  const handleSetDefault = async (centroId: number) => {
    try {
      setLoading(true);
      setError(null);

      await usuariosCentrosService.setDefaultCentro(usuarioId, centroId);

      await refreshAsignados();
    } catch (err: any) {
      setError(err.message || "Error actualizando default");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // FILTRO (sin tocar lógica)
  // ======================================================
  const centrosNoAsignados = centrosDisponibles.filter(
    (c) => !centrosAsignados.some((a) => a.co_id === c.id),
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Centros de Operación asignados al usuario
            </h2>
            <p className="text-sm text-gray-600 mt-1">{usuarioNombre}</p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* ASIGNADOS */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Centros Asignados
            </h3>

            {centrosAsignados.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-4 text-center rounded-lg text-sm text-gray-500">
                No hay centros asignados
              </div>
            ) : (
              <div className="space-y-2">
                {centrosAsignados.map((centro) => (
                  <div
                    key={centro.uco_id}
                    className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {centro.es_default && (
                        <Check size={16} className="text-brand-600" />
                      )}
                      <p className="text-sm text-gray-900">{centro.nombre}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!centro.es_default && (
                        <button
                          onClick={() => handleSetDefault(centro.co_id)}
                          disabled={loading}
                          title="Marcar como predeterminado"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
                        >
                          <Star size={14} />
                          Predeterminado
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmRemoveId(centro.co_id)}
                        disabled={loading}
                        title="Remover centro"
                        className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ASIGNAR */}
          {centrosNoAsignados.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Asignar nuevo centro
              </h3>
              <div className="flex gap-2">
                <select
                  value={selectedCentro}
                  onChange={(e) => setSelectedCentro(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Selecciona...</option>
                  {centrosNoAsignados.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                <button
                  onClick={iniciarAsignacion}
                  disabled={loading || !selectedCentro}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Asignar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmAssign}
        title="Confirmar asignación"
        message={`¿Deseas asignar el centro "${
          centrosNoAsignados.find((c) => String(c.id) === selectedCentro)
            ?.nombre || ""
        }" a este usuario?`}
        confirmText="Sí, asignar"
        cancelText="Cancelar"
        isLoading={loading}
        onConfirm={handleAssignCentro}
        onCancel={() => setShowConfirmAssign(false)}
      />

      <ConfirmModal
        isOpen={confirmRemoveId !== null}
        title="Remover centro"
        message="¿Deseas remover este centro del usuario?"
        confirmText="Remover"
        cancelText="Cancelar"
        isDangerous
        isLoading={loading}
        onConfirm={() => {
          if (confirmRemoveId) handleRemoveCentro(confirmRemoveId);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
};

export default UsuarioCentrosModal;
