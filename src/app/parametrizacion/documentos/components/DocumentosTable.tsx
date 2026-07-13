"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { ConfirmModal } from "@/components/modals";

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
        <thead className="bg-blue-700 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Descripcion
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Aplica fecha emisión
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Vigencia
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Genera documento
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-xs text-slate-500"
              >
                No hay tipos de documentos para mostrar.
              </td>
            </tr>
          ) : (
            items.map((tipo) => (
              <tr
                key={tipo.tipoDocumentoId}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-xs font-medium text-slate-800">
                  {tipo.nombre}
                </td>
                <td className="px-4 py-3 text-xs text-slate-700 max-w-[360px]">
                  <p className="whitespace-pre-wrap break-words">
                    {tipo.descripcion || "-"}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {tipo.aplicaFechaEmision ? "Sí" : "No"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {getVigenciaDisplay(tipo)}
                </td>
                <td className="px-4 py-3 text-xs">
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
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      tipo.estado
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {tipo.estado ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
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
                </td>
              </tr>
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
