"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { ConfirmModal } from "@/components/modals";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

interface Props {
  items: TipoDocumento[];
  onEdit: (item: TipoDocumento) => void;
  onReload: () => void;
}

const getVigenciaDisplay = (tipo: TipoDocumento): string => {
  if (!tipo.aplicaFechaEmision) return "-";

  if (tipo.reglaVigencia === "DIAS") {
    return tipo.vigenciaDias
      ? `${tipo.vigenciaDias} día${tipo.vigenciaDias === 1 ? "" : "s"}`
      : "-";
  }

  if (tipo.reglaVigencia === "ANIO") {
    const anioActual = new Date().getFullYear();
    const anios = tipo.aniosAtrasPermitidos ?? 0;
    return anios === 0
      ? `Solo año ${anioActual}`
      : `${anioActual - anios} a ${anioActual}`;
  }

  return "-";
};

export default function DocumentosTable({ items, onEdit, onReload }: Props) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "confirm";
    title: string;
    message: string;
    action?: () => void;
  }>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });

  const handleDelete = (id: number) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Eliminar documento",
      message: "¿Deseas eliminar este tipo de documento?",
      action: async () => {
        try {
          await documentosService.delete(id);
          onReload();
        } catch (err) {
          console.error(err);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Error al eliminar tipo de documento",
          });
        }
      },
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[980px]">
        <thead className="bg-gray-50">
          <tr>
            <Th>Nombre</Th>
            <Th>Descripcion</Th>
            <Th>Aplica fecha emisión</Th>
            <Th>Vigencia</Th>
            <Th>Genera documento</Th>
            <Th>Estado</Th>
            <Th align="center" sticky>
              Acciones
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.length === 0 ? (
            <tr>
              <Td colSpan={7} align="center" className="text-slate-500">
                No hay tipos de documentos para mostrar.
              </Td>
            </tr>
          ) : (
            items.map((tipo) => (
              <Tr key={tipo.tipoDocumentoId}>
                <Td className="font-medium text-slate-800">{tipo.nombre}</Td>
                <Td className="max-w-[360px]">
                  <p className="whitespace-pre-wrap break-words">
                    {tipo.descripcion || "-"}
                  </p>
                </Td>
                <Td>{tipo.aplicaFechaEmision ? "Sí" : "No"}</Td>
                <Td>{getVigenciaDisplay(tipo)}</Td>
                <Td>
                  {tipo.tienePlantilla ? (
                    <span
                      className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                      title={tipo.plantillaContenido || undefined}
                    >
                      Sí, con plantilla
                    </span>
                  ) : (
                    <span className="text-slate-500">No</span>
                  )}
                </Td>
                <Td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      tipo.estado
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {tipo.estado ? "Activo" : "Inactivo"}
                  </span>
                </Td>
                <Td align="center" sticky>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(tipo)}
                      className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tipo.tipoDocumentoId)}
                      className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modals */}
      {modalState.type === "error" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Aceptar"
          isDangerous={true}
          onConfirm={() => setModalState({ ...modalState, isOpen: false })}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === "confirm" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Eliminar"
          isDangerous={true}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
            setModalState({ ...modalState, isOpen: false });
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}
    </div>
  );
}
