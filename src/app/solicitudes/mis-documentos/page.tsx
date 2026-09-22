"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { PdfIcon } from "@/components/icons/FileIcons";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
import { misDocumentosService, type MiDocumento, type MisDocumentosResponse } from "@/services/mis-documentos.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import {
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  documentoRequiereFechaEmision,
  getArchivoPreviewUrl,
} from "@/lib/documentos-vigencia.util";
import { ConfirmModal, LoadingModal, SuccessModal } from "@/components/modals";
import { useUpload } from "@/context/UploadContext";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

function requiereFecha(doc: MiDocumento) {
  return documentoRequiereFechaEmision(doc);
}

function getEstadoVigencia(doc: MiDocumento) {
  const fecha = doc.sd_fecha_emision ? doc.sd_fecha_emision.split("T")[0] : undefined;

  if (doc.tdo_regla_vigencia === "ANIO") {
    const estado = calcularEstadoAnioDocumento(fecha, doc.tdo_anios_atras_permitidos);
    if (!estado)
      return {
        estado: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
        detalle: "-",
      };
    if (!estado.valido) {
      return {
        estado: "Vencido",
        className: "bg-red-100 text-red-800",
        vencido: true,
        detalle: `Año ${estado.anioDocumento} (fuera de rango permitido)`,
      };
    }

    const { mesesRestantes = 0, diasRestantes = 0 } = estado;
    const partes: string[] = [];
    if (mesesRestantes > 0) {
      partes.push(`${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`);
    }
    if (diasRestantes > 0 || partes.length === 0) {
      partes.push(`${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`);
    }

    return {
      estado: "Vigente",
      className: "bg-emerald-100 text-emerald-800",
      vencido: false,
      detalle: `Año ${estado.anioDocumento} · faltan ${partes.join(" y ")}`,
    };
  }

  if (doc.tdo_vigencia_dias != null) {
    const resumen = calcularVigenciaDocumento(fecha, doc.tdo_vigencia_dias);
    if (!resumen)
      return {
        estado: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
        detalle: "-",
      };
    return resumen.diasRestantes >= 0
      ? {
          estado: "Vigente",
          className: "bg-emerald-100 text-emerald-800",
          vencido: false,
          detalle: `Faltan ${resumen.diasRestantes} día${resumen.diasRestantes === 1 ? "" : "s"}`,
        }
      : {
          estado: "Vencido",
          className: "bg-red-100 text-red-800",
          vencido: true,
          detalle: `Vencido hace ${Math.abs(resumen.diasRestantes)} día${Math.abs(resumen.diasRestantes) === 1 ? "" : "s"}`,
        };
  }

  return {
    estado: "Sin vigencia",
    className: "bg-slate-100 text-slate-600",
    vencido: false,
    detalle: "-",
  };
}

function esDocumentoEditable(
  doc: MiDocumento,
  puedeCorregir: boolean,
  rechazadoPorAuxiliar: boolean,
  vencido: boolean,
) {
  if (!puedeCorregir) return false;
  if (!rechazadoPorAuxiliar) return true;
  return doc.sd_requiere_cambio || vencido;
}

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
  ejng_id: number | null;
}

