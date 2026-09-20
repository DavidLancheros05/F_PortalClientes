"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getOpcionesByPregunta } from "@/services/parametrizacion/opciones.service";
import OpcionesTable from "./components/OpcionesTable";
import OpcionForm from "./components/OpcionForm";

export default function OpcionesPage() {
  const params = useParams();
  const fp_id = Number(params?.id);

  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(true);
  // Token de la petición en curso: si `fp_id` cambia (navegar a otra
  // pregunta) o el componente se desmonta antes de que responda, una
  // respuesta tardía no debe pisar el estado de la pregunta actual.
  const requestIdRef = useRef(0);

  const loadOpciones = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await getOpcionesByPregunta(fp_id);
      if (requestIdRef.current !== requestId) return;
      setOpciones(res.data);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  useEffect(() => {
    loadOpciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp_id]);

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
