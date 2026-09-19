"use client";

import { useState } from "react";
import {
  FormularioPregunta,
  formularioPreguntasService,
} from "@/services/parametrizacion/formulario-preguntas.service";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { ConfirmModal, ErrorModal } from "@/components/modals";

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
  const [itemACambiarEstado, setItemACambiarEstado] =
    useState<FormularioPregunta | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cambiarEstado = (item: FormularioPregunta) => {
    setItemACambiarEstado(item);
  };

  const confirmarCambiarEstado = async () => {
    if (!itemACambiarEstado) return;
    setCambiandoEstado(true);
    try {
      await formularioPreguntasService.update(itemACambiarEstado.fp_id!, {
        fp_estado: !itemACambiarEstado.fp_estado,
      });
      setItemACambiarEstado(null);
      onReload();
    } catch (err) {
      console.error(err);
      setErrorMessage("Error al cambiar el estado");
      setItemACambiarEstado(null);
    } finally {
      setCambiandoEstado(false);
    }
  };

  return (
    <>
    <table className="min-w-full divide-y divide-gray-200 mt-4">
      <thead className="bg-gray-50">
        <tr>
          <Th>ID</Th>
          <Th>Descripción</Th>
          <Th>Tipo</Th>
          <Th>Orden</Th>
          <Th>Estado</Th>
          <Th sticky>Acciones</Th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {items.map((item) => (
          <Tr key={item.fp_id}>
            <Td>{item.fp_id}</Td>

            <Td>{item.fp_descripcion}</Td>

            <Td>{item.fp_tipo}</Td>

            <Td>{item.fp_orden}</Td>

            <Td>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.fp_estado
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {item.fp_estado ? "Activo" : "Inactivo"}
              </span>
            </Td>

            <Td sticky className="flex gap-3">
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
            </Td>
          </Tr>
        ))}
      </tbody>
    </table>

    <ConfirmModal
      isOpen={!!itemACambiarEstado}
      title={itemACambiarEstado?.fp_estado ? "Inactivar pregunta" : "Activar pregunta"}
      message={`¿Deseas ${itemACambiarEstado?.fp_estado ? "inactivar" : "activar"} esta pregunta?`}
      confirmText="Sí, continuar"
      isLoading={cambiandoEstado}
      onConfirm={confirmarCambiarEstado}
      onCancel={() => setItemACambiarEstado(null)}
    />

    <ErrorModal
      isOpen={!!errorMessage}
      message={errorMessage || ""}
      onAction={() => setErrorMessage(null)}
    />
    </>
  );
}
