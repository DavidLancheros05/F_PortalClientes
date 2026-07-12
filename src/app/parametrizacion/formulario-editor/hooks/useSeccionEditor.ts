"use client";
import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import api from "@/services/core/api";
import type { Seccion } from "./types";

type SeccionEditorDeps = {
  secciones: Seccion[];
  setSecciones: React.Dispatch<React.SetStateAction<Seccion[]>>;
  seccionSeleccionada: number | null;
  setSeccionSeleccionada: React.Dispatch<React.SetStateAction<number | null>>;
  cargarDatos: () => Promise<void>;
  readonly: boolean;
};

export function useSeccionEditor({
  secciones,
  setSecciones,
  seccionSeleccionada,
  setSeccionSeleccionada,
  cargarDatos,
  readonly,
}: SeccionEditorDeps) {
  const [editandoSeccion, setEditandoSeccion] = useState<number | null>(null);
  const [nuevaSeccion, setNuevaSeccion] = useState(false);
  const [formSeccion, setFormSeccion] = useState({
    nombre: "",
    descripcion: "",
    ocultaEnFormulario: false,
  });
  const [seccionAEliminar, setSeccionAEliminar] = useState<number | null>(null);

  const guardarSeccion = async () => {
    if (!formSeccion.nombre.trim()) {
      alert("El nombre es requerido");
      return;
    }
    try {
      if (editandoSeccion) {
        await api.put(`/parametrizacion/formulario-secciones/${editandoSeccion}`, {
          seccion_nombre: formSeccion.nombre,
          seccion_descripcion: formSeccion.descripcion,
          seccion_oculta_en_formulario: formSeccion.ocultaEnFormulario,
        });
      } else {
        const nuevoOrden =
          secciones.length > 0 ? Math.max(...secciones.map((s) => (s.fs_orden || s.seccion_orden || 0))) + 1 : 1;
        await api.post("/parametrizacion/formulario-secciones", {
          seccion_nombre: formSeccion.nombre,
          seccion_descripcion: formSeccion.descripcion,
          seccion_orden: nuevoOrden,
          seccion_oculta_en_formulario: formSeccion.ocultaEnFormulario,
        });
      }
      setFormSeccion({ nombre: "", descripcion: "", ocultaEnFormulario: false });
      setEditandoSeccion(null);
      setNuevaSeccion(false);
      await cargarDatos();
    } catch (error) {
      console.error("Error guardando sección:", error);
      alert("Error al guardar la sección");
    }
  };

  const iniciarEdicionSeccion = (seccion: Seccion) => {
    setFormSeccion({
      nombre: seccion.fs_nombre || seccion.seccion_nombre || "",
      descripcion: seccion.fs_descripcion || seccion.seccion_descripcion || "",
      ocultaEnFormulario: seccion.fs_oculta_en_formulario ?? false,
    });
    setEditandoSeccion(seccion.fs_id || seccion.seccion_id || null);
    setNuevaSeccion(false);
  };

  const eliminarSeccion = (seccionId: number) => {
    setSeccionAEliminar(seccionId);
  };

  const confirmarEliminarSeccion = async () => {
    if (seccionAEliminar === null) return;
    const seccionId = seccionAEliminar;
    setSeccionAEliminar(null);
    try {
      await api.delete(`/parametrizacion/formulario-secciones/${seccionId}`);
      if (seccionSeleccionada === seccionId) {
        setSeccionSeleccionada(null);
      }
      setEditandoSeccion(null);
      setNuevaSeccion(false);
      await cargarDatos();
    } catch (error: any) {
      console.error("Error eliminando sección:", error);
      const data = error?.response?.data;
      alert(data?.message || data?.error || "Error al eliminar sección");
      if (error?.response?.status === 404) {
        // La sección ya no existe en la BD: refrescar para que desaparezca
        // de la lista y no se repita el intento sobre una fila fantasma.
        await cargarDatos();
      }
    }
  };

  const cambiarOrdenSeccion = async (seccionId: number, direccion: "arriba" | "abajo") => {
    const indice = secciones.findIndex((s) => (s.fs_id || s.seccion_id) === seccionId);
    if (
      (direccion === "arriba" && indice === 0) ||
      (direccion === "abajo" && indice === secciones.length - 1)
    ) {
      return;
    }
    const nuevasSecciones = [...secciones];
    const intercambioIndice = direccion === "arriba" ? indice - 1 : indice + 1;
    const ordenTemp = nuevasSecciones[indice].fs_orden || nuevasSecciones[indice].seccion_orden || 0;
    nuevasSecciones[indice].fs_orden = nuevasSecciones[intercambioIndice].fs_orden || nuevasSecciones[intercambioIndice].seccion_orden || 0;
    nuevasSecciones[indice].seccion_orden = nuevasSecciones[indice].fs_orden;
    nuevasSecciones[intercambioIndice].fs_orden = ordenTemp;
    nuevasSecciones[intercambioIndice].seccion_orden = ordenTemp;
    try {
      const idA = nuevasSecciones[indice].fs_id || nuevasSecciones[indice].seccion_id;
      const idB = nuevasSecciones[intercambioIndice].fs_id || nuevasSecciones[intercambioIndice].seccion_id;
      await api.put(`/parametrizacion/formulario-secciones/${idA}`, {
        seccion_orden: nuevasSecciones[indice].fs_orden || nuevasSecciones[indice].seccion_orden,
      });
      await api.put(`/parametrizacion/formulario-secciones/${idB}`, {
        seccion_orden: nuevasSecciones[intercambioIndice].fs_orden || nuevasSecciones[intercambioIndice].seccion_orden,
      });
      setSecciones(nuevasSecciones.sort((a, b) => (a.fs_orden || a.seccion_orden || 0) - (b.fs_orden || b.seccion_orden || 0)));
    } catch (error) {
      console.error("Error cambiando orden:", error);
    }
  };

  const guardarOrdenSecciones = async (ordenadas: Seccion[]) => {
    try {
      await Promise.all(
        ordenadas.map((seccion, index) => {
          const id = seccion.fs_id || seccion.seccion_id;
          return api.put(`/parametrizacion/formulario-secciones/${id}`, {
            seccion_orden: index + 1,
          });
        }),
      );
    } catch (error) {
      console.error("Error guardando orden de secciones:", error);
    }
  };

  const handleSeccionDragEnd = async (event: any) => {
    if (readonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = secciones.findIndex((s) => `seccion-${s.fs_id || s.seccion_id}` === active.id);
    const newIndex = secciones.findIndex((s) => `seccion-${s.fs_id || s.seccion_id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordenadas = arrayMove(secciones, oldIndex, newIndex).map((seccion, index) => ({
      ...seccion,
      fs_orden: index + 1,
      seccion_orden: index + 1,
    }));
    setSecciones(reordenadas);
    await guardarOrdenSecciones(reordenadas);
  };

  return {
    editandoSeccion,
    setEditandoSeccion,
    nuevaSeccion,
    setNuevaSeccion,
    formSeccion,
    setFormSeccion,
    guardarSeccion,
    iniciarEdicionSeccion,
    eliminarSeccion,
    confirmarEliminarSeccion,
    seccionAEliminar,
    setSeccionAEliminar,
    cambiarOrdenSeccion,
    guardarOrdenSecciones,
    handleSeccionDragEnd,
  };
}
