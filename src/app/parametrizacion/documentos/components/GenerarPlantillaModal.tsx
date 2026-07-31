"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileDown } from "lucide-react";
import { SearchableSelect } from "@/components/FormularioUI/SearchableSelect";
import { clientesService } from "@/services/clientes/clientes.service";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import {
  generarPlantillaDocumentoPdf,
  construirMapaRespuestasPregunta,
} from "@/lib/carta-pdf.util";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tdoNombre: string;
  tdoPlantillaContenido: string;
  formatoCodigo?: string;
  formatoCodigoSecundario?: string;
  revision?: string;
  paginasTotal?: number;
  tipoDocumentoId?: number;
  encabezadoTipo?: "NINGUNO" | "IMAGEN" | "FORMATO_OFICIAL";
  encabezadoImagenUrl?: string | null;
  piePaginaTipo?: "NINGUNO" | "TEXTO" | "IMAGEN";
  piePaginaTexto?: string | null;
  piePaginaImagenUrl?: string | null;
}

/**
 * Genera una vista previa real de una plantilla de "Tipos de documentos" —
 * elige un cliente + una de sus solicitudes ya existentes, y arma el PDF
 * con los datos reales de esa solicitud, reutilizando exactamente
 * generarPlantillaDocumentoPdf (el mismo generador que usa el cliente al
 * hacer clic en "Descargar plantilla" dentro de su formulario). Sirve para
 * validar el diseño/las variables de una plantilla sin tener que llenar un
 * formulario de solicitud completo a mano.
 */
