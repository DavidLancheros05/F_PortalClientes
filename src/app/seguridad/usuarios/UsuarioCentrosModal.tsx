"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import { usuariosCentrosService, CentroOperacion } from "@/services/usuarios-centros/usuarios-centros.service";
import { centrosOperacionService } from "@/services/centros-operacion/centros-operacion.service";

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

      console.log("CARGA INICIAL usuario:", usuarioId);

      const asignados = await usuariosCentrosService.getCentrosByUsuario(usuarioId);
      setCentrosAsignados(asignados);

      const disponibles = await centrosOperacionService.getAll();
      console.log("CENTROS DISPONIBLES:", disponibles);
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
  const handleAssignCentro = async () => {
    console.log("handleAssignCentro pagina editar usuario:", selectedCentro);
    if (!selectedCentro) {
      setError("Selecciona un centro");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(
        "handleAssignCentro Asignando centroId:",
        selectedCentro,
        "a usuarioId:",
        usuarioId,
      );
      await usuariosCentrosService.assignCentro(usuarioId, Number(selectedCentro), false);

      setSelectedCentro("");

      // 🔥 SOLO refresca asignados
      await refreshAsignados();
    } catch (err: any) {
      setError(err.message || "Error asignando centro");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // ELIMINAR
  // ======================================================
  const handleRemoveCentro = async (centroId: number) => {
    if (!confirm("¿Deseas remover este centro?")) return;

    try {
      setLoading(true);
      setError(null);

      await usuariosCentrosService.removeCentro(usuarioId, centroId);

      await refreshAsignados();
    } catch (err: any) {
      setError(err.message || "Error removiendo centro");
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Centros de Operación asignados al usuario
            </h2>
            <p className="text-sm text-gray-600 mt-1">{usuarioNombre}</p>
          </div>

          <button onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* ASIGNADOS */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Centros Asignados</h3>

            {centrosAsignados.length === 0 ? (
              <div className="bg-gray-50 p-4 text-center rounded">
                No hay centros asignados
              </div>
            ) : (
              centrosAsignados.map((centro) => (
                <div
                  key={centro.uco_id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded"
                >
                  <div>
                    {centro.es_default && <Check />}
                    <p>{centro.nombre}</p>
                  </div>

                  <div className="flex gap-2">
                    {!centro.es_default && (
                      <button onClick={() => handleSetDefault(centro.co_id)}>
                        Default
                      </button>
                    )}

                    <button onClick={() => handleRemoveCentro(centro.co_id)}>
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ASIGNAR */}
          {centrosNoAsignados.length > 0 && (
            <div>
              <select
                value={selectedCentro}
                onChange={(e) => setSelectedCentro(e.target.value)}
              >
                <option value="">Selecciona...</option>
                {centrosNoAsignados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAssignCentro}
                disabled={loading || !selectedCentro}
              >
                Asignar
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end p-6 border-t">
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default UsuarioCentrosModal;
