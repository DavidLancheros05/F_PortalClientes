'use client';

import { updateOpcion } from '@/services/parametrizacion/opciones.service';

interface Props {
  fp_id: number;
  opciones: any[];
  onChange: () => void;
  loading: boolean;
}

export default function OpcionesTable({
  fp_id,
  opciones,
  onChange,
  loading,
}: Props) {
  if (loading) return <p>Cargando opciones...</p>;
  if (!opciones.length) return <p>No hay opciones</p>;

  const toggleEstado = async (opcion: any) => {
    await updateOpcion(fp_id, opcion.fpo_id, {
      fpo_estado: !opcion.fpo_estado,
    });
    onChange();
  };

  return (
    <table className="w-full border">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Valor</th>
          <th className="p-2">Estado</th>
          <th className="p-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {opciones.map((op) => (
          <tr key={op.fpo_id} className="border-t">
            <td className="p-2">{op.fpo_valor}</td>
            <td className="p-2 text-center">
              {op.fpo_estado ? 'Activo' : 'Inactivo'}
            </td>
            <td className="p-2 text-center">
              <button
                onClick={() => toggleEstado(op)}
                className="text-blue-600 underline"
              >
                Cambiar estado
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
