"use client";

import { useEffect, useState } from "react";
import { formularioSeccionesService } from "@/services/parametrizacion/formulario-secciones.service";

type Seccion = {
  seccion_id: number;
  seccion_nombre: string;
  seccion_descripcion?: string;
  seccion_orden: number;
  seccion_activo: boolean;
};

export default function FormularioSeccionesPage() {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState<number>(1);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [editingDescripcion, setEditingDescripcion] = useState("");
  const [editingOrden, setEditingOrden] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const crear = async () => {
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      await formularioSeccionesService.create({
        seccion_nombre: nombre.trim(),
        seccion_descripcion: descripcion.trim() || null,
        seccion_orden: orden,
      });

      setNombre("");
      setDescripcion("");
      setOrden(1);
      await cargarDatos();
    } catch (error: any) {
      alert(error.message || "Error al crear");
    } finally {
      setSubmitting(false);
    }
  };

  const iniciarEdicion = (seccion: Seccion) => {
    setEditingId(seccion.seccion_id);
    setEditingNombre(seccion.seccion_nombre);
    setEditingDescripcion(seccion.seccion_descripcion || "");
    setEditingOrden(seccion.seccion_orden);
  };

  const guardarEdicion = async () => {
    if (!editingId || editingNombre.trim().length === 0 || editingOrden <= 0)
      return;

    try {
      await formularioSeccionesService.update(editingId, {
        seccion_nombre: editingNombre.trim(),
        seccion_descripcion: editingDescripcion.trim() || null,
        seccion_orden: editingOrden,
      });

      setEditingId(null);
      await cargarDatos();
    } catch (error: any) {
      alert(error.message || "Error al actualizar");
    }
  };

  const toggleEstado = async (seccion: Seccion) => {
    const confirmar = confirm(
      `¿Deseas ${seccion.seccion_activo ? "inactivar" : "activar"} esta sección?`,
    );

    if (!confirmar) return;

    try {
      await formularioSeccionesService.toggleEstado(seccion.seccion_id);
      await cargarDatos();
    } catch (error: any) {
      alert(error.message || "Error al actualizar estado");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Secciones del Formulario</h1>

      {/* Formulario crear */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nombre de la sección"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border px-3 py-2 rounded col-span-2"
          />

          <input
            type="number"
            min={1}
            placeholder="Orden"
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value))}
            className="border px-3 py-2 rounded"
          />

          <button
            onClick={crear}
            disabled={submitting || !isFormValid}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Guardando..." : "Agregar"}
          </button>
        </div>

        <textarea
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border px-3 py-2 rounded w-full"
          rows={2}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="w-full bg-white rounded shadow">
          <thead className="bg-gray-100">
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
              <tr key={seccion.seccion_id} className="border-t">
                <td className="p-2 text-center">
                  {editingId === seccion.seccion_id ? (
                    <input
                      type="number"
                      min={1}
                      value={editingOrden}
                      onChange={(e) => setEditingOrden(Number(e.target.value))}
                      className="border px-2 py-1 w-20"
                    />
                  ) : (
                    seccion.seccion_orden
                  )}
                </td>
                <td className="p-2">
                  {editingId === seccion.seccion_id ? (
                    <input
                      type="text"
                      value={editingNombre}
                      onChange={(e) => setEditingNombre(e.target.value)}
                      className="border px-2 py-1 w-full"
                    />
                  ) : (
                    seccion.seccion_nombre
                  )}
                </td>
                <td className="p-2">
                  {editingId === seccion.seccion_id ? (
                    <textarea
                      value={editingDescripcion}
                      onChange={(e) => setEditingDescripcion(e.target.value)}
                      className="border px-2 py-1 w-full"
                      rows={2}
                    />
                  ) : (
                    seccion.seccion_descripcion || "—"
                  )}
                </td>
                <td className="p-2 text-center">
                  {seccion.seccion_activo ? "Activo" : "Inactivo"}
                </td>
                <td className="p-2 text-center space-x-2">
                  {editingId === seccion.seccion_id ? (
                    <button
                      onClick={guardarEdicion}
                      className="text-indigo-600"
                    >
                      Guardar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => iniciarEdicion(seccion)}
                        className="text-indigo-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleEstado(seccion)}
                        className="text-amber-600"
                      >
                        {seccion.seccion_activo ? "Inactivar" : "Activar"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