export default function MisDocumentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  // Presente solo cuando entra personal interno (no CLIENTE) a corregir
  // documentos en nombre de un cliente — ver corregir-formulario-asc y
  // documentacion/Funcionalidades/modo-solucion-rechazo-asc.md.
  const solicitudIdParam = searchParams.get("solicitudId");
  const modoStaff = Boolean(solicitudIdParam);
  const esCliente =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "CLIENTE";
  const esEjecutivo =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "EJECUTIVO";

  // Personal interno que entra sin solicitudId (ej. desde el menú, no desde
  // corregir-formulario-asc) no tiene cliente_id propio — antes esto
  // reventaba con "Usuario sin cliente asociado". Ahora se le pide elegir un
  // cliente y se le muestra la última solicitud de ese cliente, mismo
  // patrón que el selector de /solicitudes/nueva.
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOpcion | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const clienteSelectorRef = useRef<HTMLDivElement>(null);
  const debeElegirCliente = !authLoading && !esCliente && !modoStaff && !clienteSeleccionado;

  const [loading, setLoading] = useState(true);
  const [solicitud, setSolicitud] = useState<MisDocumentosResponse["solicitud"]>(null);
  const [documentos, setDocumentos] = useState<MiDocumento[]>([]);
  const [puedeCorregir, setPuedeCorregir] = useState(false);
  const [rechazadoPorAuxiliar, setRechazadoPorAuxiliar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<MiDocumento | null>(null);
  // Las fechas de emisión se acumulan en edición y solo se guardan al
  // presionar "Actualizar e informar a Cartonera". Los archivos, en cambio,
  // se suben de inmediato al seleccionarlos (ver handleSeleccionarArchivo) —
  // por eso `huboSubidaSesion` marca que hubo al menos una subida desde la
  // última vez que se informó a Cartonera, para no desactivar el botón.
  const [pendingFechas, setPendingFechas] = useState<Record<number, string>>({});
  const { startLoading, showSuccess, showError } = useUpload();
  const [huboSubidaSesion, setHuboSubidaSesion] = useState(false);
  const huboCambios = Object.keys(pendingFechas).length > 0 || huboSubidaSesion;
  const [enviando, setEnviando] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const documentosFiltrados = busqueda.trim()
    ? documentos.filter((doc) => {
        const termino = busqueda.trim().toLowerCase();
        return (
          doc.tdo_nombre?.toLowerCase().includes(termino) || doc.sa_nombre_original?.toLowerCase().includes(termino)
        );
      })
    : documentos;

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await misDocumentosService.getMisDocumentos(
        solicitudIdParam ? Number(solicitudIdParam) : undefined,
        clienteSeleccionado?.cli_id,
      );
      setSolicitud(data.solicitud);
      setDocumentos(data.documentos);
      setPuedeCorregir(data.puedeCorregir);
      setRechazadoPorAuxiliar(data.rechazadoPorAuxiliar);
    } catch (error) {
      console.error("[MisDocumentosPage] Error cargando:", error);
      setErrorMessage("No se pudieron cargar tus documentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    // modoStaff (solicitudId en la URL) y esCliente (autoservicio) cargan de
    // inmediato; personal interno sin esos dos casos espera a que elija un
    // cliente en el selector.
    if (!modoStaff && !esCliente && !clienteSeleccionado) {
      setLoading(false);
      return;
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, esCliente, modoStaff, clienteSeleccionado]);

  // Catálogo de clientes para el selector — mismo cache/patrón que
  // listado-de-solicitudes y solicitudes/nueva.
  useEffect(() => {
    if (authLoading || esCliente || modoStaff) return;
    cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll())
      .then((data: any) => {
        const mapeados = Array.isArray(data)
          ? data.map((item: any) => ({
              cli_id: Number(item.cli_id ?? 0),
              cli_razon_social: String(item.cli_razon_social ?? ""),
              ejng_id: item.ejng_id != null ? Number(item.ejng_id) : null,
            }))
          : [];
        setClientes(mapeados.filter((c: ClienteOpcion) => c.cli_id > 0));
      })
      .catch((error) => {
        console.error("[MisDocumentosPage] Error cargando clientes", error);
      });
  }, [authLoading, esCliente, modoStaff]);

  useEffect(() => {
    if (!mostrarListaClientes) return;
    function handleClickOutside(event: MouseEvent) {
      if (clienteSelectorRef.current && !clienteSelectorRef.current.contains(event.target as Node)) {
        setMostrarListaClientes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarListaClientes]);

  const clientesFiltrados = clientes
    .filter((c) => (esEjecutivo && user?.ejng_id ? c.ejng_id === user.ejng_id : true))
    .filter((c) => (busquedaCliente ? c.cli_razon_social.toLowerCase().includes(busquedaCliente.toLowerCase()) : true));

  const handleSeleccionarArchivo = async (doc: MiDocumento, file: File) => {
    if (!solicitud) return;
    startLoading("Subiendo archivo...");
    try {
      await formularioRespuestasService.guardarArchivoRespuesta(
        solicitud.sol_id,
        doc.fp_id,
        file,
        pendingFechas[doc.sa_id] ?? (doc.sd_fecha_emision ? doc.sd_fecha_emision.split("T")[0] : undefined),
      );
      setHuboSubidaSesion(true);
      showSuccess({
        title: "Archivo cargado",
        message: `"${doc.tdo_nombre || doc.sa_nombre_original}" quedó listo para continuar.`,
      });
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error subiendo archivo:", error);
      setErrorMessage(`No se pudo subir el nuevo archivo de "${doc.tdo_nombre || doc.sa_nombre_original}".`);
      showError({
        title: "No se pudo subir el archivo",
        message: `No se pudo subir el nuevo archivo de "${doc.tdo_nombre || doc.sa_nombre_original}".`,
      });
    }
  };

  // Guarda de inmediato, igual que la subida de archivo — antes esta fecha
  // solo se persistía dentro de handleActualizarEInformar, que únicamente
  // corre en el flujo de "rechazado por auxiliar, en corrección". Fuera de
  // ese flujo (el caso normal de esta página) el campo parecía editable
  // pero la fecha se perdía en silencio al recargar. pendingFechas queda
  // como respaldo/retry: si este PATCH llega a fallar, el botón "Actualizar
  // e informar a Cartonera" (cuando aplica) reintenta guardarla.
  const handleCambiarFecha = async (doc: MiDocumento, fecha: string) => {
    if (!solicitud) return;
    setPendingFechas((prev) => ({ ...prev, [doc.sa_id]: fecha }));
    try {
      await formularioRespuestasService.actualizarFechaDocumento(solicitud.sol_id, doc.fp_id, fecha);
      setPendingFechas((prev) => {
        const { [doc.sa_id]: _omit, ...resto } = prev;
        return resto;
      });
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error guardando fecha de emisión:", error);
      setErrorMessage("No se pudo guardar la fecha de emisión.");
    }
  };

  const handleActualizarEInformar = async () => {
    if (!solicitud) return;
    try {
      setEnviando(true);

      for (const doc of documentos) {
        const fecha = pendingFechas[doc.sa_id];
        if (fecha) {
          await formularioRespuestasService.actualizarFechaDocumento(solicitud.sol_id, doc.fp_id, fecha);
        }
      }

      await misDocumentosService.enviarCorreccion(solicitud.sol_id);

      setPendingFechas({});
      setHuboSubidaSesion(false);
      setShowSuccessModal(true);
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error actualizando e informando:", error);
      setErrorMessage("No se pudo actualizar e informar a Cartonera.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async () => {
    if (!solicitud || !confirmEliminar) return;
    try {
      await formularioRespuestasService.eliminarArchivoRespuesta(solicitud.sol_id, confirmEliminar.sa_id);
      setConfirmEliminar(null);
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error eliminando:", error);
      setErrorMessage("No se pudo eliminar el documento.");
    }
  };

  if (debeElegirCliente) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <PageHeaderCard
            icon={FileText}
            eyebrow="Documentos"
            title="Documentos de la Solicitud"
            subtitle="Elige el cliente cuyos documentos quieres ver."
            onBack={() => router.push("/solicitudes/cliente")}
          />

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 flex flex-col items-center">
            <div className="w-full max-w-md" ref={clienteSelectorRef}>
              <Search className="h-10 w-10 text-brand-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">¿De qué cliente son los documentos?</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busquedaCliente}
                  onFocus={() => setMostrarListaClientes(true)}
                  onChange={(event) => {
                    setBusquedaCliente(event.target.value);
                    setMostrarListaClientes(true);
                  }}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {mostrarListaClientes && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <div
                          key={cliente.cli_id}
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setBusquedaCliente(cliente.cli_razon_social);
                            setMostrarListaClientes(false);
                          }}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                          {cliente.cli_razon_social}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Documentos"
          title={modoStaff || clienteSeleccionado ? "Documentos de la Solicitud" : "Mis Documentos"}
          subtitle={
            solicitud
              ? modoStaff
                ? `Solicitud ${solicitud.sol_numero} — ${solicitud.cliente_nombre ?? "cliente"}. Corrige en su nombre los documentos marcados.`
                : clienteSeleccionado
                  ? `Solicitud ${solicitud.sol_numero} — ${clienteSeleccionado.cli_razon_social}.`
                  : `Documentos de la solicitud ${solicitud.sol_numero}.`
              : "Consulta el estado de tus documentos y corrígelos si hace falta."
          }
          onBack={() => {
            if (modoStaff) {
              router.back();
            } else if (clienteSeleccionado) {
              // Volvió al selector en vez de navegar afuera — este
              // usuario no tiene "/solicitudes/cliente" propio.
              setClienteSeleccionado(null);
              setBusquedaCliente("");
            } else {
              router.push("/solicitudes/cliente");
            }
          }}
          actions={
            <button
              onClick={cargar}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          }
        />

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {!puedeCorregir && solicitud && !loading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {modoStaff
              ? "Esta solicitud no está en modo de corrección por el auxiliar (etapa/resultado distinto al esperado). Aquí solo puedes consultarla."
              : "Esta solicitud ya no admite cambios de documentos (está en revisión o ya fue resuelta). Aquí solo puedes consultarlos."}
          </div>
        )}

        {rechazadoPorAuxiliar && puedeCorregir && !loading && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {modoStaff ? (
              <>
                Rechazaste esta solicitud con modo de solución "Auxiliar Actualiza". Corrige los documentos marcados
                como <strong>&quot;Requiere cambio&quot;</strong> (o los que aparezcan vencidos) subiendo el archivo
                correcto en nombre del cliente. Los demás documentos solo se pueden consultar.
              </>
            ) : (
              <>
                El auxiliar de servicio al cliente rechazó tu solicitud porque algunos documentos tienen la fecha de
                emisión incorrecta. Corrige los documentos marcados como <strong>&quot;Requiere cambio&quot;</strong> (o
                los que aparezcan vencidos). Los demás documentos solo se pueden consultar en este momento.
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cargando tus documentos...
            </div>
            <div className="divide-y divide-gray-100">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                  <div className="h-4 w-4 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-gray-200" />
                    <div className="h-2 w-1/4 rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ) : !solicitud ? (
          <EmptyStateCard
            icon={FileText}
            title={
              clienteSeleccionado
                ? `${clienteSeleccionado.cli_razon_social} aún no tiene ninguna solicitud con documentos.`
                : "Aún no tienes ninguna solicitud con documentos."
            }
          />
        ) : documentos.length === 0 ? (
          <EmptyStateCard icon={FileText} title="No hay documentos cargados en esta solicitud." />
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBusqueda(busquedaInput);
              }}
              className="mb-3 flex gap-2">
              <input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Buscar documento por nombre..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Buscar
              </button>
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaInput("");
                    setBusqueda("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Limpiar
                </button>
              )}
            </form>

            {documentosFiltrados.length === 0 ? (
              <EmptyStateCard
                icon={Search}
                title={
                  busqueda
                    ? `Ningún documento coincide con "${busqueda}".`
                    : "No hay documentos cargados en esta solicitud."
                }
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <Th>Documento</Th>
                        <Th>Fecha Emisión Doc</Th>
                        <Th>Estado</Th>
                        <Th>Fecha Vencimiento</Th>
                        <Th align="center" sticky>
                          Acciones
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documentosFiltrados.map((doc) => {
                        const estado = getEstadoVigencia(doc);
                        const esDocumentoGeneradoOFirmado =
                          Boolean(doc.tdo_tiene_plantilla) || /firmad/i.test(doc.tdo_nombre || "");
                        const editable =
                          !esDocumentoGeneradoOFirmado &&
                          esDocumentoEditable(doc, puedeCorregir, rechazadoPorAuxiliar, estado.vencido);
                        const archivoUrl = getArchivoPreviewUrl(
                          {
                            sa_id: doc.sa_id,
                            sa_ruta_almacenamiento: doc.sa_ruta_almacenamiento,
                            sa_nombre_guardado: doc.sa_nombre_guardado,
                          },
                          solicitud.sol_id,
                        );

                        return (
                          <Tr key={doc.sa_id} className="align-top">
                            <Td className="min-w-[220px]">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="font-medium text-gray-900 break-words">
                                  {doc.tdo_nombre || doc.sa_nombre_original}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              {requiereFecha(doc) ? (
                                <input
                                  type="date"
                                  value={
                                    pendingFechas[doc.sa_id] ??
                                    (doc.sd_fecha_emision ? doc.sd_fecha_emision.split("T")[0] : "")
                                  }
                                  min="1900-01-01"
                                  max={new Date().toISOString().split("T")[0]}
                                  disabled={!editable}
                                  onChange={(e) => e.target.value && handleCambiarFecha(doc, e.target.value)}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </Td>

                            <Td>
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}>
                                  {estado.estado}
                                </span>
                                {rechazadoPorAuxiliar && doc.sd_requiere_cambio && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800">
                                    Requiere cambio
                                  </span>
                                )}
                              </div>
                            </Td>

                            <Td className="text-xs whitespace-nowrap">{estado.detalle}</Td>

                            <Td sticky>
                              <div className="flex items-center justify-center gap-1.5">
                                {archivoUrl && (
                                  <a
                                    href={archivoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Ver ${doc.sa_nombre_original}`}
                                    aria-label={`Ver ${doc.sa_nombre_original}`}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1">
                                    <PdfIcon className="h-5 w-5" />
                                  </a>
                                )}
                                {editable ? (
                                  <>
                                    <label
                                      title="Reemplazar documento"
                                      aria-label="Reemplazar documento"
                                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-1">
                                      <Upload className="h-4 w-4" aria-hidden="true" />
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf,image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleSeleccionarArchivo(doc, file);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      title="Eliminar documento"
                                      aria-label="Eliminar documento"
                                      onClick={() => setConfirmEliminar(doc)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1">
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  </>
                                ) : (
                                  rechazadoPorAuxiliar && <span className="text-xs text-gray-400">Solo lectura</span>
                                )}
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {rechazadoPorAuxiliar && puedeCorregir && !loading && documentos.length > 0 && (
          <div className="sticky bottom-4 mt-6 flex justify-end rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <button
              onClick={handleActualizarEInformar}
              disabled={!huboCambios || enviando}
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300">
              {enviando
                ? "Actualizando..."
                : modoStaff
                  ? "Actualizar y devolver a revisión"
                  : "Actualizar e informar a Cartonera"}
            </button>
          </div>
        )}
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Enviado!"
        message={
          modoStaff
            ? "La corrección fue guardada. La solicitud vuelve a la bandeja de Auxiliar Servicio Cliente."
            : "Tu corrección fue enviada. Cartonera revisará los documentos actualizados."
        }
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => setShowSuccessModal(false)}
      />

      <ConfirmModal
        isOpen={!!confirmEliminar}
        title="Eliminar documento"
        message={`¿Deseas eliminar "${confirmEliminar?.tdo_nombre || confirmEliminar?.sa_nombre_original}"? No podrás recuperarlo.`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
