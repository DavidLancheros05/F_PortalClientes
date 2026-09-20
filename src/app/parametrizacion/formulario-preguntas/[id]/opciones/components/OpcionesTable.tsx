"use client";

import { updateOpcion } from "@/services/parametrizacion/opciones.service";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

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
  if (loading) {
    return (
      <table className="w-full border">
        <thead className="bg-gray-50">
          <tr>
            <Th>Valor</Th>
            <Th align="center">Estado</Th>
            <Th align="center">Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 3 }).map((_, i) => (
            <Tr key={i} className="border-t animate-pulse">
              <Td>
                <div className="h-4 bg-gray-200 rounded w-32" />
              </Td>
              <Td align="center">
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
              </Td>
              <Td align="center">
                <div className="h-4 bg-gray-200 rounded w-24 mx-auto" />
              </Td>
            </Tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (!opciones.length) return <p>No hay opciones</p>;

  const toggleEstado = async (opcion: any) => {
    await updateOpcion(fp_id, opcion.fpo_id, {
      fpo_estado: !opcion.fpo_estado,
    });
    onChange();
  };

  return (
    <table className="w-full border">
      <thead className="bg-gray-50">
        <tr>
          <Th>Valor</Th>
          <Th align="center">Estado</Th>
          <Th align="center">Acciones</Th>
        </tr>
      </thead>
      <tbody>
        {opciones.map((op) => (
          <Tr key={op.fpo_id} className="border-t">
            <Td>{op.fpo_valor}</Td>
            <Td align="center">
              {op.fpo_estado ? "Activo" : "Inactivo"}
            </Td>
            <Td align="center">
              <button
                onClick={() => toggleEstado(op)}
                className="text-blue-600 underline"
              >
                Cambiar estado
              </button>
            </Td>
          </Tr>
        ))}
      </tbody>
    </table>
  );
}
