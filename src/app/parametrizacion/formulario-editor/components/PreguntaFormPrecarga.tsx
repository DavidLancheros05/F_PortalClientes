"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState } from "../hooks/types";

interface PreguntaFormPrecargaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
}

// Campos que expone el cliente para precargar (fp_precarga_campo_cliente).
// Deben coincidir con las claves que arma useClienteData.ts; si se agrega
// una allá, agregarla aquí. Antes había un selector Base de datos → Tabla →
// Columna que no se guardaba en ningún lado: el campo real nunca se podía
// configurar desde el editor.
const CAMPOS_CLIENTE: { valor: string; etiqueta: string }[] = [
  { valor: "cliente_razon_social", etiqueta: "Razón social" },
  { valor: "cliente_nombre", etiqueta: "Nombre" },
  { valor: "cliente_tipo_identificacion", etiqueta: "Tipo de identificación" },
  { valor: "cliente_nit_documento", etiqueta: "NIT / documento" },
  { valor: "cliente_email", etiqueta: "Correo electrónico" },
  { valor: "cliente_direccion", etiqueta: "Dirección" },
  { valor: "pai_id", etiqueta: "País" },
  { valor: "dpto_id", etiqueta: "Departamento" },
  { valor: "ciu_id", etiqueta: "Ciudad" },
  { valor: "cliente_id", etiqueta: "Id del cliente" },
];

const FUENTES_CON_CLIENTE = ["cliente", "cliente_primero", "ultima_primero"];

export function PreguntaFormPrecarga({
  formPregunta,
  setFormPregunta,
}: PreguntaFormPrecargaProps) {
  // Un valor guardado que no está en la lista (dato viejo o puesto a mano en
  // BD) se muestra igual, para no borrarlo en silencio al guardar.
  const campoGuardadoDesconocido =
    !!formPregunta.precarga_campo_cliente &&
    !CAMPOS_CLIENTE.some((c) => c.valor === formPregunta.precarga_campo_cliente);

  return (
    <>
      {/* Precarga */}
      {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
        formPregunta.tipo as any,
      ) && (
        <div className="space-y-2 p-3 bg-slate-50 border border-gray-200 rounded-xl">
          <div>
            <h4 className="text-[12.5px] font-bold text-gray-800">
              Precarga de datos
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Define de dónde se tomará el valor inicial para esta pregunta
            </p>
          </div>

          <div className="pt-1 space-y-1">
            <label className="block text-[13px] font-semibold text-gray-800">
              Fuente de precarga
            </label>
            <select
              value={formPregunta.precarga_fuente}
              onChange={(e) =>
                setFormPregunta({
                  ...formPregunta,
                  precarga_fuente: e.target.value,
                  precarga_campo_cliente: FUENTES_CON_CLIENTE.includes(
                    e.target.value,
                  )
                    ? formPregunta.precarga_campo_cliente
                    : "",
                })
              }
              className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
            >
              <option value="">Sin precarga</option>
              <option value="cliente">Datos del cliente</option>
              <option value="ultima_solicitud">Última solicitud</option>
              <option value="cliente_primero">
                Cliente (primero), luego última solicitud
              </option>
              <option value="ultima_primero">
                Última solicitud (primero), luego cliente
              </option>
            </select>
          </div>

          {FUENTES_CON_CLIENTE.includes(formPregunta.precarga_fuente) && (
            <div className="pt-1 space-y-1">
              <label className="block text-[13px] font-semibold text-gray-800">
                Campo del cliente <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.precarga_campo_cliente || ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    precarga_campo_cliente: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
              >
                <option value="">Selecciona un campo</option>
                {campoGuardadoDesconocido && (
                  <option value={formPregunta.precarga_campo_cliente}>
                    {formPregunta.precarga_campo_cliente} (valor actual)
                  </option>
                )}
                {CAMPOS_CLIENTE.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
              {!formPregunta.precarga_campo_cliente && (
                <p className="text-xs text-amber-700">
                  Sin campo elegido, la precarga desde el cliente no llena nada.
                </p>
              )}
            </div>
          )}

          {formPregunta.precarga_fuente && (
            <p className="text-xs text-gray-600 font-medium bg-white px-2.5 py-2 rounded-[9px] border border-gray-200">
              {formPregunta.precarga_fuente === "cliente" &&
                "Llenará automáticamente con datos del cliente actual"}
              {formPregunta.precarga_fuente === "ultima_solicitud" &&
                "Llenará automáticamente con la respuesta de la última solicitud"}
              {formPregunta.precarga_fuente === "cliente_primero" &&
                "Intentará llenar primero con datos del cliente, si no hay valor, usa última solicitud"}
              {formPregunta.precarga_fuente === "ultima_primero" &&
                "Intentará llenar primero con última solicitud, si no hay valor, usa datos del cliente"}
            </p>
          )}
        </div>
      )}
    </>
  );
}
