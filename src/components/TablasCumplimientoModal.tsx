"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { solicitudesService, type TablaPersonaResuelta } from "@/services/solicitudes.service";
import { TablaPersonaConEvidencia } from "@/components/TablaPersonaConEvidencia";
import { ModalPortal } from "@/components/modals";

interface TablasCumplimientoModalProps {
  solicitudId: number;
  onClose: () => void;
}

/**
 * Vista de solo lectura de las tablas que llena el Oficial de Cumplimiento
 * (representante legal, suplentes, accionistas) con la evidencia adjunta
 * por fila — mismos datos que gestion-oficial-de-cumplimiento, pero
 * accesibles desde el detalle de la solicitud sin duplicar esa página.
 */
export function TablasCumplimientoModal({ solicitudId, onClose }: TablasCumplimientoModalProps) {
  const [tablas, setTablas] = useState<{
    representanteLegal: TablaPersonaResuelta | null;
    representantesSuplentes: TablaPersonaResuelta | null;
    accionistas: TablaPersonaResuelta | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    solicitudesService
      .getTablasCumplimiento(solicitudId)
      .then((data) => {
        if (!cancelled) setTablas(data);
      })
      .catch((err) => {
        console.error("Error cargando tablas de cumplimiento:", err);
        if (!cancelled) setError("No se pudieron cargar las tablas de cumplimiento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[22px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
          <div className="bg-brand-gradient rounded-t-[22px] overflow-hidden px-7 py-[22px] flex items-center gap-4 flex-shrink-0">
            <div className="w-[42px] h-[42px] rounded-xl bg-white/16 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0 truncate">
                Tablas de Cumplimiento
              </h2>
              <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                Representante legal, suplentes y accionistas con su evidencia
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/14 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors">
              <X size={16} strokeWidth={2.3} />
            </button>
          </div>

          <div className="p-7 overflow-y-auto flex-1 space-y-6">
            {error ? (
              <p className="text-red-600 text-center py-8">{error}</p>
            ) : loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-24 bg-gray-100 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-24 bg-gray-100 rounded-lg" />
              </div>
            ) : (
              <>
                <TablaPersonaConEvidencia
                  solicitudId={solicitudId}
                  fpId={tablas?.representanteLegal?.fp_id ?? null}
                  titulo="Representante legal principal"
                  columnas={tablas?.representanteLegal?.columnas ?? []}
                  filas={tablas?.representanteLegal?.filas ?? []}
                  readOnly
                />

                <TablaPersonaConEvidencia
                  solicitudId={solicitudId}
                  fpId={tablas?.representantesSuplentes?.fp_id ?? null}
                  titulo="Representantes suplentes"
                  columnas={tablas?.representantesSuplentes?.columnas ?? []}
                  filas={tablas?.representantesSuplentes?.filas ?? []}
                  readOnly
                />

                <TablaPersonaConEvidencia
                  solicitudId={solicitudId}
                  fpId={tablas?.accionistas?.fp_id ?? null}
                  titulo="Composición accionaria (relación de accionistas)"
                  columnas={tablas?.accionistas?.columnas ?? []}
                  filas={tablas?.accionistas?.filas ?? []}
                  readOnly
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
