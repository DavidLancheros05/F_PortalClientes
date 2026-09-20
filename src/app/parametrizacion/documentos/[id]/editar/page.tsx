"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import DocumentosForm from "../../components/DocumentosForm";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumento } from "@/services/admin/parametrizacion/documentos.types";
import { PageHeaderCard } from "@/components/PageHeaderCard";

export default function EditarDocumentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const volver = () => router.push("/parametrizacion/documentos");

  const [item, setItem] = useState<TipoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    documentosService
      .getById(id)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError("No se pudo cargar el tipo de documento.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Parametrización"
          title="Editar tipo de documento"
          onBack={volver}
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
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
