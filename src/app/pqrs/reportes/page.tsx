"use client";

import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";

export default function ReportesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={BarChart3}
          eyebrow="PQRS"
          title="Reportes"
          onBack={() => router.push("/pqrs")}
        />

        <EmptyStateCard icon={BarChart3} title="Reportes y estadísticas de PQRS" />
      </div>
    </div>
  );
}
