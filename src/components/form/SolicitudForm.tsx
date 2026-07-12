import React, { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { formulariosService } from "@/services/parametrizacion/formularios.service";

interface CopiaInfo {
  [fp_id: number]: {
    valor: string;
    copiado: boolean;
    sol_id?: number;
    sol_numero_solicitud?: string;
  };
}

interface Pregunta {
  fp_id: number;
  fp_descripcion: string;
  fp_tipo: "TEXTO" | "NUMERO";
}

export default function SolicitudForm({ clienteId }: { clienteId: number }) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [copias, setCopias] = useState<CopiaInfo>({});
  const [loading, setLoading] = useState(false);
  const [infoCopia, setInfoCopia] = useState<{
    sol_id?: number;
    sol_numero_solicitud?: string;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const preguntas = await formulariosService.getPreguntasActivas();
        setPreguntas(preguntas);

        const data =
          await solicitudesService.getUltimaSolicitudRespuestas(clienteId);
        if (data && data.respuestas && data.respuestas.length > 0) {
          const respuestasCopia: Record<number, string> = {};
          const copiasInfo: CopiaInfo = {};
          data.respuestas.forEach((resp: any) => {
            respuestasCopia[resp.fp_id] =
              resp.valor_texto || resp.valor_numero || "";
            copiasInfo[resp.fp_id] = {
              valor: respuestasCopia[resp.fp_id],
              copiado: true,
              sol_id: data.sol_id,
              sol_numero_solicitud: data.sol_numero_solicitud,
            };
          });
          setRespuestas(respuestasCopia);
          setCopias(copiasInfo);
          setInfoCopia({
            sol_id: data.sol_id,
            sol_numero_solicitud: data.sol_numero_solicitud,
          });
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
    loadData();
  }, [clienteId]);

  const handleChange = (fp_id: number, value: string) => {
    setRespuestas((prev) => ({ ...prev, [fp_id]: value }));
    setCopias((prev) => ({
      ...prev,
      [fp_id]: prev[fp_id]
        ? { ...prev[fp_id], valor: value, copiado: false }
        : { valor: value, copiado: false },
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const solicitud = await solicitudesService.create({
        cliente_id: clienteId,
      });
      const solicitudId = solicitud.sol_id || solicitud.sa_sol_id;

      await solicitudesService.guardarRespuestasFormulario(
        solicitudId,
        Object.entries(respuestas).map(([fp_id, valor]) => ({
          fp_id: Number(fp_id),
          valor,
        })),
      );

      alert("Solicitud creada correctamente");
      setRespuestas({});
    } catch (err) {
      console.error(err);
      alert("Error al crear la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Formulario del Cliente</h2>

      {infoCopia && infoCopia.sol_numero_solicitud && (
        <div style={{ marginBottom: 16, color: "#888", fontSize: 13 }}>
          <span>
            Algunos campos fueron copiados de la solicitud previa:{" "}
            <b>{infoCopia.sol_numero_solicitud}</b>. Puedes editarlos antes de
            enviar.
          </span>
        </div>
      )}

      {preguntas.map((p) => (
        <div key={p.fp_id} style={{ marginBottom: 16 }}>
          <label>
            {p.fp_descripcion}
            {copias[p.fp_id]?.copiado && (
              <span style={{ color: "blue", fontSize: 12, marginLeft: 8 }}>
                (copiado de solicitud {copias[p.fp_id].sol_numero_solicitud})
              </span>
            )}
          </label>
          <br />
          <input
            type={p.fp_tipo === "NUMERO" ? "number" : "text"}
            value={respuestas[p.fp_id] || ""}
            onChange={(e) => handleChange(p.fp_id, e.target.value)}
            required
            style={copias[p.fp_id]?.copiado ? { background: "#e6f0ff" } : {}}
          />
        </div>
      ))}

      <button disabled={loading}>
        {loading ? "Guardando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
