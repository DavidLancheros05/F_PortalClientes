"use client";

import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import DocumentosForm from "../components/DocumentosForm";
import { PageHeaderCard } from "@/components/PageHeaderCard";

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const volver = () => router.push("/parametrizacion/documentos");

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Parametrización"
          title="Crear tipo de documento"
          onBack={volver}
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="p-6">
            <DocumentosForm onSaved={volver} onCancel={volver} />
          </div>
        </div>
      </div>
    </div>
  );
}
