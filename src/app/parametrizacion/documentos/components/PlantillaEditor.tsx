"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { REGEX_VARIABLE_PLANTILLA } from "@/lib/plantilla-variables.util";

export interface PlantillaEditorHandle {
  /** Inserta el placeholder de una variable como chip en la posición del cursor. */
  insertarEnCursor: (placeholder: string) => void;
  /** Envuelve la selección actual (o inserta un texto de ejemplo ya
   * seleccionado, si no hay selección) en un <strong> real — se ve en
   * negrita en el editor tal cual se verá en el PDF descargado. */
  aplicarNegrita: () => void;
  /** Igual que aplicarNegrita pero con un <span style="font-size"> — el
   * texto crece/achica en el editor al tamaño elegido. */
  aplicarTamaño: (size: number) => void;
  /** Inserta una viñeta ("• ") al inicio de la línea donde está el cursor. */
  aplicarVineta: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  etiquetaDeVariable: (placeholder: string) => string;
  placeholder?: string;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escaparAtributo(texto: string): string {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}

function htmlChip(placeholder: string, etiqueta: string): string {
  return (
    `<span class="pe-chip inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-1.5 py-0.5 align-baseline text-[11px] font-medium text-violet-700" contenteditable="false" data-placeholder="${escaparAtributo(placeholder)}">` +
    `${escaparHtml(etiqueta)}` +
    `<button type="button" data-chip-remove="1" contenteditable="false" aria-label="Quitar variable" class="pe-chip-x rounded-full px-1 leading-none text-violet-500 hover:bg-violet-200 hover:text-violet-900">×</button>` +
    `</span>`
  );
}

// Convierte un tramo de texto plano (sin marcadores de negrita/tamaño, ya
// resueltos por segmentarEstilos) a HTML: las variables se dibujan como
// chips de color, el resto queda como texto normal con \n -> <br>.
function contenidoConChipsAHtml(
  contenido: string,
  etiquetaDeVariable: (p: string) => string,
): string {
  let html = "";
  let cursor = 0;
  const regex = new RegExp(REGEX_VARIABLE_PLANTILLA);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(contenido))) {
    html += escaparHtml(contenido.slice(cursor, match.index)).replace(/\n/g, "<br>");
    const placeholder = match[0];
    html += htmlChip(placeholder, etiquetaDeVariable(placeholder));
    cursor = match.index + placeholder.length;
  }
  html += escaparHtml(contenido.slice(cursor)).replace(/\n/g, "<br>");
  return html;
}

// ===== Parseo de marcadores **negrita** / {{size:N}}...{{/size}} en tramos
// contiguos con su estilo resuelto — misma lógica de dos pasadas que usa el
// generador de PDF (ver palabrasConEstilosPdf/palabrasConNegritaPdf en
// carta-pdf.util.ts) para que el editor y el PDF descargado queden
// SIEMPRE de acuerdo en qué texto es negrita/tamaño. La diferencia es que
// acá se agrupa por tramos de texto contiguos (no palabra por palabra),
// porque lo que necesitamos es armar elementos <strong>/<span> del DOM,
// no dibujar texto suelto. =====

interface TramoEstilo {
  contenido: string;
  bold: boolean;
  size?: number;
}

function segmentarNegrita(texto: string, boldPorDefecto: boolean): TramoEstilo[] {
  const tramos: TramoEstilo[] = [];
  for (const parte of texto.split(/(\*\*[^*]+\*\*)/g)) {
    if (!parte) continue;
    const esNegrita = parte.startsWith("**") && parte.endsWith("**") && parte.length > 4;
    const contenido = esNegrita ? parte.slice(2, -2) : parte;
    tramos.push({ contenido, bold: esNegrita || boldPorDefecto });
  }
  return tramos;
}

