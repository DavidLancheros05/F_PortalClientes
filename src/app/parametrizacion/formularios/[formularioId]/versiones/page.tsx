"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
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
  Clock,
} from "lucide-react";
import { versionesService } from "@/services/versiones.service";
import { LoadingModal } from "@/components/modals";

export default function VersionesPage() {
  const router = useRouter();
  const params = useParams();
  const formularioId = params.formularioId as string;

  const [formulario, setFormulario] = useState<any>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activandoVersion, setActivandoVersion] = useState<number | null>(null);

  const activarVersion = async (versionNumero: number) => {
    setActivandoVersion(versionNumero);
    try {
      const data = await versionesService.activarVersion(formularioId as any as number, versionNumero);
      const result = await versionesService.obtenerVersiones(formularioId as any as number);
      setFormulario(result.formulario);
      setVersiones(result.versiones);
      showNotification("success", data.message);
    } catch (error) {
      console.error("Error activando versión:", error);
      showNotification("error", error instanceof Error ? error.message : "Error al activar la versión");
    } finally {
      setActivandoVersion(null);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    alert(message);
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await versionesService.obtenerVersiones(formularioId as any as number);
        setFormulario(data.formulario);
        setVersiones(data.versiones);
      } catch (err) {
        console.error("Error cargando versiones:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [formularioId]);

  if (loading) {
    return <LoadingModal isOpen message="Cargando versiones..." />;
  }

  if (!formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Formulario no encontrado
          </h2>
          <button
            onClick={() => router.push("/parametrizacion/formulario-editor")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/parametrizacion/formulario-editor")}
              aria-label="Volver al editor"
              title="Volver al editor"
              className="group inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-300 mb-4"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </button>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-2xl md:text-3xl font-bold text-blue-800 mb-3 leading-tight">
                    Gestión de versiones del formulario
                  </p>
                  <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                      {formulario?.frm_nombre || formulario?.formulario_nombre}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Versión activa: v{formulario.formulario_version}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <GitBranch className="h-4 w-4" />
                      <span>{versiones.length} versiones totales</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    router.push(
                      `/parametrizacion/formularios/${formularioId}/nueva-version`,
                    )
                  }
                  className="group bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-semibold">Nueva Versión</span>
                </button>
              </div>
            </div>
          </div>

          {/* Timeline de versiones */}
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-blue-400 to-blue-300 hidden md:block"></div>

            <div className="space-y-4">
              {versiones.map((version, index) => {
                const esVersionActiva =
                  version.fv_numero || version.version_numero === formulario.formulario_version;
                const isLatest = index === 0;

                return (
                  <div key={version.fv_id || version.version_id} className="relative group">
                    <div className="hidden md:block absolute left-8 top-1/2 -translate-y-1/2 -translate-x-1/2">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          esVersionActiva
                            ? "bg-green-500 ring-4 ring-green-100"
                            : "bg-blue-500 ring-4 ring-blue-100"
                        }`}
                      ></div>
                    </div>

                    <div
                      className={`ml-0 md:ml-16 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border ${
                        esVersionActiva
                          ? "border-green-200 ring-2 ring-green-50"
                          : "border-gray-200 hover:border-blue-200"
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`p-2 rounded-xl ${
                                    esVersionActiva
                                      ? "bg-green-600"
                                      : "bg-blue-600"
                                  }`}
                                >
                                  <Layers className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                  Versión {version.fv_numero || version.version_numero}
                                </h3>
                              </div>

                              {esVersionActiva && (
                                <span className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                                  <CheckCircle className="h-4 w-4" />
                                  Versión Activa
                                </span>
                              )}

                              {isLatest && !esVersionActiva && (
                                <span className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                                  <GitBranch className="h-4 w-4" />
                                  Última versión
                                </span>
                              )}
                            </div>

                            <p className="text-gray-600 mb-3">
                              {version.version_descripcion ||
                                "Sin descripción proporcionada para esta versión"}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                <span>{version.total_preguntas} preguntas</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {new Date(
                                    version.created_at,
                                  ).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              {version.creador_nombre && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{version.creador_nombre}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/parametrizacion/formulario-editor?formulario_id=${formularioId}&version=${version.fv_numero || version.version_numero}&readonly=true`,
                                )
                              }
                              className="group flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                            >
                              <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              <span className="font-medium">Ver</span>
                            </button>

                            <button
                              onClick={() =>
                                router.push(
                                  `/parametrizacion/formulario-editor?formulario_id=${formularioId}&version=${version.fv_numero || version.version_numero}`,
                                )
                              }
                              className="group flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200"
                            >
                              <Edit className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                              <span className="font-medium">Editar</span>
                            </button>

                            {!esVersionActiva && (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `¿Activar versión ${version.fv_numero || version.version_numero}?\n\nLas nuevas solicitudes usarán esta versión.`,
                                    )
                                  ) {
                                    activarVersion(version.fv_numero || version.version_numero);
                                  }
                                }}
                                disabled={
                                  activandoVersion === version.fv_numero || version.version_numero
                                }
                                className="group flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all duration-200 border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activandoVersion === version.fv_numero || version.version_numero ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                                    <span>Activando...</span>
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                                    <span className="font-medium">Activar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {versiones.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <GitBranch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No hay versiones disponibles
                </h3>
                <p className="text-gray-500 mb-6">
                  Comienza creando la primera versión de este formulario
                </p>
                <button
                  onClick={() =>
                    router.push(
                      `/parametrizacion/formularios/${formularioId}/nueva-version`,
                    )
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span>Crear primera versión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
