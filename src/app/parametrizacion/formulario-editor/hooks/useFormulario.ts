"use client";
import { useEffect, useState } from "react";
import { formulariosService } from "@/services/parametrizacion/formularios.service";
import type { Formulario, Pregunta, Seccion, TipoPreguntaCatalogo } from "./types";

export function useFormulario(formularioId: string | null, version: string | null) {
  const formularioIdNumber = formularioId ? parseInt(formularioId) : null;

  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [tiposPregunta, setTiposPregunta] = useState<TipoPreguntaCatalogo[]>([]);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await formulariosService.cargarFormularioCompleto(formularioIdNumber, version);

      if (formularioIdNumber) {
        // console.log(`📥 [EDITOR] Cargando formulario ${formularioIdNumber}...`);
        setFormulario(data.formulario);
        // console.log("📋 [EDITOR] Formulario cargado:", data.formulario);
      }

      // console.log("📥 [EDITOR] Cargando secciones...");
      const seccionesOrdenadas = data.secciones.sort((a: Seccion, b: Seccion) => (a.fs_orden || a.seccion_orden || 0) - (b.fs_orden || b.seccion_orden || 0));
      // console.log("📋 [EDITOR] Secciones cargadas:", seccionesOrdenadas);
      setSecciones(seccionesOrdenadas);

      // console.log("📥 [EDITOR] Cargando tipos de pregunta...");
      setTiposPregunta(data.tiposPregunta);

      // console.log(
      //   `📥 [EDITOR] Cargando preguntas (formulario: ${formularioIdNumber}, versión: ${version})...`,
      // );

      let preguntasFiltradas: Pregunta[] = [];
      if (formularioIdNumber) {
        preguntasFiltradas = data.preguntas.filter(
          (p: Pregunta & { formulario_id?: number; fp_version?: number }) =>
            p.formulario_id === formularioIdNumber &&
            (version ? p.fp_version === parseInt(version) : true),
        );
      }

      // console.log("📋 [EDITOR] Preguntas cargadas:", preguntasFiltradas);
      // console.log("📊 [EDITOR] Total preguntas:", preguntasFiltradas.length);

      // Cargar opciones para preguntas SELECT/MULTISELECT
      const { formularioPreguntasService } = await import("@/services/parametrizacion/formulario-preguntas.service");
      const preguntasConOpciones = await Promise.all(
        preguntasFiltradas.map(async (p) => {
          if (["SELECT", "MULTISELECT"].includes(p.fp_tipo)) {
            try {
              const opciones = await formularioPreguntasService.getOpciones(p.fp_id);
              return { ...p, opciones };
            } catch (err) {
              console.warn(`⚠️ Error cargando opciones para pregunta ${p.fp_id}:`, err);
              return { ...p, opciones: [] };
            }
          }
          return p;
        })
      );

      const porSeccion = preguntasConOpciones.reduce((acc: any, p: Pregunta) => {
        const sid = p.seccion_id || "sin_seccion";
        acc[sid] = (acc[sid] || 0) + 1;
        return acc;
      }, {});
      // console.log("📊 [EDITOR] Preguntas por sección:", porSeccion);

      setPreguntas(preguntasConOpciones);

      if (seccionesOrdenadas.length > 0 && !seccionSeleccionada) {
        const seccionId = seccionesOrdenadas[0].fs_id || seccionesOrdenadas[0].seccion_id;
        setSeccionSeleccionada(seccionId || null);
        // console.log("✅ [EDITOR] Sección seleccionada:", seccionId);
      }
    } catch (error) {
      // console.error("❌ [EDITOR] Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [formularioId, version]);

  const preguntasDeSeccion = preguntas
    .filter((p) => p.seccion_id === seccionSeleccionada)
    .sort((a, b) => a.fp_orden - b.fp_orden);

  useEffect(() => {
    if (seccionSeleccionada) {
      // console.log("🔍 [EDITOR] Sección seleccionada:", seccionSeleccionada);
      // console.log("📝 [EDITOR] Preguntas filtradas:", preguntasDeSeccion.length);
      // console.log("📋 [EDITOR] Preguntas:", preguntasDeSeccion);
    }
  }, [seccionSeleccionada, preguntasDeSeccion]);

  const navegarSeccion = (direccion: "adelante" | "atras") => {
    const indiceActual = secciones.findIndex((s) => (s.fs_id || s.seccion_id) === seccionSeleccionada);
    if (direccion === "adelante" && indiceActual < secciones.length - 1) {
      setSeccionSeleccionada(secciones[indiceActual + 1].fs_id || secciones[indiceActual + 1].seccion_id || null);
    } else if (direccion === "atras" && indiceActual > 0) {
      setSeccionSeleccionada(secciones[indiceActual - 1].fs_id || secciones[indiceActual - 1].seccion_id || null);
    }
  };

  return {
    formulario,
    formularioIdNumber,
    secciones,
    setSecciones,
    preguntas,
    setPreguntas,
    tiposPregunta,
    seccionSeleccionada,
    setSeccionSeleccionada,
    loading,
    cargarDatos,
    preguntasDeSeccion,
    navegarSeccion,
  };
}
