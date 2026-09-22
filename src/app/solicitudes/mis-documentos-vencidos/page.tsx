"use client";
import { solicitudesService } from "@/services/solicitudes.service";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

interface DocumentoVencidoRow {
  sa_id: number;
  sa_sol_id: number;
  sol_numero: string;
  documento_nombre: string | null;
  sa_nombre_original: string;
  sa_ruta_almacenamiento: string;
  fecha_carga: string;
  sa_fecha_vencimiento: string | null;
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

      const params = clienteId > 0 ? { mode: "mis-vencidos", usr_id: clienteId } : { mode: "expired" };

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
            // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir destino real.
            onClick={() => router.push("/solicitudes")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800">
            ← Volver a solicitudes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis documentos vencidos</h1>
          <p className="text-gray-600 mt-2">
            Consulta los documentos con vigencia vencida asociados a tus solicitudes.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total vencidos: <span className="font-semibold text-red-700">{rows.length}</span>
          </p>
          <button
            onClick={cargar}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
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
                    <Th>Solicitud</Th>
                    <Th>Documento</Th>
                    <Th>Cliente</Th>
                    <Th>Centro</Th>
                    <Th>Fecha carga</Th>
                    <Th>Fecha vencimiento</Th>
                    <Th>Días vencido</Th>
                    <Th>Archivo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <Tr key={row.sa_id}>
                      <Td>{row.sol_numero}</Td>
                      <Td>{row.documento_nombre || row.sa_nombre_original}</Td>
                      <Td>{row.cliente_nombre || "-"}</Td>
                      <Td>{row.centro_operacion_nombre || "-"}</Td>
                      <Td>{formatDate(row.fecha_carga)}</Td>
                      <Td>{formatDate(row.sa_fecha_vencimiento)}</Td>
                      <Td>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          {row.dias_vencido ?? 0}
                        </span>
                      </Td>
                      <Td>
                        <button
                          onClick={() => abrirArchivo(row.sa_id)}
                          className="text-blue-600 hover:text-blue-800 font-medium">
                          Ver archivo
                        </button>
                      </Td>
                    </Tr>
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
