// src/app/solicitudes/nueva/page.tsx
"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { useUltimaSolicitud } from "@/hooks/useUltimaSolicitud";
import SolicitudFormContent from "./SolicitudFormContent";
import { AlertCircle, Search } from "lucide-react";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
  ejng_id: number | null;
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useContext(AuthContext);

  const esCliente =
    String(user?.rol?.nombre || "").toUpperCase().trim() === "CLIENTE";
  const esEjecutivo =
    String(user?.rol?.nombre || "").toUpperCase().trim() === "EJECUTIVO";

  // Selección de cliente para un usuario interno (Ejecutivo, Admin, etc.)
  // que va a diligenciar la solicitud en nombre de un cliente — un cliente
  // logueado nunca pasa por acá, siempre usa su propio user.cliente_id.
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteOpcion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading || esCliente) return;
    cachedRequest("listado-solicitudes-clientes", () =>
      clientesService.getAll(),
    )
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
        console.error("[NuevaSolicitudPage] Error cargando clientes", error);
      });
  }, [authLoading, esCliente]);

  // Cierra el desplegable al hacer clic afuera (mismo patrón que el
  // autocomplete de listado-de-solicitudes).
  useEffect(() => {
    if (!mostrarLista) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setMostrarLista(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarLista]);

  const clientesFiltrados = useMemo(() => {
    // Un ejecutivo solo puede crear solicitudes para sus propios clientes
    // — mismo criterio ya aplicado en listado-de-solicitudes.
    const porEjecutivo =
      esEjecutivo && user?.ejng_id
        ? clientes.filter((c) => c.ejng_id === user.ejng_id)
        : clientes;
    if (!busqueda) return porEjecutivo;
    return porEjecutivo.filter((c) =>
      c.cli_razon_social.toLowerCase().includes(busqueda.toLowerCase()),
    );
  }, [clientes, busqueda, esEjecutivo, user?.ejng_id]);

  const clienteId = esCliente ? user?.cliente_id : clienteSeleccionado?.cli_id;

  const {
    ultimaSolicitud,
    loading: solicitudLoading,
    tieneBorrador,
    puedeCrearNueva,
  } = useUltimaSolicitud({
    clienteId,
    enabled: !authLoading && !!clienteId,
  });

  // Si hay una solicitud BORRADOR, redirige a editarla (Caso 2)
  useEffect(() => {
    if (!solicitudLoading && tieneBorrador && ultimaSolicitud?.sol_id) {
      console.log(`[📝 NUEVA SOLICITUD] Redirigiendo a BORRADOR existente: ${ultimaSolicitud.sol_id}`);
      router.replace(`/solicitudes/${ultimaSolicitud.sol_id}/editar`);
    }
  }, [solicitudLoading, tieneBorrador, ultimaSolicitud, router]);

  if (authLoading) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Verificando solicitudes...</p>
        </div>
      </div>
    );
  }

  // Usuario interno: mientras no elija un cliente, no hay solicitud que
  // diligenciar todavía.
  if (!esCliente && !clienteSeleccionado) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-md" ref={contenedorRef}>
            <Search className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h2 className="text-base font-bold text-gray-900 mb-2 text-center">
              ¿Para qué cliente es esta solicitud?
            </h2>
            <p className="text-xs text-gray-600 mb-4 text-center">
              Selecciona el cliente en cuyo nombre vas a diligenciar la
              solicitud.
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={busqueda}
                onFocus={() => setMostrarLista(true)}
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setMostrarLista(true);
                }}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mostrarLista && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      Sin resultados
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.cli_id}
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusqueda(cliente.cli_razon_social);
                          setMostrarLista(false);
                        }}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
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
    );
  }

  if (solicitudLoading) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Verificando solicitudes...</p>
        </div>
      </div>
    );
  }

  // Si no puede crear nueva (tiene PENDIENTE/REVISIÓN activa)
  if (!puedeCrearNueva) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-base font-bold text-gray-900 mb-2">Solicitud en Proceso</h2>
            <p className="text-xs text-gray-600 mb-4">
              {esCliente
                ? "Actualmente tienes una solicitud activa. Complétala antes de crear una nueva."
                : `${clienteSeleccionado?.cli_razon_social} ya tiene una solicitud activa. Debe completarse antes de crear una nueva.`}
            </p>
            {esCliente ? (
              <button
                onClick={() => router.push("/solicitudes/cliente")}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Ver mis solicitudes
              </button>
            ) : (
              <button
                onClick={() => {
                  setClienteSeleccionado(null);
                  setBusqueda("");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Elegir otro cliente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Crear nueva solicitud (Caso 1 o Caso 5)
  return <SolicitudFormContent clienteId={clienteSeleccionado?.cli_id} />;
}
