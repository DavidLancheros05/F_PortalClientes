"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  RotateCcw,
  Edit,
  Plus,
  Calendar,
  User,
  FileText,
  GitBranch,
  Layers,
  Lock,
} from "lucide-react";
import { versionesService } from "@/services/versiones.service";
import { ConfirmModal, ErrorModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";

const CARD_CLASS =
  "bg-white rounded-[22px] border shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]";
const BTN_SECUNDARIO =
  "flex items-center gap-2 px-4 py-2 border border-[#e9ecf2] text-slate-700 bg-white rounded-[11px] font-bold text-sm hover:bg-[#fafbfd] transition-colors";
const BTN_PRINCIPAL =
  "flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-[11px] font-bold text-sm shadow-[0_6px_16px_rgba(0,61,153,0.22)] transition-all";

export default function VersionesPage() {
  const router = useRouter();
  const params = useParams();
  const formularioId = params.formularioId as string;
  const rutaNuevaVersion = `/parametrizacion/formularios/${formularioId}/nueva-version`;

  const [formulario, setFormulario] = useState<any>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activandoVersion, setActivandoVersion] = useState<number | null>(null);
  const [versionAConfirmar, setVersionAConfirmar] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activarVersion = async (versionNumero: number) => {
    setActivandoVersion(versionNumero);
    try {
      const data = await versionesService.activarVersion(formularioId as any as number, versionNumero);
      const result = await versionesService.obtenerVersiones(formularioId as any as number);
      setFormulario(result.formulario);
      setVersiones(result.versiones);
      setMensajeExito(data.message);
    } catch (err) {
      console.error("Error activando versión:", err);
      setError(err instanceof Error ? err.message : "Error al activar la versión");
    } finally {
      setActivandoVersion(null);
    }
  };

  // Distingue "no se pudo cargar" (red/servidor caído) de "no existe": sin
  // esto, cualquier fallo se mostraba como "Formulario no encontrado".
  const [cargaFallida, setCargaFallida] = useState(false);
  const [intentoCarga, setIntentoCarga] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      setLoading(true);
      setCargaFallida(false);
      try {
        const data = await versionesService.obtenerVersiones(formularioId as any as number);
        if (cancelled) return;
        setFormulario(data.formulario);
        setVersiones(data.versiones);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Error cargando versiones:", err);
        if (err?.response?.status !== 404) setCargaFallida(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    cargar();

    return () => {
      cancelled = true;
    };
  }, [formularioId, intentoCarga]);

  const volverAlEditor = () => router.push("/parametrizacion/formulario-editor");

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={GitBranch}
          eyebrow="Parametrización · Formularios"
          title="Gestión de versiones del formulario"
          subtitle={
            loading
              ? "Cargando..."
              : formulario?.frs_nombre || formulario?.formulario_nombre || undefined
          }
          onBack={volverAlEditor}
          actions={
            formulario && (
              <button
                onClick={() => router.push(rutaNuevaVersion)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff] flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nueva versión
              </button>
            )
          }
        >
          {formulario && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-emerald-700 font-semibold">
                <CheckCircle className="h-4 w-4" />
                Versión activa: v{formulario?.frs_version || formulario?.formulario_version}
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                <GitBranch className="h-4 w-4" />
                {versiones.length} {versiones.length === 1 ? "versión" : "versiones"} en total
              </span>
            </div>
          )}
        </PageHeaderCard>

        {loading ? (
          <div className={`${CARD_CLASS} border-[#e9ecf2] p-6 animate-pulse`}>
            <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-80 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-64" />
          </div>
        ) : cargaFallida ? (
          <EmptyStateCard
            icon={AlertTriangle}
            title="No se pudieron cargar las versiones"
            subtitle="El servidor no respondió. Intenta de nuevo en unos segundos."
            action={
              <button onClick={() => setIntentoCarga((n) => n + 1)} className={`${BTN_PRINCIPAL} mx-auto`}>
                <RotateCcw className="h-4 w-4" />
                Reintentar
              </button>
            }
          />
        ) : !formulario ? (
          <EmptyStateCard
            icon={FileText}
            title="Formulario no encontrado"
            action={
              <button onClick={volverAlEditor} className={`${BTN_PRINCIPAL} mx-auto`}>
                Volver al listado
              </button>
            }
          />
        ) : versiones.length === 0 ? (
          <EmptyStateCard
            icon={GitBranch}
            title="No hay versiones disponibles"
            subtitle="Comienza creando la primera versión de este formulario"
            action={
              <button onClick={() => router.push(rutaNuevaVersion)} className={`${BTN_PRINCIPAL} mx-auto`}>
                <Plus className="h-4 w-4" />
                Crear primera versión
              </button>
            }
          />
        ) : (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-brand-500/20 hidden md:block" />

            <div className="space-y-3">
              {versiones.map((version, index) => {
                const numero = version.fv_numero ?? version.version_numero;
                const esVersionActiva = numero === formulario.formulario_version;
                const isLatest = index === 0;

                return (
                  <div key={version.fv_id || version.version_id} className="relative">
                    <div className="hidden md:block absolute left-8 top-1/2 -translate-y-1/2 -translate-x-1/2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          esVersionActiva ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-brand-600 ring-4 ring-brand-500/15"
                        }`}
                      />
                    </div>

                    <div
                      className={`md:ml-16 ${CARD_CLASS} ${
                        esVersionActiva ? "border-emerald-200" : "border-[#e9ecf2]"
                      }`}
                    >
                      <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                  esVersionActiva ? "bg-emerald-600" : "bg-brand-600"
                                }`}
                              >
                                <Layers className="h-4.5 w-4.5 text-white" />
                              </div>
                              <h3 className="text-lg font-extrabold text-slate-800">Versión {numero}</h3>
                            </div>

                            {esVersionActiva && (
                              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Versión activa
                              </span>
                            )}

                            {isLatest && !esVersionActiva && (
                              <span className="flex items-center gap-1.5 bg-brand-500/10 text-brand-600 px-3 py-1 rounded-full text-xs font-bold">
                                <GitBranch className="h-3.5 w-3.5" />
                                Última versión
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mb-2">
                            {version.version_descripcion || "Sin descripción proporcionada para esta versión"}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#94a3b8]">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              {version.total_preguntas} preguntas
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(version.created_at).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            {version.creador_nombre && (
                              <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {version.creador_nombre}
                              </span>
                            )}
                            {version.total_solicitudes > 0 && (
                              <span className="flex items-center gap-1.5 text-amber-700">
                                <Lock className="h-3.5 w-3.5" />
                                {version.total_solicitudes} solicitud
                                {version.total_solicitudes === 1 ? "" : "es"} asociada
                                {version.total_solicitudes === 1 ? "" : "s"} — no editable
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/parametrizacion/formulario-editor?frs_id=${formularioId}&version=${numero}&readonly=true`,
                              )
                            }
                            className={BTN_SECUNDARIO}
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </button>

                          {version.total_solicitudes > 0 ? (
                            <button
                              type="button"
                              disabled
                              title="Esta versión ya tiene solicitudes asociadas — editar sus preguntas cambiaría en silencio lo que muestran los PDF ya generados. Creá una nueva versión para hacer cambios."
                              className="flex items-center gap-2 px-4 py-2 bg-[#fafbfd] text-[#94a3b8] rounded-[11px] border border-[#eef1f6] font-bold text-sm cursor-not-allowed"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                router.push(`/parametrizacion/formulario-editor?frs_id=${formularioId}&version=${numero}`)
                              }
                              className={BTN_PRINCIPAL}
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </button>
                          )}

                          {!esVersionActiva && (
                            <button
                              onClick={() => setVersionAConfirmar(numero)}
                              disabled={activandoVersion === numero}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-[11px] border border-emerald-200 font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {activandoVersion === numero ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-700" />
                                  Activando...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={versionAConfirmar !== null}
        title="Activar versión"
        message={`¿Activar versión ${versionAConfirmar}? Las nuevas solicitudes usarán esta versión.`}
        confirmText="Activar"
        isLoading={activandoVersion !== null}
        onConfirm={async () => {
          if (versionAConfirmar === null) return;
          await activarVersion(versionAConfirmar);
          setVersionAConfirmar(null);
        }}
        onCancel={() => setVersionAConfirmar(null)}
      />

      <SuccessModal
        isOpen={!!mensajeExito}
        title="Listo"
        message={mensajeExito ?? ""}
        onAction={() => setMensajeExito(null)}
      />

      <ErrorModal isOpen={!!error} message={error || ""} onAction={() => setError(null)} />
    </div>
  );
}
