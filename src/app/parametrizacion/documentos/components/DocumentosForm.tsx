"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  TipoDocumento,
  TipoDocumentoPayload,
} from "@/services/admin/parametrizacion/documentos.types";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { ConfirmModal } from "@/components/modals";

interface Props {
  editItem?: TipoDocumento;
  onSaved: () => void;
  onCancel: () => void;
}

export default function DocumentosForm({ editItem, onSaved, onCancel }: Props) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TipoDocumentoPayload>({
    defaultValues: {
      nombre: "",
      descripcion: "",
      obligatorio: false,
      aplicaFechaEmision: false,
      vigenciaDias: undefined,
      aplicaZonaFranca: false,
      estado: true,
    },
  });

  const aplicaFechaEmision = watch("aplicaFechaEmision");

  useEffect(() => {
    if (editItem) {
      reset({
        nombre: editItem.nombre,
        descripcion: editItem.descripcion || "",
        obligatorio: editItem.obligatorio,
        aplicaFechaEmision: editItem.aplicaFechaEmision,
        vigenciaDias: editItem.vigenciaDias ?? undefined,
        aplicaZonaFranca: false,
        estado: editItem.estado,
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        obligatorio: false,
        aplicaFechaEmision: false,
        vigenciaDias: undefined,
        aplicaZonaFranca: false,
        estado: true,
      });
    }
  }, [editItem, reset]);

  const onSubmit = async (data: TipoDocumentoPayload) => {
    try {
      const payload: TipoDocumentoPayload = {
        ...data,
        aplicaZonaFranca: false,
        vigenciaDias: data.aplicaFechaEmision ? data.vigenciaDias : undefined,
      };

      if (editItem?.tipoDocumentoId) {
        await documentosService.update(editItem.tipoDocumentoId, payload);
      } else {
        await documentosService.create(payload);
      }

      onSaved();
      reset();
    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar tipo de documento',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Nombre del documento
          </label>
          <input
            type="text"
            {...register("nombre", { required: "Campo obligatorio" })}
            placeholder="Ej. Certificado de Cámara y Comercio"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.nombre && (
            <p className="text-red-600 text-xs mt-1">{errors.nombre.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Descripcion del documento
          </label>
          <textarea
            rows={3}
            {...register("descripcion", {
              required: "Campo obligatorio",
              maxLength: {
                value: 500,
                message: "Maximo 500 caracteres",
              },
            })}
            placeholder="Ej. Documento que certifica existencia y representacion legal de la empresa."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.descripcion && (
            <p className="text-red-600 text-xs mt-1">
              {errors.descripcion.message}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("aplicaFechaEmision")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Aplica fecha de emisión / vencimiento
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Al adjuntar este documento, se solicitará la fecha y se validará
                su vigencia.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("obligatorio")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Obligatorio
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Si está activo, el sistema exigirá que el cliente adjunte este
                archivo.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("estado")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Estado activo
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Inactiva el tipo cuando no deba usarse en nuevos formularios.
              </span>
            </span>
          </label>
        </div>

        {aplicaFechaEmision && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Tiempo de validez (días)
            </label>
            <input
              type="number"
              min={1}
              {...register("vigenciaDias", {
                required: "Campo obligatorio cuando aplica fecha de emisión",
                min: { value: 1, message: "Debe ser mayor a 0" },
                valueAsNumber: true,
              })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.vigenciaDias && (
              <p className="text-red-600 text-xs mt-1">
                {errors.vigenciaDias.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {editItem ? "Actualizar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onCancel();
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText="Aceptar"
        isDangerous={true}
        onConfirm={() => setModalState({ ...modalState, isOpen: false })}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
      />
    </form>
  );
}
