"use client";

import { useEffect, useState } from "react";
import FormularioPreguntaForm from "./components/FormularioPreguntaForm";
import FormularioPreguntaTable from "./components/FormularioPreguntaTable";
import { FormularioPregunta, formularioPreguntasService } from "@/services/parametrizacion/formulario-preguntas.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { HelpCircle } from "lucide-react";



export default function FormularioPreguntasPage() {
  const [items, setItems] = useState<FormularioPregunta[]>([]);
  const [editItem, setEditItem] = useState<FormularioPregunta | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await formularioPreguntasService.getAll();
      setItems(data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
      <PageHeaderCard
        icon={HelpCircle}
        eyebrow="Parametrización"
        title="Preguntas del formulario"
        subtitle="Administra el catálogo de preguntas reutilizables del formulario de vinculación."
      />

      <FormularioPreguntaForm
        editItem={editItem || undefined}
        onSaved={() => {
          setEditItem(null);
          cargarDatos();
        }}
        onCancel={() => setEditItem(null)}
      />

      {loading ? (
        <p className="mt-4 text-gray-600">Cargando...</p>
      ) : (
        <FormularioPreguntaTable items={items} onEdit={setEditItem} onReload={cargarDatos} />
      )}
      </div>
    </div>
  );
}