function segmentarEstilos(texto: string): TramoEstilo[] {
  const tramos: TramoEstilo[] = [];
  const regexTamaño = /\{\{size:(\d+)\}\}([\s\S]*?)\{\{\/size\}\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const agregarTramo = (fragmento: string, size?: number) => {
    for (const tramo of segmentarNegrita(fragmento, false)) {
      tramos.push(size != null ? { ...tramo, size } : tramo);
    }
  };

  while ((match = regexTamaño.exec(texto))) {
    if (match.index > cursor) agregarTramo(texto.slice(cursor, match.index));
    agregarTramo(match[2], Number(match[1]));
    cursor = match.index + match[0].length;
  }
  if (cursor < texto.length) agregarTramo(texto.slice(cursor));

  return tramos;
}

// Texto plano guardado -> HTML del editor: negrita/tamaño se dibujan como
// elementos reales (<strong>/<span style>), no como marcadores literales —
// así se ven en el editor tal cual se van a ver en el PDF descargado.
function textoAHtml(texto: string, etiquetaDeVariable: (p: string) => string): string {
  return segmentarEstilos(texto)
    .map((tramo) => {
      let html = contenidoConChipsAHtml(tramo.contenido, etiquetaDeVariable);
      if (tramo.bold) html = `<strong>${html}</strong>`;
      if (tramo.size != null) html = `<span style="font-size:${tramo.size}px">${html}</span>`;
      return html;
    })
    .join("");
}

// Reconstruye el texto plano a partir del DOM del editor: los chips vuelven
// a su placeholder original, <br> vuelve a ser \n, y cualquier texto dentro
// de un <strong>/<b> o de un <span style="font-size"> se envuelve de nuevo
// en **...**/{{size:N}}...{{/size}}. El orden de salida cuando ambos
// aplican es siempre tamaño-por-fuera/negrita-por-dentro
// ({{size:N}}**texto**{{/size}}) — es el único orden que el generador de
// PDF combina correctamente (ver palabrasConEstilosPdf), así que acá se
// normaliza según los estilos ACTIVOS en cada nodo (mirando sus ancestros),
// sin importar cómo haya quedado anidado el DOM al aplicar los botones.
function domATexto(el: HTMLElement): string {
  interface Estilo {
    bold: boolean;
    size: number | null;
  }
  const tramos: { texto: string; estilo: Estilo }[] = [];

  const negritaActiva = (nodo: Node): boolean => {
    let actual: HTMLElement | null =
      nodo.nodeType === Node.ELEMENT_NODE ? (nodo as HTMLElement) : nodo.parentElement;
    while (actual && actual !== el) {
      if (actual.tagName === "STRONG" || actual.tagName === "B") return true;
      actual = actual.parentElement;
    }
    return false;
  };
  const tamañoActivo = (nodo: Node): number | null => {
    let actual: HTMLElement | null =
      nodo.nodeType === Node.ELEMENT_NODE ? (nodo as HTMLElement) : nodo.parentElement;
    while (actual && actual !== el) {
      const fontSize = actual.style?.fontSize;
      if (fontSize) {
        const n = parseInt(fontSize, 10);
        if (!Number.isNaN(n)) return n;
      }
      actual = actual.parentElement;
    }
    return null;
  };

  const agregarTexto = (texto: string, estilo: Estilo) => {
    if (!texto) return;
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.estilo.bold === estilo.bold && ultimo.estilo.size === estilo.size) {
      ultimo.texto += texto;
    } else {
      tramos.push({ texto, estilo });
    }
  };

  const recorrer = (nodo: ChildNode) => {
    if (nodo.nodeType === Node.TEXT_NODE) {
      agregarTexto(nodo.textContent || "", {
        bold: negritaActiva(nodo),
        size: tamañoActivo(nodo),
      });
      return;
    }
    if (nodo.nodeType !== Node.ELEMENT_NODE) return;
    const elNodo = nodo as HTMLElement;
    if (elNodo.tagName === "BR") {
      // Los saltos de línea nunca llevan estilo propio — si cortan un tramo
      // en negrita/tamaño, ese tramo se cierra acá y el siguiente (si tiene
      // el mismo estilo) abre su propio par de marcadores. Es más marcadores
      // de los estrictamente necesarios pero el resultado visual es idéntico.
      tramos.push({ texto: "\n", estilo: { bold: false, size: null } });
      return;
    }
    if (elNodo.classList.contains("pe-chip")) {
      agregarTexto(elNodo.getAttribute("data-placeholder") || "", {
        bold: negritaActiva(elNodo),
        size: tamañoActivo(elNodo),
      });
      return;
    }
    elNodo.childNodes.forEach(recorrer);
  };
  el.childNodes.forEach(recorrer);

  return tramos
    .map(({ texto, estilo }) => {
      let resultado = texto;
      if (estilo.bold) resultado = `**${resultado}**`;
      if (estilo.size != null) resultado = `{{size:${estilo.size}}}${resultado}{{/size}}`;
      return resultado;
    })
    .join("");
}

