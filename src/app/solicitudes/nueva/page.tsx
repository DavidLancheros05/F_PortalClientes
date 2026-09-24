// src/app/solicitudes/nueva/page.tsx
"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { useUltimaSolicitud } from "@/hooks/useUltimaSolicitud";
import { FileText, Search } from "lucide-react";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
import { FlujoSolicitud, type EstadoPaso } from "./components/FlujoSolicitud";
import { PanelFirmaDocumentos, type PanelFirmaDocumentosHandle } from "./components/PanelFirmaDocumentos";
import type { DocumentoDiferido } from "@/services/mis-documentos.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { LoadingModal } from "@/components/modals";
import { FilterField } from "@/components/filters/FilterField";

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
  cli_nro_identificacion: string;
  ejng_id: number | null;
}

interface EjecutivoOpcion {
  ejecutivo_id: number;
  ejecutivo_nombre: string;
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteIdQuery = Number(searchParams.get("clienteId"));
  const { user, loading: authLoading } = useContext(AuthContext);

  const esCliente =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "CLIENTE";
  const esEjecutivo =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "EJECUTIVO";

  // Selección de cliente para un usuario interno (Ejecutivo, Admin, etc.)
  // que va a diligenciar la solicitud en nombre de un cliente — un cliente
  // logueado nunca pasa por acá, siempre usa su propio user.cliente_id.
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOpcion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Filtro por Ejecutivo de Negocios, previo al de Cliente — un cliente
  // pertenece a un solo ejecutivo (Clientes.ejng_id), así que elegirlo
  // primero acota la lista de clientes a buscar. Mismo patrón ya usado en
  // listado-de-solicitudes/page.tsx.
  const [ejecutivos, setEjecutivos] = useState<EjecutivoOpcion[]>([]);
  const [ejecutivoId, setEjecutivoId] = useState("");
  const [ejecutivoBusqueda, setEjecutivoBusqueda] = useState("");
  const [mostrarEjecutivoLista, setMostrarEjecutivoLista] = useState(false);
  const ejecutivoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading || esCliente) return;
    // allSettled: si falla la carga de ejecutivos, la de clientes igual debe
    // llegar — sin ella no se puede preseleccionar el cliente de la URL.
    Promise.allSettled([
      cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll()),
      clientesService.getEjecutivosNegocio(),
    ])
      .then(([clientesResult, ejecutivosResult]) => {
        const clientesData: any = clientesResult.status === "fulfilled" ? clientesResult.value : [];
        const ejecutivosData: any = ejecutivosResult.status === "fulfilled" ? ejecutivosResult.value : [];
        if (clientesResult.status === "rejected") {
          console.error("[NuevaSolicitudPage] Error cargando clientes", clientesResult.reason);
        }
        if (ejecutivosResult.status === "rejected") {
          console.error("[NuevaSolicitudPage] Error cargando ejecutivos", ejecutivosResult.reason);
        }
        const mapeados = Array.isArray(clientesData)
          ? clientesData.map((item: any) => ({
              cli_id: Number(item.cli_id ?? 0),
              cli_razon_social: String(item.cli_razon_social ?? ""),
              cli_nro_identificacion: String(item.cli_nro_identificacion ?? ""),
              ejng_id: item.ejng_id != null ? Number(item.ejng_id) : null,
            }))
          : [];
        setClientes(mapeados.filter((c: ClienteOpcion) => c.cli_id > 0));

        const mapeadosEjecutivos = Array.isArray(ejecutivosData)
          ? ejecutivosData.map((item: any) => ({
              ejecutivo_id: Number(item.ejng_id ?? 0),
              ejecutivo_nombre: String(item.ejng_nombre ?? ""),
            }))
          : [];
        setEjecutivos(mapeadosEjecutivos.filter((e: EjecutivoOpcion) => e.ejecutivo_id > 0));
      });
  }, [authLoading, esCliente]);

  // Preselecciona el cliente cuando se llega con ?clienteId= (ej. desde
  // "Editar"/"Faltan documentos" en /solicitudes/cliente) — evita que el
  // personal interno tenga que rebuscar el mismo cliente que ya tenía
  // seleccionado en la pantalla de origen.
  useEffect(() => {
    if (esCliente || clienteSeleccionado || !clienteIdQuery || clientes.length === 0) return;
    const encontrado = clientes.find((c) => c.cli_id === clienteIdQuery);
    if (encontrado) setClienteSeleccionado(encontrado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, clienteIdQuery, esCliente]);

  // Un ejecutivo solo puede crear solicitudes para sus propios clientes —
  // el filtro de Ejecutivo se precarga con su propio ejng_id y queda
  // bloqueado (ver input deshabilitado más abajo), mismo criterio ya
  // aplicado en listado-de-solicitudes.
  useEffect(() => {
    if (!esEjecutivo || !user?.ejng_id) return;
    setEjecutivoId(String(user.ejng_id));
    setEjecutivoBusqueda(user.nombre || "");
  }, [esEjecutivo, user]);

  // Cierra los desplegables al hacer clic afuera (mismo patrón que el
  // autocomplete de listado-de-solicitudes).
  useEffect(() => {
    if (!mostrarLista) return;
    function handleClickOutside(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setMostrarLista(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarLista]);

  useEffect(() => {
    if (!mostrarEjecutivoLista) return;
    function handleClickOutside(event: MouseEvent) {
      if (ejecutivoContainerRef.current && !ejecutivoContainerRef.current.contains(event.target as Node)) {
        setMostrarEjecutivoLista(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarEjecutivoLista]);

  const ejecutivosFiltrados = useMemo(() => {
    if (!ejecutivoBusqueda) return ejecutivos;
    return ejecutivos.filter((e) => e.ejecutivo_nombre.toLowerCase().includes(ejecutivoBusqueda.toLowerCase()));
  }, [ejecutivos, ejecutivoBusqueda]);

  const clientesFiltrados = useMemo(() => {
    const porEjecutivo = ejecutivoId ? clientes.filter((c) => String(c.ejng_id) === ejecutivoId) : clientes;
    if (!busqueda) return porEjecutivo;
    const term = busqueda.toLowerCase();
    return porEjecutivo.filter(
      (c) => c.cli_razon_social.toLowerCase().includes(term) || c.cli_nro_identificacion.toLowerCase().includes(term),
    );
  }, [clientes, busqueda, ejecutivoId]);

  // La URL (?clienteId=) es la fuente de verdad para el usuario interno: al
  // volver del formulario o recargar, el flujo sigue con ese cliente sin
  // esperar a que cargue la lista (que solo aporta el nombre para mostrar).
  const clienteIdUrl = Number.isFinite(clienteIdQuery) && clienteIdQuery > 0 ? clienteIdQuery : undefined;
  const clienteId = esCliente ? user?.cliente_id : (clienteSeleccionado?.cli_id ?? clienteIdUrl);

  const seleccionarCliente = (cliente: ClienteOpcion | null) => {
    setClienteSeleccionado(cliente);
    router.replace(cliente ? `/solicitudes/nueva?clienteId=${cliente.cli_id}` : "/solicitudes/nueva");
  };

  // null = todavía no se sabe (PanelFirmaDocumentos no ha cargado, o no
  // aplica porque no hay solicitudActiva) — evita mostrar "completo" antes
  // de tiempo mientras se hace el fetch.
  const [documentosDiferidos, setDocumentosDiferidos] = useState<DocumentoDiferido[] | null>(null);
  const panelFirmaRef = useRef<PanelFirmaDocumentosHandle>(null);

  const {
    ultimaSolicitud,
    loading: solicitudLoading,
    puedeCrearNueva,
  } = useUltimaSolicitud({
    clienteId,
    enabled: !authLoading && !!clienteId,
  });

  if (authLoading) {
    return <LoadingModal isOpen message="Verificando sesión..." />;
  }

  // Usuario interno: mientras no elija un cliente, no hay solicitud que
  // diligenciar todavía.
  if (!esCliente && !clienteId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <PageHeaderCard
            icon={FileText}
            eyebrow="Nueva solicitud"
            title="¿Para qué cliente es esta solicitud?"
            subtitle="Selecciona el cliente en cuyo nombre vas a diligenciar la solicitud.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FilterField label="Ejecutivo de Negocios" className="relative" ref={ejecutivoContainerRef}>
                <input
                  type="text"
                  placeholder="Buscar ejecutivo..."
                  value={ejecutivoBusqueda}
                  onFocus={() => setMostrarEjecutivoLista(true)}
                  onChange={(event) => {
                    setEjecutivoBusqueda(event.target.value);
                    setMostrarEjecutivoLista(true);
                  }}
                  disabled={esEjecutivo}
                  title={esEjecutivo ? "Solo puedes crear solicitudes para tus propios clientes" : undefined}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                />
                {!esEjecutivo && mostrarEjecutivoLista && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEjecutivoId("");
                        setEjecutivoBusqueda("");
                        setMostrarEjecutivoLista(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200">
                      Todos los ejecutivos
                    </button>
                    {ejecutivosFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                    ) : (
                      ejecutivosFiltrados.map((ejecutivo) => (
                        <button
                          type="button"
                          key={ejecutivo.ejecutivo_id}
                          onClick={() => {
                            setEjecutivoId(String(ejecutivo.ejecutivo_id));
                            setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
                            setMostrarEjecutivoLista(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                          {ejecutivo.ejecutivo_nombre}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </FilterField>

              <FilterField label="Cliente" className="relative" ref={contenedorRef}>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busqueda}
                  onFocus={() => setMostrarLista(true)}
                  onChange={(event) => {
                    setBusqueda(event.target.value);
                    setMostrarLista(true);
                  }}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {mostrarLista && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <button
                          type="button"
                          key={cliente.cli_id}
                          onClick={() => {
                            seleccionarCliente(cliente);
                            setBusqueda(cliente.cli_razon_social);
                            setMostrarLista(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                          <div>{cliente.cli_razon_social}</div>
                          {cliente.cli_nro_identificacion && (
                            <div className="text-[11px] text-gray-500">NIT {cliente.cli_nro_identificacion}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </FilterField>
            </div>
          </PageHeaderCard>

          <EmptyStateCard icon={Search} title="Busca y selecciona el cliente para continuar." />
        </div>
      </div>
    );
  }

  if (solicitudLoading) {
    return <LoadingModal isOpen message="Verificando solicitudes..." />;
  }

  const solicitudActiva = !puedeCrearNueva ? ultimaSolicitud : null;
  const esBorrador = Number(solicitudActiva?.sol_ses_id) === 1;
  const returnToPuente = clienteId ? `/solicitudes/nueva?clienteId=${clienteId}` : "/solicitudes/nueva";
  const irAlFormulario = () => {
    if (solicitudActiva?.sol_id) {
      router.push(`/solicitudes/${solicitudActiva.sol_id}/editar?returnTo=${encodeURIComponent(returnToPuente)}`);
      return;
    }
    const query = !esCliente && clienteId ? `?clienteId=${clienteId}` : "";
    router.push(`/solicitudes/nueva/formulario${query}`);
  };

  // El formulario en sí solo llega a existir como solicitudActiva (estado
  // BORRADOR ya redirige a /editar más arriba, así que si estamos acá ya
  // fue enviado) — el 0% que se veía antes era un valor de relleno que
  // nunca se conectó a datos reales.
  //
  // "Firmar documentación" y "Enviar solicitud" ya no comparten un solo
  // botón dentro de PanelFirmaDocumentos: el paso 2 (Firmar) se completa en
  // cuanto todos los diferidos están subidos, y recién ahí el paso 3
  // (Enviar) queda "actual" y clickeable — al hacerlo se dispara
  // panelFirmaRef.enviar(), la misma llamada que antes vivía en el botón
  // "Enviar e informar a Cartonera" (ya eliminado, quedaba redundante con
  // este paso).
  const diferidosCargados = documentosDiferidos !== null;
  const diferidosPendientesPorSubir = diferidosCargados && documentosDiferidos!.some((d) => !d.yaSubido);
  const diferidosYaEnviados = diferidosCargados && documentosDiferidos!.length === 0;
  const diferidosListosParaEnviar =
    diferidosCargados && documentosDiferidos!.length > 0 && !diferidosPendientesPorSubir;

  const estados: [EstadoPaso, EstadoPaso, EstadoPaso] = !solicitudActiva
    ? ["actual", "pendiente", "pendiente"]
    : esBorrador
      ? ["actual", "pendiente", "pendiente"]
      : [
          "completo",
          !diferidosCargados ? "actual" : diferidosPendientesPorSubir ? "actual" : "completo",
          !diferidosCargados
            ? "pendiente"
            : diferidosYaEnviados
              ? "completo"
              : diferidosListosParaEnviar
                ? "actual"
                : "pendiente",
        ];

  // Página principal del proceso: el formulario vive en la ruta hija
  // /solicitudes/nueva/formulario.
  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitud"
          title="Completa tu solicitud paso a paso"
          subtitle="Diligencia la información, revisa la documentación y envía la solicitud."
          onBack={!esCliente ? () => seleccionarCliente(null) : undefined}
          actions={
            !esCliente && clienteSeleccionado ? (
              <span className="whitespace-nowrap rounded-full bg-white/14 px-3 py-1.5 text-xs font-semibold text-white">
                Cliente: {clienteSeleccionado.cli_razon_social}
              </span>
            ) : undefined
          }
        />

        <FlujoSolicitud
          estados={estados}
          formularioPorcentaje={solicitudActiva && !esBorrador ? 100 : 0}
          documentosProgreso={
            documentosDiferidos && documentosDiferidos.length > 0
              ? {
                  listos: documentosDiferidos.filter((d) => d.yaSubido).length,
                  total: documentosDiferidos.length,
                }
              : null
          }
          onStepClick={(step: number) => {
            if (step === 0) irAlFormulario();
            if (step === 1) {
              document.getElementById("panel-firma-documentos")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
            if (step === 2 && diferidosListosParaEnviar) panelFirmaRef.current?.enviar();
          }}
        />

        {solicitudActiva && !esBorrador && (
          <div id="panel-firma-documentos" className="scroll-mt-5">
            <PanelFirmaDocumentos
              ref={panelFirmaRef}
              solicitudId={solicitudActiva.sol_id}
              onCargado={setDocumentosDiferidos}
              onEnviado={() => {
                const redirectUrl = esCliente ? "/solicitudes/cliente" : "/solicitudes/listado-de-solicitudes";
                router.push(redirectUrl);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
