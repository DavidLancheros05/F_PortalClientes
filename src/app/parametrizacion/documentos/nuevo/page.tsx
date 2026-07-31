"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import DocumentosForm from "../components/DocumentosForm";

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const volver = () => router.push("/parametrizacion/documentos");

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
            <h1 className="text-base font-semibold">Crear tipo de documento</h1>
          </div>

          <div className="p-6">
            <DocumentosForm onSaved={volver} onCancel={volver} />
          </div>
        </div>
      </div>
    </div>
  );
}
