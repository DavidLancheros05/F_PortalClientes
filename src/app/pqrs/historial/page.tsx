"use client";

import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";

export default function HistorialPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={History}
          eyebrow="PQRS"
          title="Historial"
          onBack={() => router.push("/pqrs")}
        />

        <EmptyStateCard icon={History} title="No hay historial disponible" />
      </div>
    </div>
  );
}
