import { useEffect, useMemo, useState } from "react";
import { maestrosService } from "@/services/maestros/maestros.service";
import { resolverValorPreguntaDisparadora } from "../lib/resolverValorPregunta";
import type { FormularioPregunta, Opcion, RespuestasState } from "../types";

type ReglaFiltroCatalogo = { valor?: string; valor_filtro?: string };

function parseReglasFiltro(json?: string | null): ReglaFiltroCatalogo[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Cuando la pregunta padre es ella misma un catálogo (SELECT_TABLA, ej.
// "Departamento"), su respuesta ya guarda directamente el id del catálogo
// en valor_numero (ver PreguntaRenderer.tsx) — no en valor_opcion_id, y sin
// filas en Formulario_pregunta_opcion contra las que resolverla como texto.
// resolverValorPreguntaDisparadora asume SELECT/MULTISELECT (texto vía
// opciones) y devuelve "" para este caso — de ahí que este hook necesite su
// propia resolución para padres tipo catálogo, en vez de reusar esa función
// para todos los casos.
function resolverValorDisparador(
  padre: FormularioPregunta | undefined,
  respuestas: RespuestasState,
): string {
  if (padre?.fp_tipo === "SELECT_TABLA") {
    const valor = respuestas[padre.fp_id]?.valor_numero;
    return valor != null ? String(valor) : "";
  }
  return resolverValorPreguntaDisparadora(padre, respuestas);
}

// Preguntas SELECT_TABLA cuyo catálogo depende de la respuesta de otra
// pregunta (fp_catalogo_filtro_pregunta_id, configurado desde el editor de
// formularios) — vuelve a pedir el catálogo filtrado cada vez que cambia esa
// respuesta. Genérico para cualquier pareja de preguntas (no hardcodeado a
// País→Departamento→Ciudad, ver SolicitudFormContent.tsx para ese caso
// aparte), con dos modos según el tipo de la pregunta padre:
//
// - Padre SELECT_TABLA (catálogo, ej. Departamento): filtra directamente
//   por el id ya elegido en el padre (fp_catalogo_filtro_columna = @id del
//   padre) — no requiere enumerar fp_catalogo_filtro_reglas a mano, igual
//   que las columnas CATALOGO dentro de una pregunta TABLA
//   (catalogo_columna_padre/catalogo_columna_filtro).
// - Padre SELECT/MULTISELECT (opciones de texto, ej. "¿Solicita crédito?"):
//   sigue usando fp_catalogo_filtro_reglas ({valor, valor_filtro}) para
//   traducir la respuesta de texto a un valor de filtro — es el único modo
//   que tiene sentido cuando el padre no es un catálogo con id propio.
export function useCatalogoDependiente(
  preguntas: FormularioPregunta[],
  respuestas: RespuestasState,
): Record<number, Opcion[]> {
  const [catalogoDependienteMap, setCatalogoDependienteMap] = useState<
    Record<number, Opcion[]>
  >({});

  const preguntasDependientes = useMemo(
    () =>
      preguntas.filter(
        (p) =>
          p.fp_tipo === "SELECT_TABLA" && p.fp_catalogo_filtro_pregunta_id,
      ),
    [preguntas],
  );

  // Firma compacta de los valores resueltos de las preguntas padre
  // relevantes — acota el efecto de abajo a esos cambios puntuales, en vez
  // de reaccionar a cualquier cambio dentro de `respuestas` (que cambia en
  // cada tecla de cualquier pregunta del formulario).
  const firmaValoresPadre = useMemo(
    () =>
      preguntasDependientes
        .map((p) => {
          const padre = preguntas.find(
            (q) => q.fp_id === p.fp_catalogo_filtro_pregunta_id,
          );
          return `${p.fp_id}:${resolverValorDisparador(padre, respuestas)}`;
        })
        .join("|"),
    [preguntasDependientes, preguntas, respuestas],
  );

  useEffect(() => {
    if (preguntasDependientes.length === 0) return;

    let cancelado = false;

    Promise.all(
      preguntasDependientes.map(async (pregunta) => {
        const padre = preguntas.find(
          (q) => q.fp_id === pregunta.fp_catalogo_filtro_pregunta_id,
        );

        let valorFiltro: string | undefined;

        if (padre?.fp_tipo === "SELECT_TABLA") {
          // Padre catálogo: el filtro es directamente el id ya elegido en
          // el padre, sin pasar por fp_catalogo_filtro_reglas.
          const idPadre = resolverValorDisparador(padre, respuestas);
          valorFiltro = idPadre || undefined;
        } else {
          // Padre SELECT/MULTISELECT: traducir el texto de la respuesta a
          // un valor de filtro vía fp_catalogo_filtro_reglas (comportamiento
          // existente, ej. "¿Solicita crédito?" → Condición de Pago).
          const valorActual = resolverValorDisparador(padre, respuestas)
            .trim()
            .toLowerCase();
          const reglas = parseReglasFiltro(pregunta.fp_catalogo_filtro_reglas);
          const regla = reglas.find(
            (r) => (r.valor || "").trim().toLowerCase() === valorActual,
          );
          valorFiltro = valorActual ? regla?.valor_filtro : undefined;
        }

        // Sin respuesta del padre o sin valor de filtro resuelto: catálogo
        // vacío, nunca el catálogo completo sin filtrar (reintroduciría el
        // bug que este mecanismo resuelve).
        if (!valorFiltro) {
          return [pregunta.fp_id, [] as Opcion[]] as const;
        }

        try {
          const opciones = await maestrosService.getCatalogo(
            pregunta.fp_catalogo_tabla || "",
            pregunta.fp_catalogo_base_datos,
            pregunta.fp_catalogo_columna,
            pregunta.fp_catalogo_pk_column,
            pregunta.fp_catalogo_filtro_columna,
            valorFiltro,
            pregunta.fp_catalogo_columna_condicion,
            pregunta.fp_catalogo_valor_condicion,
          );
          return [pregunta.fp_id, opciones as Opcion[]] as const;
        } catch (error) {
          console.error(
            `Error cargando catálogo dependiente para pregunta ${pregunta.fp_id}:`,
            error,
          );
          return [pregunta.fp_id, [] as Opcion[]] as const;
        }
      }),
    ).then((entradas) => {
      if (cancelado) return;
      setCatalogoDependienteMap(Object.fromEntries(entradas));
    });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaValoresPadre]);

  return catalogoDependienteMap;
}