const PlantillaEditor = forwardRef<PlantillaEditorHandle, Props>(function PlantillaEditor(
  { value, onChange, etiquetaDeVariable, placeholder },
  ref,
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Evita que el efecto de sincronización re-escriba el DOM (y pierda el
  // cursor) justo después de un cambio que ya se originó en el propio
  // editor — solo debe re-renderizar cuando `value` cambia desde afuera
  // (reset() del formulario, cambio de editItem).
  const sincronizandoInternamente = useRef(false);
  // Última posición del cursor/selección DENTRO del editor. Los botones
  // "Insertar variable"/"Negrita"/"Tamaño"/"Viñeta" están fuera del
  // contentEditable (en el panel de abajo), así que para cuando el usuario
  // elige una pregunta en el <select> y hace clic en el botón, el foco ya
  // se movió y window.getSelection() ya no apunta al editor — sin este
  // respaldo, la operación se aplica en la posición 0 (rango inválido) en
  // vez de donde el usuario dejó el cursor.
  const ultimoRangoRef = useRef<Range | null>(null);
  // "Última versión conocida" de etiquetaDeVariable, actualizada en cada
  // render (sin depender de un efecto) — el efecto de reconstrucción total
  // de abajo solo debe dispararse cuando cambia `value`, nunca cuando
  // cambia esta función sola (ver por qué en el efecto de "solo texto de
  // los chips" más abajo).
  const etiquetaDeVariableRef = useRef(etiquetaDeVariable);
  etiquetaDeVariableRef.current = etiquetaDeVariable;

  useEffect(() => {
    const guardarRangoSiEsDelEditor = () => {
      const el = editorRef.current;
      const selection = window.getSelection();
      if (!el || !selection || selection.rangeCount === 0) return;
      const rango = selection.getRangeAt(0);
      if (el.contains(rango.commonAncestorContainer)) {
        ultimoRangoRef.current = rango.cloneRange();
      }
    };
    document.addEventListener("selectionchange", guardarRangoSiEsDelEditor);
    return () =>
      document.removeEventListener("selectionchange", guardarRangoSiEsDelEditor);
  }, []);

  // Reconstrucción TOTAL del DOM — solo cuando `value` cambia desde afuera
  // (reset() del formulario, cambio de editItem). No depende de
  // etiquetaDeVariable a propósito: si dependiera, cada vez que terminan de
  // cargar las preguntas del formulario activo (fetch async, puede tardar
  // más que lo que tarda el usuario en empezar a escribir) se reconstruiría
  // TODO el DOM — texto idéntico, pero nodos nuevos — invalidando cualquier
  // Range/selección que el usuario o ultimoRangoRef tuvieran guardada
  // apuntando a los nodos viejos (el cursor "saltaba" al principio del
  // texto la primera vez que se usaba un botón del panel de abajo).
  useEffect(() => {
    if (sincronizandoInternamente.current) {
      sincronizandoInternamente.current = false;
      return;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = textoAHtml(value, etiquetaDeVariableRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Actualización QUIRÚRGICA: cuando etiquetaDeVariable cambia de identidad
  // (terminan de cargar las preguntas), solo se actualiza el texto visible
  // de los chips ya existentes — sin tocar ningún otro nodo del DOM — para
  // que los chips insertados antes de esa carga dejen de decir "Sección
  // desconocida" sin invalidar la posición del cursor guardada.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".pe-chip").forEach((chip) => {
      const placeholder = chip.getAttribute("data-placeholder");
      const nodoTexto = chip.firstChild;
      if (!placeholder || !nodoTexto || nodoTexto.nodeType !== Node.TEXT_NODE) return;
      const etiquetaNueva = etiquetaDeVariable(placeholder);
      if (nodoTexto.textContent !== etiquetaNueva) nodoTexto.textContent = etiquetaNueva;
    });
  }, [etiquetaDeVariable]);

  const emitirCambio = () => {
    const el = editorRef.current;
    if (!el) return;
    sincronizandoInternamente.current = true;
    onChange(domATexto(el));
  };

  const obtenerRangoEnEditor = (): Range | null => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return null;
    const rango = selection.getRangeAt(0);
    if (!el.contains(rango.commonAncestorContainer)) return null;
    return rango;
  };

  // Rango donde aplicar la próxima operación de un botón externo (Insertar
  // variable/Negrita/Tamaño/Viñeta). Estos botones SIEMPRE están fuera del
  // contentEditable, así que para cuando su onClick corre, el foco del
  // documento ya se movió al botón (o, si hubo un <select> de por medio,
  // el navegador ya colapsó la selección "viva" al inicio del propio div
  // del editor — un (el, 0) que técnicamente pasa el chequeo
  // el.contains(...) pero no refleja dónde estaba el cursor real). Por eso
  // se prioriza SIEMPRE la última posición real capturada mientras el
  // usuario interactuaba de verdad con el editor (ultimoRangoRef); la
  // selección "en vivo" solo se usa como respaldo si nunca hubo una.
  const obtenerRangoParaOperar = (): Range => {
    const el = editorRef.current!;
    if (ultimoRangoRef.current && el.contains(ultimoRangoRef.current.commonAncestorContainer)) {
      return ultimoRangoRef.current;
    }
    const enVivo = obtenerRangoEnEditor();
    if (enVivo) return enVivo;
    const rango = document.createRange();
    rango.selectNodeContents(el);
    rango.collapse(false);
    return rango;
  };

  // Aplica `rango` como la selección real del navegador y recién después
  // enfoca el editor — en ese orden, porque contentEditable.focus() sobre
  // un elemento sin selección propia asociada resetea el cursor a la
  // posición 0 (así se manifestaba el bug: la variable se insertaba
  // siempre al principio del texto en vez de donde el usuario la dejó al
  // ir a elegir la pregunta en el <select> de al lado, que está fuera del
  // editor y le roba el foco).
  const posicionarCursorEn = (rango: Range) => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(rango);
    el.focus();
  };

  // Envuelve el contenido de `rango` en un elemento real creado por
  // `crearElemento()` — usa Range.extractContents()/insertNode() en vez de
  // armar texto plano a mano, así funciona aunque la selección incluya
  // chips de variables u otro <strong>/<span> ya aplicado (negrita+tamaño
  // combinados). Sin selección, inserta `textoSiVacio` ya seleccionado
  // dentro del elemento nuevo, para que el usuario lo sobreescriba.
  const envolverEnElemento = (
    rango: Range,
    crearElemento: () => HTMLElement,
    textoSiVacio: string,
  ) => {
    const elemento = crearElemento();
    if (rango.collapsed) {
      elemento.textContent = textoSiVacio;
      rango.insertNode(elemento);
    } else {
      elemento.appendChild(rango.extractContents());
      rango.insertNode(elemento);
    }
    const nuevoRango = document.createRange();
    nuevoRango.selectNodeContents(elemento);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nuevoRango);
  };

  // Todos los nodos de texto NO VACÍOS que intersectan `rango` — usado por
  // el toggle de abajo. Ojo: Range.cloneContents()/extractContents() NO
  // sirven para chequear "¿ya está en negrita?" cuando la selección cae
  // exactamente dentro de un único nodo de texto (el caso normal al
  // re-seleccionar una palabra ya en negrita) — en ese caso, por cómo
  // funciona el algoritmo de Range, el fragmento clonado/extraído es solo
  // el texto suelto, SIN el <strong> que lo envuelve en el documento real
  // (el spec de Range solo "reconstruye" ancestros para los que quedan
  // parcialmente seleccionados en un borde, no para el caso trivial de
  // start/end dentro del mismo nodo). Por eso acá se recorren los nodos de
  // texto REALES del documento y se mira su ancestro real hacia arriba.
  const nodosDeTextoEnRango = (rango: Range): Text[] => {
    const contenedor = rango.commonAncestorContainer;
    const raiz = contenedor.nodeType === Node.TEXT_NODE ? contenedor.parentNode! : contenedor;
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nodos: Text[] = [];
    let nodo = walker.nextNode();
    while (nodo) {
      if (rango.intersectsNode(nodo) && (nodo.textContent || "").trim() !== "") {
        nodos.push(nodo as Text);
      }
      nodo = walker.nextNode();
    }
    return nodos;
  };

  // Ancestro real (dentro del editor) más cercano que cumpla `esDelEstilo`,
  // o null si el nodo no está envuelto en ese estilo.
  const ancestroDeEstilo = (
    nodo: Node,
    raiz: HTMLElement,
    esDelEstilo: (el: HTMLElement) => boolean,
  ): HTMLElement | null => {
    let actual: HTMLElement | null =
      nodo.nodeType === Node.ELEMENT_NODE ? (nodo as HTMLElement) : nodo.parentElement;
    while (actual && actual !== raiz) {
      if (esDelEstilo(actual)) return actual;
      actual = actual.parentElement;
    }
    return null;
  };

  const desenvolverElemento = (elNodo: HTMLElement) => {
    while (elNodo.firstChild) {
      elNodo.parentNode?.insertBefore(elNodo.firstChild, elNodo);
    }
    elNodo.remove();
  };

  // Aplica un estilo con toggle: si CADA nodo de texto de la selección ya
  // está envuelto en un ancestro que cumple `esDelEstilo`, se desenvuelven
  // esos ancestros (quitar); si no, se envuelve la selección en un
  // elemento nuevo (aplicar). Simplificación aceptada: si el ancestro en
  // negrita se extiende más allá de lo seleccionado (el usuario negrilló
  // "Hola mundo" pero solo reselecciona "mundo"), quitar desenvuelve el
  // ancestro COMPLETO, no solo la porción elegida — cubre el caso normal
  // (reseleccionar exactamente lo que se negrilló antes) sin la
  // complejidad de partir un elemento parcialmente seleccionado a mano.
  const alternarEstiloEnSeleccion = (
    rango: Range,
    el: HTMLElement,
    esDelEstilo: (elNodo: HTMLElement) => boolean,
    crearElemento: () => HTMLElement,
    textoSiVacio: string,
  ) => {
    const nodosTexto = nodosDeTextoEnRango(rango);
    const todosEnvueltos =
      nodosTexto.length > 0 &&
      nodosTexto.every((n) => ancestroDeEstilo(n, el, esDelEstilo) !== null);

    if (todosEnvueltos) {
      const wrappers = new Set<HTMLElement>();
      nodosTexto.forEach((n) => {
        const wrapper = ancestroDeEstilo(n, el, esDelEstilo);
        if (wrapper) wrappers.add(wrapper);
      });
      wrappers.forEach(desenvolverElemento);
    } else {
      envolverEnElemento(rango, crearElemento, textoSiVacio);
    }
  };

  useImperativeHandle(ref, () => ({
    insertarEnCursor: (placeholder) => {
      const el = editorRef.current;
      if (!el) return;
      const rango = obtenerRangoParaOperar();
      posicionarCursorEn(rango);
      rango.deleteContents();

      const etiqueta = etiquetaDeVariable(placeholder);
      const chip = document.createElement("span");
      chip.className =
        "pe-chip inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-1.5 py-0.5 align-baseline text-[11px] font-medium text-violet-700";
      chip.contentEditable = "false";
      chip.setAttribute("data-placeholder", placeholder);
      chip.textContent = etiqueta;
      const botonX = document.createElement("button");
      botonX.type = "button";
      botonX.setAttribute("data-chip-remove", "1");
      botonX.contentEditable = "false";
      botonX.setAttribute("aria-label", "Quitar variable");
      botonX.className =
        "pe-chip-x rounded-full px-1 leading-none text-violet-500 hover:bg-violet-200 hover:text-violet-900";
      botonX.textContent = "×";
      chip.appendChild(botonX);

      rango.insertNode(chip);

      const rangoDespues = document.createRange();
      rangoDespues.setStartAfter(chip);
      rangoDespues.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(rangoDespues);

      emitirCambio();
    },

    aplicarNegrita: () => {
      const el = editorRef.current;
      if (!el) return;
      const rango = obtenerRangoParaOperar();
      posicionarCursorEn(rango);
      alternarEstiloEnSeleccion(
        rango,
        el,
        (elNodo) => elNodo.tagName === "STRONG" || elNodo.tagName === "B",
        () => document.createElement("strong"),
        "texto en negrita",
      );
      emitirCambio();
    },

    aplicarTamaño: (size) => {
      const el = editorRef.current;
      if (!el) return;
      const rango = obtenerRangoParaOperar();
      posicionarCursorEn(rango);
      alternarEstiloEnSeleccion(
        rango,
        el,
        (elNodo) => parseInt(elNodo.style?.fontSize || "", 10) === size,
        () => {
          const span = document.createElement("span");
          span.style.fontSize = `${size}px`;
          return span;
        },
        "texto",
      );
      emitirCambio();
    },

    aplicarVineta: () => {
      const el = editorRef.current;
      if (!el) return;
      const rango = obtenerRangoParaOperar();
      posicionarCursorEn(rango);
      const selection = window.getSelection();
      if (!selection) return;
      // Selection.modify("move", "backward", "lineboundary") mueve el
      // cursor al inicio de la línea VISUAL donde esté, sin importar en
      // qué columna lo dejó el usuario — no está en el spec DOM formal
      // pero lo soportan todos los navegadores modernos (Chrome/Firefox/
      // Safari/Edge) y es la forma estándar de resolver "inicio de línea"
      // en editores contentEditable sin reimplementar el layout de texto.
      selection.collapseToStart();
      selection.modify("move", "backward", "lineboundary");
      const rangoInicio = selection.getRangeAt(0);
      const textoVineta = document.createTextNode("• ");
      rangoInicio.insertNode(textoVineta);
      const rangoDespues = document.createRange();
      rangoDespues.setStartAfter(textoVineta);
      rangoDespues.collapse(true);
      selection.removeAllRanges();
      selection.addRange(rangoDespues);
      emitirCambio();
    },
  }));

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const objetivo = e.target as HTMLElement;
    const boton = objetivo.closest('[data-chip-remove]');
    if (boton) {
      e.preventDefault();
      boton.closest(".pe-chip")?.remove();
      emitirCambio();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enter inserta un <br> explícito en vez del <div>/<p> que arma Chrome
    // por defecto — así domATexto no tiene que lidiar con anidamiento de
    // bloques para reconstruir los saltos de línea.
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      emitirCambio();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const texto = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, texto);
    emitirCambio();
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={emitirCambio}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className="pe-editor min-h-55 max-h-110 w-full overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
    />
  );
});

export default PlantillaEditor;
