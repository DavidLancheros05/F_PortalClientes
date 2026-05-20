"use client";
import { clientesService } from "@/services/clientes/clientes.service";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  FileText,
  Loader2,
  MapPin,
  Mail,
  User,
} from "lucide-react";

export default function ClienteDetallePage() {
  const router = useRouter();
  const params = useParams();
  const clienteId = useMemo(() => Number(params?.id), [params]);

  const [razonSocial, setRazonSocial] = useState("");
  const [nitDocumento, setNitDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ejecutivo, setEjecutivo] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarCliente = async () => {
      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        setError("ID de cliente inválido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const clienteData = await clientesService.getById(clienteId);

        setRazonSocial(clienteData.razonSocial || "");
        setNitDocumento(clienteData.nitDocumento || "");
        setCorreo(clienteData.correo || "");
        setDireccion(clienteData.direccion || "");
        setEjecutivo(clienteData.ejecutivo || null);
      } catch (err: any) {
        setError(err?.message || "Error cargando cliente");
      } finally {
        setLoading(false);
      }
    };

    cargarCliente();
  }, [clienteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-3 text-gray-600">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/parametrizacion/clientes")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/parametrizacion/clientes")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a clientes
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-xl">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {razonSocial}
                </h1>
                <p className="text-gray-500 mt-1">Detalle del cliente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Razón Social */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900">
                  {razonSocial}
                </div>
              </div>

              {/* NIT/Documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  NIT / Documento
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 font-mono">
                  {nitDocumento}
                </div>
              </div>

              {/* Correo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Correo
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900">
                  {correo || "-"}
                </div>
              </div>

              {/* Dirección */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Dirección
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900">
                  {direccion || "-"}
                </div>
              </div>

              {/* Ejecutivo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Ejecutivo Asignado
                </label>
                <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900">
                  {ejecutivo ? ejecutivo.nombre : "Sin asignar"}
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 justify-end mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={() => router.push("/parametrizacion/clientes")}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() =>
                  router.push(`/parametrizacion/clientes/${clienteId}/editar`)
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center font-medium"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
