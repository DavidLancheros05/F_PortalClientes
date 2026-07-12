"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  TipoDocumento,
  TipoDocumentoPayload,
} from "@/services/admin/parametrizacion/documentos.types";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { tiposVigenciaService } from "@/services/admin/parametrizacion/tipos-vigencia.service";
import { TipoVigencia } from "@/services/admin/parametrizacion/tipos-vigencia.types";
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
    title: "",
    message: "",
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
      reglaVigencia: "",
      aniosAtrasPermitidos: undefined,
      aplicaZonaFranca: false,
      estado: true,
      tienePlantilla: false,
      plantillaContenido: "",
    },
  });

  const aplicaFechaEmision = watch("aplicaFechaEmision");
  const reglaVigencia = watch("reglaVigencia");
  const tienePlantilla = watch("tienePlantilla");
  const anioActual = new Date().getFullYear();

  const [tiposVigencia, setTiposVigencia] = useState<TipoVigencia[]>([]);

  useEffect(() => {
    tiposVigenciaService
      .getAll(true)
      .then(setTiposVigencia)
      .catch((err) => console.error("Error cargando tipos de vigencia:", err));
  }, []);

  useEffect(() => {
    if (editItem) {
      reset({
        nombre: editItem.nombre,
        descripcion: editItem.descripcion || "",
        obligatorio: editItem.obligatorio,
        aplicaFechaEmision: editItem.aplicaFechaEmision,
        vigenciaDias: editItem.vigenciaDias ?? undefined,
        reglaVigencia: editItem.reglaVigencia || "",
        aniosAtrasPermitidos: editItem.aniosAtrasPermitidos ?? undefined,
        aplicaZonaFranca: false,
        estado: editItem.estado,
        tienePlantilla: editItem.tienePlantilla ?? false,
        plantillaContenido: editItem.plantillaContenido || "",
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        obligatorio: false,
        aplicaFechaEmision: false,
        vigenciaDias: undefined,
        reglaVigencia: "",
        aniosAtrasPermitidos: undefined,
        aplicaZonaFranca: false,
        estado: true,
        tienePlantilla: false,
        plantillaContenido: "",
      });
    }
  }, [editItem, reset]);

  const onSubmit = async (data: TipoDocumentoPayload) => {
    try {
      const payload: TipoDocumentoPayload = {
        ...data,
        aplicaZonaFranca: false,
        reglaVigencia: data.aplicaFechaEmision
          ? data.reglaVigencia || undefined
          : undefined,
        vigenciaDias:
          data.aplicaFechaEmision && data.reglaVigencia === "DIAS"
            ? data.vigenciaDias
            : undefined,
        aniosAtrasPermitidos:
          data.aplicaFechaEmision && data.reglaVigencia === "ANIO"
            ? data.aniosAtrasPermitidos
            : undefined,
        tienePlantilla: data.tienePlantilla || false,
        plantillaContenido: data.tienePlantilla
          ? data.plantillaContenido || undefined
          : undefined,
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
        title: "Error",
        message: "Error al guardar tipo de documento",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Nombre del documento
          </label>
          <input
            type="text"
            {...register("nombre", { required: "Campo obligatorio" })}
            placeholder="Ej. Certificado de Cámara y Comercio"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.nombre && (
            <p className="text-red-600 text-xs mt-1">{errors.nombre.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.descripcion && (
            <p className="text-red-600 text-xs mt-1">
              {errors.descripcion.message}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
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
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
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
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
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
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Regla de vigencia
            </label>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input
                  type="radio"
                  value=""
                  {...register("reglaVigencia")}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Sin regla especial
              </label>
              {tiposVigencia.map((tv) => (
                <label
                  key={tv.tipoVigenciaId}
                  className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                >
                  <input
                    type="radio"
                    value={tv.codigo}
                    {...register("reglaVigencia")}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {tv.nombre}
                </label>
              ))}
            </div>

            {reglaVigencia === "DIAS" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiempo de validez (días)
                </label>
                <input
                  type="number"
                  min={1}
                  {...register("vigenciaDias", {
                    required: "Campo obligatorio para esta regla",
                    min: { value: 1, message: "Debe ser mayor a 0" },
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.vigenciaDias && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.vigenciaDias.message}
                  </p>
                )}
              </div>
            )}

            {reglaVigencia === "ANIO" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Años hacia atrás permitidos
                </label>
                <input
                  type="number"
                  min={0}
                  {...register("aniosAtrasPermitidos", {
                    required: "Campo obligatorio para esta regla",
                    min: { value: 0, message: "Debe ser 0 o mayor" },
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.aniosAtrasPermitidos && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.aniosAtrasPermitidos.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Con 0, solo se acepta {anioActual}. Con 1, se acepta{" "}
                  {anioActual - 1} o {anioActual}.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("tienePlantilla")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Tiene plantilla descargable
              <span className="mt-1 block text-xs font-normal text-slate-500">
                El cliente podrá descargar un PDF pre-llenado con datos de su
                solicitud, firmarlo, y volver a subirlo con el mismo control de
                carga de este documento.
              </span>
            </span>
          </label>

          {tienePlantilla && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Contenido de la plantilla
              </label>
              <textarea
                rows={10}
                {...register("plantillaContenido", {
                  required:
                    "Campo obligatorio cuando tiene plantilla descargable",
                })}
                placeholder={
                  "Cordial Saludo:\n\n{{representante_legal_nombre}}, mayor de edad, identificado con cédula de ciudadanía {{representante_legal_cedula}}, en mi calidad de Representante Legal de la Sociedad {{cliente_nombre}}, con NIT {{cliente_nit}}, me permito manifestar que..."
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.plantillaContenido && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.plantillaContenido.message}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Placeholders disponibles: <code>{"{{cliente_nombre}}"}</code>,{" "}
                <code>{"{{cliente_nit}}"}</code>,{" "}
                <code>{"{{numero_solicitud}}"}</code>,{" "}
                <code>{"{{representante_legal_nombre}}"}</code>,{" "}
                <code>{"{{representante_legal_cedula}}"}</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {editItem ? "Actualizar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onCancel();
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
