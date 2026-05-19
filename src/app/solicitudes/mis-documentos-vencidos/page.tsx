"use client";
import { solicitudesService } from "@/services/solicitudes.service";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DocumentoVencidoRow {
  sa_id: number;
  solicitud_id: number;
  sol_numero_solicitud: string;
  documento_nombre: string | null;
  nombre_original: string;
  ruta_almacenamiento: string;
  fecha_carga: string;
  fecha_vencimiento: string | null;
  dias_vencido: number | null;
  cliente_nombre: string | null;
  centro_operacion_nombre: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO");
}

export default function MisDocumentosVencidosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DocumentoVencidoRow[]>([]);

  const abrirArchivo = (saId: number) => {
    const token = localStorage.getItem("token");
    const url = `/api/solicitudes/archivo/${saId}?token=${encodeURIComponent(token || "")}`;
    window.open(url, "_blank");
  };

  const cargar = async () => {
    try {
      setLoading(true);

      let clienteId = 0;
      if (typeof window !== "undefined") {
        const userRaw = localStorage.getItem("user");
        if (userRaw) {
          const parsed = JSON.parse(userRaw);
          clienteId = Number(parsed?.cliente_id ?? 0);
        }
      }

      const params = clienteId > 0
        ? { mode: "mis-vencidos", usr_id: clienteId }
        : { mode: "expired" };

      const data = await solicitudesService.getDocumentos(params);
      setRows(data);
    } catch (error) {
      console.error("[MisDocumentosVencidosPage]", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/solicitudes")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a solicitudes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Mis documentos vencidos
          </h1>
          <p className="text-gray-600 mt-2">
            Consulta los documentos con vigencia vencida asociados a tus
            solicitudes.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total vencidos:{" "}
            <span className="font-semibold text-red-700">{rows.length}</span>
          </p>
          <button
            onClick={cargar}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            Cargando documentos vencidos...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            No tienes documentos vencidos.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Solicitud
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Centro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Fecha carga
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Fecha vencimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Días vencido
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                      Archivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.sa_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.sol_numero_solicitud}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.documento_nombre || row.nombre_original}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.cliente_nombre || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.centro_operacion_nombre || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(row.fecha_carga)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(row.fecha_vencimiento)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          {row.dias_vencido ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => abrirArchivo(row.sa_id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver archivo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
