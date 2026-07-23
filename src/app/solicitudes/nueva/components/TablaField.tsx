"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/FormularioUI/SearchableSelect";
import { maestrosService } from "@/services/parametrizacion/maestros.service";
import type { FormularioPregunta, RespuestasState } from "../types";

interface TablaFieldProps {
  pregunta: FormularioPregunta;
  preguntas: FormularioPregunta[];
  respuestas: RespuestasState;
  readOnly: boolean;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
}

type ReglaLimiteTabla = {
  valor: string;
  limite: number | null;
};

function parseReglasLimite(json?: string | null): ReglaLimiteTabla[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolverValorPreguntaDisparadora(
  preguntaDisparadora: FormularioPregunta | undefined,
  respuestas: RespuestasState,
): string {
  if (!preguntaDisparadora) return "";
  const respuesta = respuestas[preguntaDisparadora.fp_id];
  if (!respuesta) return "";

  if (
    ["SELECT", "SELECT_TABLA", "MULTISELECT"].includes(preguntaDisparadora.fp_tipo)
  ) {
    const valorOpcionId = respuesta.valor_opcion_id;
    const id = Array.isArray(valorOpcionId) ? valorOpcionId[0] : valorOpcionId;
    const opcion = preguntaDisparadora.opciones?.find(
      (o: any) => Number(o.op_id ?? o.fpo_id) === Number(id),
    );
    return String((opcion as any)?.op_descripcion ?? (opcion as any)?.fpo_valor ?? "");
  }

  if (preguntaDisparadora.fp_tipo === "NUMERO") {
    return respuesta.valor_numero != null ? String(respuesta.valor_numero) : "";
  }
  if (preguntaDisparadora.fp_tipo === "FECHA") {
    return respuesta.valor_fecha || "";
  }
  return respuesta.valor_texto || "";
}

type FilaTabla = Record<string, string>;

type OpcionCatalogo = { op_id: number; op_descripcion: string };

type ColumnaTabla = {
  nombre: string;
  tipo: "TEXTO" | "NUMERO" | "SI_NO" | "CATALOGO" | "MONEDA";
  catalogo_base_datos?: string;
  catalogo_tabla?: string;
  catalogo_columna?: string;
  catalogo_pk_column?: string;
  catalogo_columna_padre?: string;
  catalogo_columna_filtro?: string;
};

function parseColumnas(fp_tabla_columnas?: string | null): ColumnaTabla[] {
  if (!fp_tabla_columnas) return [];
  try {
    const parsed = JSON.parse(fp_tabla_columnas);
    if (!Array.isArray(parsed)) return [];
    // Compatibilidad con columnas antiguas guardadas como string plano
    return parsed
      .map((c: unknown): ColumnaTabla | null => {
        if (typeof c === "string") return { nombre: c, tipo: "TEXTO" };
        if (c && typeof c === "object" && typeof (c as ColumnaTabla).nombre === "string") {
          const col = c as ColumnaTabla;
          return {
            nombre: col.nombre,
            tipo:
              col.tipo === "SI_NO" ||
              col.tipo === "CATALOGO" ||
              col.tipo === "MONEDA" ||
              col.tipo === "NUMERO"
                ? col.tipo
                : "TEXTO",
            catalogo_base_datos: col.catalogo_base_datos,
            catalogo_tabla: col.catalogo_tabla,
            catalogo_columna: col.catalogo_columna,
            catalogo_pk_column: col.catalogo_pk_column,
            catalogo_columna_padre: col.catalogo_columna_padre,
            catalogo_columna_filtro: col.catalogo_columna_filtro,
          };
        }
        return null;
      })
      .filter((c): c is ColumnaTabla => c !== null);
  } catch {
    return [];
  }
}

// Nombres de todas las columnas que dependen (directa o transitivamente) de `nombreColumna`
function obtenerDescendientes(
  nombreColumna: string,
  columnas: ColumnaTabla[],
): string[] {
  const directos = columnas
    .filter((c) => c.catalogo_columna_padre === nombreColumna)
    .map((c) => c.nombre);
  return directos.reduce<string[]>(
    (acc, nombre) => [...acc, ...obtenerDescendientes(nombre, columnas)],
    directos,
  );
}

function parseFilas(valorTexto: string | undefined): FilaTabla[] {
  if (!valorTexto) return [];
  try {
    const parsed = JSON.parse(valorTexto);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface CeldaCatalogoDependienteProps {
  columna: ColumnaTabla;
  columnaPadre: ColumnaTabla;
  valorPadreTexto: string;
  valor: string;
  disabled: boolean;
  onChange: (valor: string) => void;
}

// Select de una columna CATALOGO que depende del valor de OTRA columna de la
// misma fila (ej: Departamento depende de Pais). Resuelve el id del valor
// padre consultando su propio catálogo, y con eso trae solo las opciones
// hijas relacionadas (ej: departamentos de ese país).
function CeldaCatalogoDependiente({
  columna,
  columnaPadre,
  valorPadreTexto,
  valor,
  disabled,
  onChange,
}: CeldaCatalogoDependienteProps) {
  const [opciones, setOpciones] = useState<OpcionCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!valorPadreTexto || !columna.catalogo_columna_filtro || !columnaPadre.catalogo_tabla) {
      setOpciones([]);
      return;
    }

    let cancelado = false;
    setCargando(true);

    maestrosService
      .getCatalogoValores(
        columnaPadre.catalogo_tabla,
        columnaPadre.catalogo_base_datos,
        columnaPadre.catalogo_columna,
        columnaPadre.catalogo_pk_column,
      )
      .then((opcionesPadre) => {
        const padreId = opcionesPadre.find(
          (o) => o.op_descripcion === valorPadreTexto,
        )?.op_id;
        if (!padreId || !columna.catalogo_tabla) return [];
        return maestrosService.getCatalogoValores(
          columna.catalogo_tabla,
          columna.catalogo_base_datos,
          columna.catalogo_columna,
          columna.catalogo_pk_column,
          columna.catalogo_columna_filtro,
          padreId,
        );
      })
      .then((valores) => {
        if (!cancelado) setOpciones(valores || []);
      })
      .catch(() => {
        if (!cancelado) setOpciones([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [
    valorPadreTexto,
    columna.catalogo_tabla,
    columna.catalogo_base_datos,
    columna.catalogo_columna,
    columna.catalogo_pk_column,
    columna.catalogo_columna_filtro,
    columnaPadre.catalogo_tabla,
    columnaPadre.catalogo_base_datos,
    columnaPadre.catalogo_columna,
    columnaPadre.catalogo_pk_column,
  ]);

  const placeholderText = !valorPadreTexto
    ? `Primero elige ${columnaPadre.nombre}`
    : cargando
      ? "Cargando..."
      : opciones.length === 0
        ? "Sin opciones"
        : "Selecciona...";

  return (
    <SearchableSelect
      options={opciones.map((op) => ({
        id: op.op_descripcion,
        label: op.op_descripcion,
      }))}
      value={valor}
      onChange={onChange}
      disabled={disabled || !valorPadreTexto || cargando}
      placeholder={placeholderText}
    />
  );
}

export function TablaField({
  pregunta,
  preguntas,
  respuestas,
  readOnly,
  handleInputChange,
}: TablaFieldProps) {
  const columnas = useMemo(
    () => parseColumnas(pregunta.fp_tabla_columnas),
    [pregunta.fp_tabla_columnas],
  );

  // Opciones de columnas CATALOGO independientes (no dependen de otra columna);
  // las columnas dependientes cargan sus opciones por fila, filtradas por el
  // valor del padre (ver <CeldaCatalogoDependiente />).
  const [valoresCatalogo, setValoresCatalogo] = useState<
    Record<string, OpcionCatalogo[]>
  >({});

  useEffect(() => {
    const columnasCatalogo = columnas.filter(
      (c) => c.tipo === "CATALOGO" && c.catalogo_tabla && !c.catalogo_columna_padre,
    );
    columnasCatalogo.forEach((c) => {
      maestrosService
        .getCatalogoValores(
          c.catalogo_tabla!,
          c.catalogo_base_datos,
          c.catalogo_columna,
          c.catalogo_pk_column,
        )
        .then((valores) => {
          setValoresCatalogo((prev) => ({ ...prev, [c.nombre]: valores }));
        })
        .catch(() => {
          setValoresCatalogo((prev) => ({ ...prev, [c.nombre]: [] }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pregunta.fp_tabla_columnas]);

  const filas = parseFilas(respuestas[pregunta.fp_id]?.valor_texto);
  const filasVisibles = filas.length > 0 ? filas : [{}];

  const todasLasFilasCompletas = filasVisibles.every((fila) =>
    columnas.every((columna) => (fila[columna.nombre] || "").trim() !== ""),
  );

  const limiteFilas = useMemo((): number | null => {
    const modo = pregunta.fp_tabla_limite_modo;
    if (modo === "FIJO") {
      return pregunta.fp_maximo ?? null;
    }
    if (modo === "CONDICIONAL" && pregunta.fp_tabla_limite_pregunta_id) {
      const preguntaDisparadora = preguntas.find(
        (p) => p.fp_id === pregunta.fp_tabla_limite_pregunta_id,
      );
      const valorActual = resolverValorPreguntaDisparadora(
        preguntaDisparadora,
        respuestas,
      ).trim().toLowerCase();
      const reglas = parseReglasLimite(pregunta.fp_tabla_limite_reglas);
      const regla = reglas.find(
        (r) => r.valor.trim().toLowerCase() === valorActual,
      );
      return regla ? regla.limite : null;
    }
    return null;
  }, [
    pregunta.fp_tabla_limite_modo,
    pregunta.fp_maximo,
    pregunta.fp_tabla_limite_pregunta_id,
    pregunta.fp_tabla_limite_reglas,
    preguntas,
    respuestas,
  ]);

  const limiteAlcanzado =
    limiteFilas !== null && filasVisibles.length >= limiteFilas;

  const actualizarFilas = (nuevasFilas: FilaTabla[]) => {
    handleInputChange(pregunta.fp_id, JSON.stringify(nuevasFilas), "TABLA");
  };

  const actualizarCelda = (filaIndex: number, columnaNombre: string, valor: string) => {
    const descendientes = obtenerDescendientes(columnaNombre, columnas);
    const nuevasFilas = filasVisibles.map((fila, idx) => {
      if (idx !== filaIndex) return fila;
      const nuevaFila = { ...fila, [columnaNombre]: valor };
      // Si cambia el valor de una columna de la que dependen otras (ej: Pais),
      // se limpian sus columnas hijas (ej: Departamento, Ciudad) para que el
      // usuario vuelva a elegirlas dentro de las opciones ya filtradas.
      descendientes.forEach((nombreHijo) => {
        nuevaFila[nombreHijo] = "";
      });
      return nuevaFila;
    });
    actualizarFilas(nuevasFilas);
  };

  const agregarFila = () => {
    actualizarFilas([...filasVisibles, {}]);
  };

  const eliminarFila = (filaIndex: number) => {
    const nuevasFilas = filasVisibles.filter((_, idx) => idx !== filaIndex);
    actualizarFilas(nuevasFilas.length > 0 ? nuevasFilas : [{}]);
  };

  if (columnas.length === 0) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 shadow-sm">
        Esta pregunta tipo tabla no tiene columnas configuradas.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 shadow-md shadow-slate-200/60">
      <div className="overflow-x-auto" style={{overflowY: 'visible'}}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
              {columnas.map((columna) => (
                <th
                  key={columna.nombre}
                  className="px-3 py-2.5 text-left font-semibold text-white tracking-wide first:rounded-tl-2xl"
                >
                  {columna.nombre}
                </th>
              ))}
              {!readOnly && (
                <th className="w-9 rounded-tr-2xl px-2 py-2.5"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filasVisibles.map((fila, filaIndex) => (
              <tr
                key={filaIndex}
                className="transition-colors hover:bg-blue-50/40"
              >
                {columnas.map((columna) => {
                  if (columna.tipo === "SI_NO") {
                    return (
                      <td key={columna.nombre} className="p-1 relative">
                        <SearchableSelect
                          options={[
                            { id: "Sí", label: "Sí" },
                            { id: "No", label: "No" },
                          ]}
                          value={fila[columna.nombre] || ""}
                          onChange={(value) =>
                            actualizarCelda(filaIndex, columna.nombre, String(value))
                          }
                          disabled={readOnly}
                          placeholder="Selecciona..."
                        />
                      </td>
                    );
                  }

                  if (columna.tipo === "CATALOGO" && columna.catalogo_columna_padre) {
                    const columnaPadre = columnas.find(
                      (c) => c.nombre === columna.catalogo_columna_padre,
                    );
                    if (!columnaPadre) {
                      return (
                        <td key={columna.nombre} className="p-1 text-xs text-amber-700">
                          Columna padre "{columna.catalogo_columna_padre}" no existe
                        </td>
                      );
                    }
                    return (
                      <td key={columna.nombre} className="p-1 relative">
                        <CeldaCatalogoDependiente
                          columna={columna}
                          columnaPadre={columnaPadre}
                          valorPadreTexto={fila[columnaPadre.nombre] || ""}
                          valor={fila[columna.nombre] || ""}
                          disabled={readOnly}
                          onChange={(valor) =>
                            actualizarCelda(filaIndex, columna.nombre, valor)
                          }
                        />
                      </td>
                    );
                  }

                  if (columna.tipo === "CATALOGO") {
                    const opciones = valoresCatalogo[columna.nombre] || [];
                    return (
                      <td key={columna.nombre} className="p-1 relative">
                        <SearchableSelect
                          options={opciones.map((op) => ({
                            id: op.op_descripcion,
                            label: op.op_descripcion,
                          }))}
                          value={fila[columna.nombre] || ""}
                          onChange={(value) =>
                            actualizarCelda(filaIndex, columna.nombre, String(value))
                          }
                          disabled={readOnly || opciones.length === 0}
                          placeholder={opciones.length === 0 ? "Sin opciones" : "Selecciona..."}
                        />
                      </td>
                    );
                  }

                  if (columna.tipo === "MONEDA") {
                    return (
                      <td key={columna.nombre} className="p-1">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-slate-500">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={readOnly}
                            value={
                              fila[columna.nombre]
                                ? Number(fila[columna.nombre]).toLocaleString("es-CO")
                                : ""
                            }
                            onChange={(e) => {
                              const soloDigitos = e.target.value.replace(/\D/g, "");
                              actualizarCelda(filaIndex, columna.nombre, soloDigitos);
                            }}
                            className="w-full rounded-lg border border-transparent bg-transparent py-1.5 pl-5 pr-2 text-xs text-slate-700 transition-all focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:text-slate-400"
                          />
                        </div>
                      </td>
                    );
                  }

                  if (columna.tipo === "NUMERO") {
                    return (
                      <td key={columna.nombre} className="p-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={readOnly}
                          value={fila[columna.nombre] || ""}
                          onChange={(e) => {
                            const soloDigitos = e.target.value.replace(/\D/g, "");
                            actualizarCelda(filaIndex, columna.nombre, soloDigitos);
                          }}
                          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs text-slate-700 transition-all focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:text-slate-400"
                        />
                      </td>
                    );
                  }

                  return (
                    <td key={columna.nombre} className="p-1">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={fila[columna.nombre] || ""}
                        onChange={(e) =>
                          actualizarCelda(filaIndex, columna.nombre, e.target.value)
                        }
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs text-slate-700 transition-all focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:text-slate-400"
                      />
                    </td>
                  );
                })}
                {!readOnly && (
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => eliminarFila(filaIndex)}
                      disabled={filasVisibles.length === 1}
                      className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-1.5">
          <button
            type="button"
            onClick={agregarFila}
            disabled={!todasLasFilasCompletas || limiteAlcanzado}
            title={
              limiteAlcanzado
                ? `Alcanzaste el límite de ${limiteFilas} fila${limiteFilas === 1 ? "" : "s"}`
                : todasLasFilasCompletas
                  ? undefined
                  : "Completa todas las columnas de todas las filas antes de agregar otra"
            }
            className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md hover:from-blue-600 hover:to-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-sm"
          >
            <Plus className="h-3 w-3" />
            Agregar fila
          </button>
          {limiteAlcanzado ? (
            <p className="mt-1 text-xs text-amber-700">
              Alcanzaste el límite de {limiteFilas} fila{limiteFilas === 1 ? "" : "s"} para
              esta pregunta.
            </p>
          ) : (
            !todasLasFilasCompletas && (
              <p className="mt-1 text-xs text-amber-700">
                Completa todas las columnas de todas las filas para poder agregar una nueva.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
