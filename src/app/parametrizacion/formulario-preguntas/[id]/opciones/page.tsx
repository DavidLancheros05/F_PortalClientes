"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOpcionesByPregunta } from "@/services/parametrizacion/opciones.service";
import OpcionesTable from "./components/OpcionesTable";
import OpcionForm from "./components/OpcionForm";

export default function OpcionesPage() {
  const params = useParams();
  const fp_id = Number(params?.id);

  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOpciones = async () => {
    setLoading(true);
    const res = await getOpcionesByPregunta(fp_id);
    setOpciones(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadOpciones();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Opciones de la Pregunta</h1>

      <OpcionForm fp_id={fp_id} onSaved={loadOpciones} />

      <OpcionesTable
        fp_id={fp_id}
        opciones={opciones}
        onChange={loadOpciones}
        loading={loading}
      />
    </div>
  );
}
