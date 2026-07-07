import { notFound } from "next/navigation";
import { ReactNode } from "react";

interface DynamicLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function DynamicLayout({
  children,
  params,
}: DynamicLayoutProps) {
  const { id: idStr } = await params;

  // Log para debugging
  // console.log(`[DynamicLayout] Recibido ID: "${idStr}"`);

  // Solo permitir IDs numéricos
  const isValidId = /^\d+$/.test(idStr);

  if (!isValidId) {
    // console.log(`[DynamicLayout] ID inválido "${idStr}", llamando notFound()`);
    notFound();
  }

  // console.log(`[DynamicLayout] ID válido "${idStr}", renderizando children`);
  return children;
}
