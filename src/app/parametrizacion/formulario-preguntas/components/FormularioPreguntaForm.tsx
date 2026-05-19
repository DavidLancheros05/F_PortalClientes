"use client";

import { useEffect, useState } from "react";
import { FormularioPregunta, formularioPreguntasService } from "@/services/parametrizacion/formulario-preguntas.service";

interface Props {
  editItem?: FormularioPregunta;
  onSaved: () => void;
  onCancel?: () => void;
}

export default function FormularioPreguntaForm({
  editItem,
  onSaved,
  onCancel,
}: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("TEXTO");
  const [orden, setOrden] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setDescripcion(editItem.fp_descripcion);
      setTipo(editItem.fp_tipo);
      setOrden(editItem.fp_orden || 1);
    } else {
      setDescripcion("");
      setTipo("TEXTO");
      setOrden(1);
    }
  }, [editItem]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion.trim()) {
      alert("La descripción es requerida");
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await formularioPreguntasService.update(editItem.fp_id!, {
          fp_descripcion: descripcion,
          fp_tipo: tipo,
          fp_orden: orden,
        });
      } else {
        await formularioPreguntasService.create({
          fp_descripcion: descripcion,
          fp_tipo: tipo,
          fp_orden: orden,
          fp_estado: true,
        });
      }

      onSaved();
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-5 bg-white p-6 rounded shadow-md border border-gray-200"
    >
      <h2 className="font-semibold text-lg text-gray-900">
        {editItem ? "Editar pregunta" : "Nueva pregunta"}
      </h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Descripción *
        </label>
        <input
          type="text"
          placeholder="Ej: Nombre completo"
          className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo *
        </label>
        <select
          className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="TEXTO">Texto</option>
          <option value="NUMERO">Número</option>
          <option value="FECHA">Fecha</option>
          <option value="SELECT">Selección única</option>
          <option value="NOTA">Nota</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Orden *
        </label>
        <input
          type="number"
          placeholder="1"
          className="border border-gray-300 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={orden}
          onChange={(e) => setOrden(Number(e.target.value))}
          min="1"
          required
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? "Guardando..." : editItem ? "Actualizar" : "Guardar"}
        </button>

        {editItem && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-600 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
