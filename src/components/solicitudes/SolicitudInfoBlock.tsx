"use client";

import { useRouter } from "next/navigation";
import { ESTADOS } from "@/lib/workflow-labels";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import { SolicitudInfoCard, construirSlaGlobal } from "./SolicitudInfoCard";
import { AmpliacionCupoResumen } from "./AmpliacionCupoResumen";

export interface SolicitudInfoBlockSolicitud {
  sol_id: number;
  sol_numero?: string;
  numero_solicitud?: string;
  cliente_nombre: string;
  cliente_nit?: string | null;
  sol_ses_id?: number;
  estado_id?: number;
  sol_fecha_envio?: string | null;
  sol_fecha_est_gest_cc2?: string | null;
  sol_fecha_gest_cc2?: string | null;
  sol_cupo_solicitado?: number | string | null;
  sol_cupo_actual_referencia?: number | string | null;
  sol_justificacion_ampliacion?: string | null;
  sol_consumo_mensual_proyectado?: number | string | null;
  sol_toneladas_proyectadas?: number | string | null;
}

interface SolicitudInfoBlockProps {
  solicitud: SolicitudInfoBlockSolicitud;
  fechaEstimada?: string | null;
  slaGlobal?: import("./SolicitudInfoCard").SolicitudInfoCardSla | null;
  onShowSla?: () => void;
  containerClassName?: string;
}

/**
 * Bloque "Información de la Solicitud" compartido por todas las páginas de
 * gestión y detalle. Centraliza SolicitudInfoCard, el resumen de ampliación
 * de cupo, estado y SLA — un cambio visual se hace en un solo archivo.
 */
export function SolicitudInfoBlock({
  solicitud,
  fechaEstimada,
  slaGlobal: slaGlobalProp,
  onShowSla,
  containerClassName = "px-7 py-4 border-b border-[#eef1f6]",
}: SolicitudInfoBlockProps) {
  const router = useRouter();
  const {
    loading: loadingCupo,
    solicitaCredito,
    montoSolicitadoTexto,
    formaPagoSolicitada,
    tipoSolicitud,
  } = useSolicitudCupoSolicitado(solicitud.sol_id);

  const estadoId = solicitud.sol_ses_id ?? solicitud.estado_id ?? 1;
  const estadoTokens = ESTADO_TOKENS[estadoId] || ESTADO_TOKENS[1];
  const slaGlobal = slaGlobalProp ?? construirSlaGlobal(
    solicitud.sol_fecha_envio,
    solicitud.sol_fecha_est_gest_cc2,
    solicitud.sol_fecha_gest_cc2,
  );

  return (
    <div className={containerClassName}>
      <SolicitudInfoCard
        tipoSolicitud={
          solicitud.sol_cupo_solicitado
            ? "Ampliación de Cupo"
            : tipoSolicitud || "Cliente Nuevo"
        }
        loadingTipoSolicitud={loadingCupo}
        estadoLabel={ESTADOS[estadoId] || "Desconocido"}
        estadoColor={estadoTokens.color}
        estadoBackground={estadoTokens.bg}
        numeroSolicitud={
          solicitud.sol_numero || solicitud.numero_solicitud
        }
        fechaEnvio={solicitud.sol_fecha_envio}
        fechaEstimada={fechaEstimada}
        slaGlobal={slaGlobal}
        onShowSla={onShowSla}
        onOpenFormulario={() =>
          router.push(`/solicitudes/${solicitud.sol_id}`)
        }
        clienteNombre={solicitud.cliente_nombre}
        clienteNit={solicitud.cliente_nit}
        solicitaCredito={solicitaCredito}
        montoSolicitado={montoSolicitadoTexto}
        formaPagoSolicitada={formaPagoSolicitada}
      />

      {solicitud.sol_cupo_solicitado && (
        <div className="mt-[22px]">
          <AmpliacionCupoResumen
            cupoActualReferencia={solicitud.sol_cupo_actual_referencia}
            cupoSolicitado={solicitud.sol_cupo_solicitado}
            justificacion={solicitud.sol_justificacion_ampliacion}
            consumoMensualProyectado={
              solicitud.sol_consumo_mensual_proyectado
            }
            toneladasProyectadas={solicitud.sol_toneladas_proyectadas}
          />
        </div>
      )}
    </div>
  );
}
