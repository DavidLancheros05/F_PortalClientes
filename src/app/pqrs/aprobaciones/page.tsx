"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";

export default function AprobacionesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={CheckCircle2}
          eyebrow="PQRS"
          title="Aprobaciones"
          onBack={() => router.push("/pqrs")}
        />

        <EmptyStateCard
          icon={CheckCircle2}
          title="No hay PQRS pendientes de aprobación"
        />
      </div>
    </div>
  );
}
