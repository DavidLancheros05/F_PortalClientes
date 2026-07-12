"use client";

import {
  FormularioPregunta,
  formularioPreguntasService,
} from "@/services/parametrizacion/formulario-preguntas.service";

interface Props {
  items: FormularioPregunta[];
  onEdit: (item: FormularioPregunta) => void;
  onReload: () => void;
}

export default function FormularioPreguntaTable({
  items,
  onEdit,
  onReload,
}: Props) {
  const cambiarEstado = async (item: FormularioPregunta) => {
    const ok = confirm(
      `¿Deseas ${item.fp_estado ? "inactivar" : "activar"} esta pregunta?`,
    );
    if (!ok) return;

    try {
      await formularioPreguntasService.update(item.fp_id!, {
        fp_estado: !item.fp_estado,
      });
      onReload();
    } catch (err) {
      console.error(err);
      alert("Error al cambiar el estado");
    }
  };

  return (
    <table className="min-w-full divide-y divide-gray-200 mt-4">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            ID
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Descripción
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Tipo
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Orden
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Estado
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Acciones
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {items.map((item) => (
          <tr key={item.fp_id}>
            <td className="px-6 py-4">{item.fp_id}</td>

            <td className="px-6 py-4">{item.fp_descripcion}</td>

            <td className="px-6 py-4">{item.fp_tipo}</td>

            <td className="px-6 py-4">{item.fp_orden}</td>

            <td className="px-6 py-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.fp_estado
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {item.fp_estado ? "Activo" : "Inactivo"}
              </span>
            </td>

            <td className="px-6 py-4 flex gap-3">
              <button
                onClick={() => onEdit(item)}
                className="text-indigo-600 font-medium"
              >
                Editar
              </button>

              <button
                onClick={() => cambiarEstado(item)}
                className="text-amber-600 font-medium"
              >
                {item.fp_estado ? "Inactivar" : "Activar"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
