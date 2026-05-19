"use client";

import { useEffect, useState } from "react";
import FormularioPreguntaForm from "./components/FormularioPreguntaForm";
import FormularioPreguntaTable from "./components/FormularioPreguntaTable";
import { FormularioPregunta, formularioPreguntasService } from "@/services/parametrizacion/formulario-preguntas.service";



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
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Formulario de Preguntas</h1>

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
  );
}
