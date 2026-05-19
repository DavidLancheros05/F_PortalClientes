"use client";
import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
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
  const [formSeccion, setFormSeccion] = useState({ nombre: "", descripcion: "" });

  const guardarSeccion = async () => {
    if (!formSeccion.nombre.trim()) {
      alert("El nombre es requerido");
      return;
    }
    try {
      if (editandoSeccion) {
        await fetch(`/api/parametrizacion/formulario-secciones/${editandoSeccion}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seccion_nombre: formSeccion.nombre,
            seccion_descripcion: formSeccion.descripcion,
          }),
        });
      } else {
        const nuevoOrden =
          secciones.length > 0 ? Math.max(...secciones.map((s) => (s.fs_orden || s.seccion_orden || 0))) + 1 : 1;
        await fetch("/api/parametrizacion/formulario-secciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seccion_nombre: formSeccion.nombre,
            seccion_descripcion: formSeccion.descripcion,
            seccion_orden: nuevoOrden,
          }),
        });
      }
      setFormSeccion({ nombre: "", descripcion: "" });
      setEditandoSeccion(null);
      setNuevaSeccion(false);
      await cargarDatos();
    } catch (error) {
      console.error("Error guardando sección:", error);
    }
  };

  const iniciarEdicionSeccion = (seccion: Seccion) => {
    setFormSeccion({
      nombre: seccion.fs_nombre || seccion.seccion_nombre || "",
      descripcion: seccion.fs_descripcion || seccion.seccion_descripcion || "",
    });
    setEditandoSeccion(seccion.fs_id || seccion.seccion_id || null);
    setNuevaSeccion(false);
  };

  const eliminarSeccion = async (seccionId: number) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar esta sección? Se eliminarán sus preguntas y respuestas asociadas.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/parametrizacion/formulario-secciones/${seccionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (seccionSeleccionada === seccionId) {
          setSeccionSeleccionada(null);
        }
        setEditandoSeccion(null);
        setNuevaSeccion(false);
        await cargarDatos();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || data?.error || "Error al eliminar sección");
      }
    } catch (error) {
      console.error("Error eliminando sección:", error);
      alert("Error al eliminar sección");
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
      await fetch(
        `/api/parametrizacion/formulario-secciones/${idA}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seccion_orden: nuevasSecciones[indice].fs_orden || nuevasSecciones[indice].seccion_orden }),
        },
      );
      await fetch(
        `/api/parametrizacion/formulario-secciones/${idB}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seccion_orden: nuevasSecciones[intercambioIndice].fs_orden || nuevasSecciones[intercambioIndice].seccion_orden,
          }),
        },
      );
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
          return fetch(`/api/parametrizacion/formulario-secciones/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seccion_orden: index + 1 }),
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
    cambiarOrdenSeccion,
    guardarOrdenSecciones,
    handleSeccionDragEnd,
  };
}
