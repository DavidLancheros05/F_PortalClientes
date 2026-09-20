"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, AlertTriangle } from "lucide-react";
import { clientesService } from "@/services/clientes/clientes.service";

interface Props {
  clienteId: number;
  clienteNombre: string;
  onClose: () => void;
}

/**
 * Vista previa del EXEC que se llamaría contra SP_Clientes_Insertar en
 * SIESA — solo lectura, nunca lo ejecuta (no hay conexión real a SIESA
 * todavía, ver Portal Clientes/SIESA/plan-envio-solicitud-aprobada-a-siesa.md).
 */
export default function SiesaPreviewModal({
  clienteId,
  clienteNombre,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sql, setSql] = useState("");
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setLoading(true);
    setError("");
    clientesService
      .getSiesaPreview(clienteId)
      .then((res) => {
        setSql(res.sql);
        setCamposFaltantes(res.camposFaltantes || []);
      })
      .catch((err) => {
        console.error("Error generando vista previa SIESA:", err);
        setError(
          err?.response?.data?.message ||
            "No se pudo generar la vista previa.",
        );
      })
      .finally(() => setLoading(false));
  }, [clienteId]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("Error copiando al portapapeles:", err);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Vista previa — Crear en SIESA
            </h2>
            <p className="text-xs text-slate-500">{clienteNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Esto es solo una vista previa — no se envía nada a SIESA. Todavía no
          hay conexión real configurada; el SQL de abajo es lo que se
          llamaría, armado con los datos de la última solicitud aprobada de
          este cliente.
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Generando vista previa...
          </div>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <>
            {camposFaltantes.length > 0 && (
              <div className="mb-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Campos sin dato confiable hoy (marcados en el SQL):{" "}
                  {camposFaltantes.join(", ")}
                </span>
              </div>
            )}
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100 whitespace-pre-wrap">
              {sql}
            </pre>
          </>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={copiar}
            disabled={loading || !!error}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? "Copiado" : "Copiar SQL"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