export function GenerarPlantillaModal({
  isOpen,
  onClose,
  tdoNombre,
  tdoPlantillaContenido,
  formatoCodigo,
  formatoCodigoSecundario,
  revision,
  paginasTotal,
  tipoDocumentoId,
  encabezadoTipo,
  encabezadoImagenUrl,
  piePaginaTipo,
  piePaginaTexto,
  piePaginaImagenUrl,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [clientes, setClientes] = useState<
    { id: number; label: string; nit?: string }[]
  >([]);
  const [clienteId, setClienteId] = useState<number | "">("");
  const [solicitudes, setSolicitudes] = useState<
    { id: number; label: string; numero: string }[]
  >([]);
  const [solicitudId, setSolicitudId] = useState<number | "">("");
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setClienteId("");
    setSolicitudId("");
    setSolicitudes([]);
    setError("");
    clientesService
      .getAll()
      .then((data) =>
        setClientes(
          data.map((c) => ({
            id: c.cli_id,
            label: `${c.cli_razon_social}${c.cli_nro_identificacion ? ` — ${c.cli_nro_identificacion}` : ""}`,
            nit: c.cli_nro_identificacion,
          })),
        ),
      )
      .catch((err) => {
        console.error("Error cargando clientes:", err);
        setError("No se pudieron cargar los clientes.");
      });
  }, [isOpen]);

  useEffect(() => {
    if (!clienteId) {
      setSolicitudes([]);
      setSolicitudId("");
      return;
    }
    setCargandoSolicitudes(true);
    setSolicitudId("");
    solicitudesService
      .getAllByCliente(Number(clienteId))
      .then((data: any[]) =>
        setSolicitudes(
          (Array.isArray(data) ? data : []).map((s) => ({
            id: s.sol_id,
            numero: s.sol_numero_solicitud,
            label: `${s.sol_numero_solicitud} — ${s.etapa_nombre || s.resultado_nombre || ""}`,
          })),
        ),
      )
      .catch((err) => {
        console.error("Error cargando solicitudes del cliente:", err);
        setError("No se pudieron cargar las solicitudes de este cliente.");
      })
      .finally(() => setCargandoSolicitudes(false));
  }, [clienteId]);

  if (!isOpen || !mounted) return null;

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const solicitudSeleccionada = solicitudes.find((s) => s.id === solicitudId);

  const handleGenerar = async () => {
    if (!clienteSeleccionado || !solicitudSeleccionada) return;
    setGenerando(true);
    setError("");
    try {
      let respuestasPregunta: Record<string, string> | undefined;
      let representanteLegalNombre: string | undefined;
      let representanteLegalCedula: string | undefined;

      if (/\{\{pregunta\|/.test(tdoPlantillaContenido)) {
        const renderizable = await solicitudesService.getFormularioRenderizable(
          solicitudSeleccionada.id,
        );
        respuestasPregunta = construirMapaRespuestasPregunta(
          renderizable.preguntas,
        );

        // Mismo criterio que SolicitudFormContent.tsx: ancla preferida
        // fp_codigo REP_LEGAL_TABLA, fallback por descripción.
        const preguntaRepLegal =
          renderizable.preguntas.find(
            (p: any) => p.fp_tipo === "TABLA" && p.fp_codigo === "REP_LEGAL_TABLA",
          ) ||
          renderizable.preguntas.find(
            (p: any) =>
              p.fp_tipo === "TABLA" && /repres.*legal/i.test(p.fp_descripcion || ""),
          );
        const primeraFila = preguntaRepLegal?.tabla_filas?.[0];
        if (primeraFila) {
          representanteLegalNombre =
            primeraFila["Apellidos y Nombre"] || primeraFila["Nombre"] || "";
          representanteLegalCedula =
            primeraFila["Identificacion"] || primeraFila["Identificación"] || "";
        }
      }

      let revisiones: { revision: string; descripcionCambio: string; fecha: string }[] = [];
      if (tipoDocumentoId) {
        try {
          const revs = await documentosService.getRevisiones(tipoDocumentoId);
          revisiones = revs.map((r) => ({
            revision: r.revision,
            descripcionCambio: r.descripcionCambio,
            fecha: new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }));
        } catch (err) {
          console.error("Error cargando historial de revisiones:", err);
        }
      }

      await generarPlantillaDocumentoPdf({
        tdoNombre,
        tdoPlantillaContenido,
        clienteNombre: clienteSeleccionado.label.split(" — ")[0],
        clienteNit: clienteSeleccionado.nit,
        numeroSolicitud: solicitudSeleccionada.numero,
        representanteLegalNombre,
        representanteLegalCedula,
        formatoCodigo,
        formatoCodigoSecundario,
        revision,
        paginasTotal,
        respuestasPregunta,
        revisiones,
        encabezadoTipo,
        encabezadoImagenUrl,
        piePaginaTipo,
        piePaginaTexto,
        piePaginaImagenUrl,
      });

      onClose();
    } catch (err) {
      console.error("Error generando vista previa:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error generando la vista previa de la plantilla.",
      );
    } finally {
      setGenerando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Generar vista previa de la plantilla
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          Elegí un cliente y una de sus solicitudes ya registradas — se genera
          el PDF con los datos reales de esa solicitud, igual que lo vería el
          cliente al descargar la plantilla desde su formulario.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Cliente
            </label>
            <SearchableSelect
              options={clientes.map((c) => ({ id: c.id, label: c.label }))}
              value={clienteId}
              onChange={(v) => setClienteId(Number(v))}
              placeholder="Selecciona un cliente..."
              searchPlaceholder="Buscar cliente..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Número de solicitud
            </label>
            <SearchableSelect
              options={solicitudes.map((s) => ({ id: s.id, label: s.label }))}
              value={solicitudId}
              onChange={(v) => setSolicitudId(Number(v))}
              placeholder={
                !clienteId
                  ? "Primero elegí un cliente"
                  : cargandoSolicitudes
                    ? "Cargando..."
                    : "Selecciona una solicitud..."
              }
              disabled={!clienteId || cargandoSolicitudes}
              searchPlaceholder="Buscar número de solicitud..."
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleGenerar}
            disabled={!clienteId || !solicitudId || generando}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <FileDown size={14} />
            {generando ? "Generando..." : "Generar PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={generando}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
