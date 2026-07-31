"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import DocumentosForm from "../../components/DocumentosForm";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";

export default function EditarDocumentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const volver = () => router.push("/parametrizacion/documentos");

  const [item, setItem] = useState<TipoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    documentosService
      .getById(id)
      .then(setItem)
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar el tipo de documento.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={volver}
          className="mb-4 flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </button>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-200 p-6 text-slate-800">
            <FileText className="h-4 w-4 text-blue-600" />
            <h1 className="text-base font-semibold">Editar tipo de documento</h1>
          </div>

          <div className="p-6">
            {loading ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Cargando...
              </p>
            ) : error ? (
              <p className="py-8 text-center text-xs text-red-600">{error}</p>
            ) : item ? (
              <DocumentosForm editItem={item} onSaved={volver} onCancel={volver} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
