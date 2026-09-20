"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Search, X, Inbox } from "lucide-react";
import {
  formularioPreguntasService,
  PreguntaReservada,
} from "@/services/parametrizacion/formulario-preguntas.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { TableContainer } from "@/components/tables/TableContainer";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";

const MOTIVO_LABEL: Record<PreguntaReservada["fpr_motivo"], string> = {
  flujo: "Flujo del portal",
  siesa: "Envío a SIESA",
  flujo_siesa: "Flujo del portal + SIESA",
};

const MOTIVO_BADGE: Record<PreguntaReservada["fpr_motivo"], string> = {
  flujo: "bg-violet-50 text-violet-700 border-violet-100",
  siesa: "bg-amber-50 text-amber-700 border-amber-100",
  flujo_siesa: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function PreguntasReservadasPage() {
  const [reservadas, setReservadas] = useState<PreguntaReservada[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState<
    "TODOS" | PreguntaReservada["fpr_motivo"]
  >("TODOS");

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await formularioPreguntasService.getReservadas();
      setReservadas(data);
    } catch (error) {
      console.error(error);
      setReservadas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Pool crudo de sugerencias — combina las tres columnas que también
  // consulta el filtro real (textoOk).
  const filtroTextoSugerencias = useMemo(
    () =>
      reservadas.flatMap((r) => [
        r.fpr_codigo ?? "",
        r.fp_descripcion ?? "",
        r.fpr_descripcion ?? "",
      ]),
    [reservadas],
  );

  const filtradas = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return reservadas.filter((r) => {
      const textoOk =
        texto === "" ||
        r.fpr_codigo.toLowerCase().includes(texto) ||
        (r.fp_descripcion || "").toLowerCase().includes(texto) ||
        (r.fpr_descripcion || "").toLowerCase().includes(texto);
      const motivoOk = filtroMotivo === "TODOS" || r.fpr_motivo === filtroMotivo;
      return textoOk && motivoOk;
    });
  }, [reservadas, filtroTexto, filtroMotivo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto">
        <PageHeaderCard
          icon={Lock}
          eyebrow="Parametrización · Formularios"
          title="Preguntas Reservadas"
          subtitle="Preguntas cuyo tipo de input o eliminación está bloqueado en el editor porque el backend depende de ellas por código (flujo interno del portal o envío de datos a SIESA)"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SuggestField
              label="Buscar por código o pregunta"
              className="md:col-span-2"
              placeholder="Ej: CUPO_SOLICITADO"
              value={filtroTexto}
              onChange={setFiltroTexto}
              suggestions={filtroTextoSugerencias}
            />

            <FilterField label="Motivo">
              <select
                value={filtroMotivo}
                onChange={(e) => setFiltroMotivo(e.target.value as typeof filtroMotivo)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="flujo">Flujo del portal</option>
                <option value="siesa">Envío a SIESA</option>
                <option value="flujo_siesa">Flujo del portal + SIESA</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={cargar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              {(filtroTexto || filtroMotivo !== "TODOS") && (
                <button
                  onClick={() => {
                    setFiltroTexto("");
                    setFiltroMotivo("TODOS");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              )}
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : filtradas.length === 0 ? (
          <EmptyStateCard
            icon={Inbox}
            title="No hay preguntas reservadas para los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <p className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-semibold">{filtradas.length}</span>{" "}
                pregunta{filtradas.length !== 1 ? "s" : ""} reservada
                {filtradas.length !== 1 ? "s" : ""}
              </p>
            </div>

            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Pregunta</Th>
                      <Th>Código (fp_codigo)</Th>
                      <Th>Tipo actual</Th>
                      <Th>Motivo</Th>
                      <Th>Dónde se usa</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtradas.map((r) => (
                      <Tr key={r.fpr_id}>
                        <Td>
                          {r.fp_descripcion ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {r.fp_descripcion}
                              </p>
                              {r.fp_estado === false && (
                                <span className="text-xs text-gray-500">
                                  (pregunta inactiva)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-sm">
                              No se encontró ninguna pregunta con este código
                              todavía
                            </span>
                          )}
                        </Td>
                        <Td>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {r.fpr_codigo}
                          </code>
                        </Td>
                        <Td>
                          <span className="text-sm text-gray-700">
                            {r.fp_tipo || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${MOTIVO_BADGE[r.fpr_motivo]}`}
                          >
                            <Lock className="h-3 w-3" />
                            {MOTIVO_LABEL[r.fpr_motivo]}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs text-gray-500">
                            {r.fpr_descripcion || "—"}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableContainer>
          </div>
        )}
      </div>
    </div>
  );
}
