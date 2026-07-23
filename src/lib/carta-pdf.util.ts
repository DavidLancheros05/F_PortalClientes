// Renderizador compartido de PDFs del sistema: todos comparten el mismo
// encabezado "formato oficial" (tabla con logo, razón social, código de
// FORMATO, PAGINA No. y REVISION) y la misma lógica de cuerpo (subtítulo/
// párrafo/lista/viñeta, justificado como corresponde a cada tipo). Se
// dibujan con pdf-lib (vectorial, coordenadas exactas) en vez de
// html2pdf.js/html2canvas: esa ruta "toma una foto" del HTML vía un <div>
// con innerHTML, y el <style> incrustado en ese fragmento no se aplica de
// forma confiable (solo sobrevive el estilo por defecto del navegador,
// ej. <strong> se ve en negrita pero cualquier clase CSS propia —
// centrado, negrita del membrete, líneas divisorias, justificado— no).
// Aparte de eso, html2canvas tiene bugs conocidos con <table> (pierde
// bordes con border-collapse) y con pagebreak 'avoid-all' (empuja
// contenido a la página siguiente aunque cupiera en la actual). Con
// pdf-lib el encabezado, la paginación y el estilo tipográfico quedan
// 100% garantizados porque los dibujamos nosotros, no un motor de
// renderizado de HTML.
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from "pdf-lib";

// ===== Clasificación de texto plano en bloques (subtítulo/párrafo/lista/
// viñeta) — compartida por generarCartaPdf y generarFormatoOficialPdf =====
//
// Reglas:
// - Bloques separados por línea en blanco = unidades independientes.
// - Un bloque de varias líneas cuya primera línea termina en ":" y mide
//   <=60 caracteres = viñeta (la primera línea es la etiqueta en negrita,
//   el resto es la descripción).
// - Un bloque de una sola línea corta que termina en ":" = subtítulo de
//   sección, en negrita, sin justificar.
// - Un bloque de varias líneas (sin línea en blanco entre ellas, y que no
//   califica como viñeta) = lista de términos o bloque de firma — se
//   muestra línea por línea, sin justificar (una carta formal nunca
//   justifica listas ni firmas).
// - Cualquier otro bloque de una sola línea es un párrafo de prosa real y
//   sí se justifica.

function esBloqueVineta(lineas: string[]): boolean {
  if (lineas.length < 2) return false;
  const primera = lineas[0];
  return primera.length <= 60 && primera.endsWith(":");
}

// Detecta una viñeta explícita ("• ", ver botón "• Viñeta" del editor) aun
// cuando el usuario seleccionó la línea ENTERA (incluido el "•") al aplicar
// Tamaño/Negrita — en ese caso el marcador queda antes del "•" (ej.
// "{{size:14}}• texto{{/size}}") y un startsWith("• ") literal no lo
// detectaría. Devuelve el prefijo de marcadores (para conservarlo) y el
// resto de la línea ya sin ese prefijo, para poder chequear/quitar el "• "
// real que viene después.
function separarPrefijoDeMarcadores(linea: string): { prefijo: string; resto: string } {
  const match = linea.match(/^(?:\*\*|\{\{size:\d+\}\}|\{\{\/size\}\})*/);
  const prefijo = match ? match[0] : "";
  return { prefijo, resto: linea.slice(prefijo.length) };
}

function esLineaVinetaExplicita(linea: string): boolean {
  return separarPrefijoDeMarcadores(linea).resto.startsWith("• ");
}

type ParteTexto = (
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; lineas: string[] }
  | { tipo: "vineta"; label: string; resto: string }
) & {
  // Líneas en blanco de más que el autor de la plantilla dejó ANTES de
  // este bloque, además de la línea en blanco normal que ya separa
  // bloques — ej. varias líneas vacías entre "Atentamente," y la raya de
  // firma para dejar un hueco visual grande. Se traduce en espacio
  // vertical extra al dibujar (ver dibujarBloquesPdf), en vez de
  // perderse silenciosamente como antes.
  espacioExtra: number;
  // true si este bloque viene justo después de una viñeta explícita, sin
  // línea en blanco de por medio — texto de continuación/explicación de esa
  // viñeta que se dibuja corrido a la derecha (mismo indent que el texto de
  // la viñeta), en vez de pegado al margen izquierdo como un párrafo suelto.
  sangrado: boolean;
};

function agruparBloquesConEspacio(
  contenido: string,
): { lineas: string[]; espacioExtra: number; sangrado: boolean }[] {
  const bloques: { lineas: string[]; espacioExtra: number; sangrado: boolean }[] = [];
  let lineasActuales: string[] = [];
  let espacioExtraActual = 0;
  let blancosConsecutivos = 0;
  // true mientras las líneas que siguen deban indentarse por venir justo
  // después de una viñeta — se apaga con una línea en blanco (corta la
  // continuación) o se reafirma con cada viñeta nueva.
  let sangradoPendiente = false;

  const cerrarBloque = () => {
    if (lineasActuales.length === 0) return;
    bloques.push({
      lineas: lineasActuales,
      espacioExtra: espacioExtraActual,
      sangrado: sangradoPendiente,
    });
    lineasActuales = [];
  };

  for (const lineaRaw of contenido.split("\n")) {
    const linea = lineaRaw.trim();
    if (linea === "") {
      blancosConsecutivos++;
      continue;
    }
    if (blancosConsecutivos > 0) {
      cerrarBloque();
      // La primera línea en blanco solo separa bloques (como siempre);
      // cada línea en blanco ADICIONAL se convierte en espacio extra.
      espacioExtraActual = blancosConsecutivos - 1;
      sangradoPendiente = false;
    }
    blancosConsecutivos = 0;

    if (esLineaVinetaExplicita(linea)) {
      // Una viñeta explícita (botón "• Viñeta" del editor) nunca se agrupa
      // con la línea de al lado, aunque no haya línea en blanco entre
      // medio — cada una es su propio bloque de un solo renglón, así el PDF
      // dibuja un "•" por línea en vez de fusionarlas en un párrafo o
      // lista.
      // Caso no cubierto a propósito: si negrita/tamaño se aplicó
      // seleccionando texto que cruza hacia una línea de viñeta,
      // balancearMarcadoresPorLinea antepone el marcador abierto (ej. "**")
      // antes del "• ", y esLineaVinetaExplicita ya no lo detecta como
      // viñeta — en la práctica el botón "Viñeta" se usa sobre una línea
      // puntual, no sobre una selección que además cruza a la siguiente.
      cerrarBloque();
      lineasActuales.push(linea);
      cerrarBloque();
      espacioExtraActual = 0;
      sangradoPendiente = true;
      continue;
    }

    lineasActuales.push(linea);
  }
  cerrarBloque();

  return bloques;
}

// Un marcador de negrita (**) o de tamaño ({{size:N}}...{{/size}}) puede
// quedar con la apertura en una línea y el cierre varias líneas después —
// pasa cuando la selección que se envolvió en el editor cruza uno o más
// saltos de línea (ej. el usuario aplicó "Tamaño" sobre el documento
// completo de una sola vez, en vez de sobre una frase). El problema no es
// solo entre párrafos: dibujarVinetaPdf separa la primera línea de un
// bloque tipo viñeta ("label") del resto ("resto") como DOS strings
// independientes, y dibujarListaPdf procesa cada línea de un bloque tipo
// lista una por una — en ambos casos cada string se le pasa por separado a
// palabrasConEstilosPdf, que solo reconoce un marcador si la apertura Y el
// cierre están en el MISMO string. Un marcador sin cerrar en su línea
// nunca se reconocía como tal y terminaba imprimiéndose como texto
// literal. Esta función reescribe el contenido cerrando cada marcador
// todavía abierto al final de cada línea y reabriéndolo al principio de la
// siguiente, para que cualquier línea individual quede autocontenida sin
// cambiar el resultado visual (el tramo completo se sigue viendo en
// negrita/con el tamaño elegido). Usa una pila (no un simple booleano) por
// si negrita y tamaño llegan a solaparse, para cerrarlos en el orden
// correcto (el último abierto se cierra primero).
function balancearMarcadoresPorLinea(contenido: string): string {
  const pila: string[] = [];
  const textoDeCierre = (marcador: string) =>
    marcador === "**" ? "**" : "{{/size}}";

  const lineasFinal = contenido.split("\n").map((linea) => {
    const prefijo = pila.join("");

    const regexToken = /\*\*|\{\{size:\d+\}\}|\{\{\/size\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = regexToken.exec(linea))) {
      if (match[0] === "**") {
        const i = pila.lastIndexOf("**");
        if (i !== -1) pila.splice(i, 1);
        else pila.push("**");
      } else if (match[0] === "{{/size}}") {
        const i = pila.findIndex((m) => m.startsWith("{{size:"));
        if (i !== -1) pila.splice(i, 1);
      } else {
        pila.push(match[0]);
      }
    }

    const sufijo = [...pila].reverse().map(textoDeCierre).join("");
    return prefijo + linea + sufijo;
  });

  return lineasFinal.join("\n");
}

function clasificarBloquesTexto(contenidoOriginal: string): ParteTexto[] {
  const contenido = balancearMarcadoresPorLinea(contenidoOriginal);
  const bloques = agruparBloquesConEspacio(contenido);

  const partes: ParteTexto[] = [];

  for (const { lineas, espacioExtra, sangrado } of bloques) {
    if (lineas.length === 1 && esLineaVinetaExplicita(lineas[0])) {
      // Viñeta explícita (ver botón "• Viñeta" en PlantillaEditor.tsx) —
      // un "•" real por línea, sin el label en negrita forzado que usa la
      // heurística vieja de abajo (label="" no agrega palabras, ver
      // dibujarVinetaPdf/palabrasConEstilosPdf). Se conserva el prefijo de
      // marcadores (ej. {{size:14}}) si el usuario sizeó/negrilló la línea
      // completa incluido el "•" — ver separarPrefijoDeMarcadores.
      const { prefijo, resto } = separarPrefijoDeMarcadores(lineas[0]);
      partes.push({
        tipo: "vineta",
        label: "",
        resto: (prefijo + resto.slice(2)).trim(),
        espacioExtra,
        sangrado,
      });
      continue;
    }
    if (esBloqueVineta(lineas)) {
      const [primera, ...resto] = lineas;
      partes.push({
        tipo: "vineta",
        label: primera,
        resto: resto.join(" "),
        espacioExtra,
        sangrado,
      });
      continue;
    }
    if (lineas.length === 1) {
      const esSubtitulo = lineas[0].length <= 60 && lineas[0].endsWith(":");
      if (esSubtitulo) {
        partes.push({ tipo: "subtitulo", texto: lineas[0], espacioExtra, sangrado });
      } else {
        partes.push({ tipo: "parrafo", texto: lineas[0], espacioExtra, sangrado });
      }
    } else {
      partes.push({ tipo: "lista", lineas, espacioExtra, sangrado });
    }
  }

  return partes;
}

// ===== Primitivas de dibujo de texto con palabras mixtas negrita/regular =====

interface PalabraPdf {
  texto: string;
  bold: boolean;
  /** Tamaño puntual (ver {{size:N}}...{{/size}} y palabrasConEstilosPdf) —
   * si falta, se usa el fontSize del bloque que la dibuja. */
  size?: number;
}

// Envuelve una secuencia de palabras (algunas en negrita/tamaño propio) en
// líneas que no superen maxWidth, midiendo cada palabra con su propia
// fuente y tamaño.
function envolverPalabrasPdf(
  palabras: PalabraPdf[],
  maxWidth: number,
  fontSize: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
): PalabraPdf[][] {
  const spaceWidth = fontRegular.widthOfTextAtSize(" ", fontSize);
  const lineas: PalabraPdf[][] = [];
  let lineaActual: PalabraPdf[] = [];
  let anchoActual = 0;

  for (const palabra of palabras) {
    const font = palabra.bold ? fontBold : fontRegular;
    const anchoPalabra = font.widthOfTextAtSize(palabra.texto, palabra.size ?? fontSize);
    const anchoConEspacio =
      lineaActual.length > 0
        ? anchoActual + spaceWidth + anchoPalabra
        : anchoPalabra;
    if (lineaActual.length > 0 && anchoConEspacio > maxWidth) {
      lineas.push(lineaActual);
      lineaActual = [palabra];
      anchoActual = anchoPalabra;
    } else {
      lineaActual = [...lineaActual, palabra];
      anchoActual = anchoConEspacio;
    }
  }
  if (lineaActual.length > 0) lineas.push(lineaActual);
  return lineas;
}

// Alto vertical a reservar para una línea ya envuelta: si contiene palabras
// con tamaño puntual mayor al del bloque, la línea crece proporcionalmente
// para no pisar la línea siguiente.
function altoLineaPdf(lineaPalabras: PalabraPdf[], fontSizeBase: number, lineHeightBase: number): number {
  const tamañoMax = lineaPalabras.reduce(
    (max, p) => Math.max(max, p.size ?? fontSizeBase),
    fontSizeBase,
  );
  return Math.max(lineHeightBase, lineHeightBase * (tamañoMax / fontSizeBase));
}

// Parsea marcadores **texto** dentro de una cadena en palabras con negrita
// puntual — para poder resaltar una frase dentro de un párrafo/lista/viñeta
// de la plantilla sin que todo el bloque sea negrita (ver botón "Negrita" en
// DocumentosForm.tsx, que envuelve la selección en **...**). Los marcadores
// no se dibujan, solo determinan qué palabras van en fontBold.
function palabrasConNegritaPdf(texto: string, boldPorDefecto = false): PalabraPdf[] {
  const palabras: PalabraPdf[] = [];
  for (const parte of texto.split(/(\*\*[^*]+\*\*)/g)) {
    if (!parte) continue;
    const esNegrita = parte.startsWith("**") && parte.endsWith("**") && parte.length > 4;
    const contenido = esNegrita ? parte.slice(2, -2) : parte;
    for (const palabra of contenido.split(/\s+/).filter(Boolean)) {
      palabras.push({ texto: palabra, bold: esNegrita || boldPorDefecto });
    }
  }
  return palabras;
}

// Parsea marcadores {{size:N}}texto{{/size}} para tamaño de letra puntual —
// misma idea que palabrasConNegritaPdf, pero para tamaño (ver botón
// "Tamaño" en DocumentosForm.tsx). Se resuelve primero el tamaño por tramos
// y, dentro de cada tramo, se delega en palabrasConNegritaPdf para que
// negrita y tamaño puntual puedan combinarse sin pisarse.
function palabrasConEstilosPdf(texto: string, boldPorDefecto = false): PalabraPdf[] {
  const palabras: PalabraPdf[] = [];
  const regexTamaño = /\{\{size:(\d+)\}\}([\s\S]*?)\{\{\/size\}\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const agregarTramo = (fragmento: string, size?: number) => {
    for (const palabra of palabrasConNegritaPdf(fragmento, boldPorDefecto)) {
      palabras.push(size != null ? { ...palabra, size } : palabra);
    }
  };

  while ((match = regexTamaño.exec(texto))) {
    if (match.index > cursor) agregarTramo(texto.slice(cursor, match.index));
    agregarTramo(match[2], Number(match[1]));
    cursor = match.index + match[0].length;
  }
  if (cursor < texto.length) agregarTramo(texto.slice(cursor));

  return palabras;
}

// Dibuja una línea con palabras mixtas negrita/regular, opcionalmente
// justificada (repartiendo el espacio extra entre huecos, como en
// generarPdfSolicitud del backend).
function dibujarLineaMixtaPdf(
  page: PDFPage,
  palabras: PalabraPdf[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  color: ReturnType<typeof rgb>,
  justificar: boolean,
) {
  const spaceWidth = fontRegular.widthOfTextAtSize(" ", fontSize);

  if (!justificar || palabras.length <= 1) {
    let cursorX = x;
    for (const palabra of palabras) {
      const font = palabra.bold ? fontBold : fontRegular;
      const size = palabra.size ?? fontSize;
      page.drawText(palabra.texto, { x: cursorX, y, size, font, color });
      cursorX += font.widthOfTextAtSize(palabra.texto, size) + spaceWidth;
    }
    return;
  }

  const anchoNatural =
    palabras.reduce(
      (suma, p) =>
        suma + (p.bold ? fontBold : fontRegular).widthOfTextAtSize(p.texto, p.size ?? fontSize),
      0,
    ) +
    spaceWidth * (palabras.length - 1);
  const espacioExtra = Math.max(0, maxWidth - anchoNatural);
  const espacioPorHueco = espacioExtra / (palabras.length - 1);

  let cursorX = x;
  palabras.forEach((palabra) => {
    const font = palabra.bold ? fontBold : fontRegular;
    const size = palabra.size ?? fontSize;
    page.drawText(palabra.texto, { x: cursorX, y, size, font, color });
    cursorX +=
      font.widthOfTextAtSize(palabra.texto, size) + spaceWidth + espacioPorHueco;
  });
}

// ===== Dibujo de bloques (subtítulo/párrafo/lista/viñeta) con paginación
// automática — compartido por generarCartaPdf y generarFormatoOficialPdf.
// Cada documento define su propio `checkSpace`, pero la lógica de qué
// pinta cada tipo de bloque es idéntica en ambos. =====

interface CursorPdf {
  page: PDFPage;
  y: number;
}

interface EstiloCuerpoPdf {
  marginLeft: number;
  contentWidth: number;
  fontSizeBody: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  color: ReturnType<typeof rgb>;
  lineHeightParrafo: number;
  lineHeightLista: number;
  checkSpace: (cursor: CursorPdf, needed: number) => void;
}

function dibujarParrafoPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, texto: string) {
  const palabras = palabrasConEstilosPdf(texto);
  const lineas = envolverPalabrasPdf(
    palabras,
    estilo.contentWidth,
    estilo.fontSizeBody,
    estilo.fontRegular,
    estilo.fontBold,
  );
  lineas.forEach((lineaPalabras, idx) => {
    const alto = altoLineaPdf(lineaPalabras, estilo.fontSizeBody, estilo.lineHeightParrafo);
    estilo.checkSpace(cursor, alto);
    dibujarLineaMixtaPdf(
      cursor.page,
      lineaPalabras,
      estilo.marginLeft,
      cursor.y,
      estilo.contentWidth,
      estilo.fontSizeBody,
      estilo.fontRegular,
      estilo.fontBold,
      estilo.color,
      idx < lineas.length - 1,
    );
    cursor.y -= alto;
  });
  cursor.y -= 10;
}

function dibujarSubtituloPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, texto: string) {
  estilo.checkSpace(cursor, estilo.fontSizeBody + 14);
  cursor.y -= 14;
  // Ya se dibuja entera en negrita — solo se limpian marcadores ** y
  // {{size:N}}/{{/size}}, por si el autor de la plantilla los dejó puestos
  // por costumbre.
  const textoLimpio = texto
    .replace(/\*\*/g, "")
    .replace(/\{\{size:\d+\}\}/g, "")
    .replace(/\{\{\/size\}\}/g, "");
  cursor.page.drawText(textoLimpio, {
    x: estilo.marginLeft,
    y: cursor.y,
    size: estilo.fontSizeBody,
    font: estilo.fontBold,
    color: estilo.color,
  });
  cursor.y -= estilo.fontSizeBody + 6;
}

function dibujarListaPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, lineas: string[]) {
  for (const linea of lineas) {
    const palabras = palabrasConEstilosPdf(linea);
    const subLineas = envolverPalabrasPdf(
      palabras,
      estilo.contentWidth,
      estilo.fontSizeBody,
      estilo.fontRegular,
      estilo.fontBold,
    );
    subLineas.forEach((subLinea) => {
      const alto = altoLineaPdf(subLinea, estilo.fontSizeBody, estilo.lineHeightLista);
      estilo.checkSpace(cursor, alto);
      dibujarLineaMixtaPdf(
        cursor.page,
        subLinea,
        estilo.marginLeft,
        cursor.y,
        estilo.contentWidth,
        estilo.fontSizeBody,
        estilo.fontRegular,
        estilo.fontBold,
        estilo.color,
        false,
      );
      cursor.y -= alto;
    });
  }
  cursor.y -= 12;
}

// Sangría de una viñeta (y del texto que la sigue sin línea en blanco de
// por medio, ver "sangrado" en ParteTexto) — compartida para que ambos
// queden alineados verticalmente.
const INDENT_SANGRIA = 14;

function dibujarVinetaPdf(
  cursor: CursorPdf,
  estilo: EstiloCuerpoPdf,
  label: string,
  resto: string,
) {
  const indent = INDENT_SANGRIA;
  const maxWidth = estilo.contentWidth - indent;
  const palabras: PalabraPdf[] = [
    ...palabrasConEstilosPdf(label, true),
    ...palabrasConEstilosPdf(resto, false),
  ];
  const lineas = envolverPalabrasPdf(
    palabras,
    maxWidth,
    estilo.fontSizeBody,
    estilo.fontRegular,
    estilo.fontBold,
  );
  lineas.forEach((lineaPalabras, idx) => {
    const alto = altoLineaPdf(lineaPalabras, estilo.fontSizeBody, estilo.lineHeightParrafo);
    estilo.checkSpace(cursor, alto);
    if (idx === 0) {
      cursor.page.drawText("•", {
        x: estilo.marginLeft,
        y: cursor.y,
        size: estilo.fontSizeBody,
        font: estilo.fontRegular,
        color: estilo.color,
      });
    }
    dibujarLineaMixtaPdf(
      cursor.page,
      lineaPalabras,
      estilo.marginLeft + indent,
      cursor.y,
      maxWidth,
      estilo.fontSizeBody,
      estilo.fontRegular,
      estilo.fontBold,
      estilo.color,
      idx < lineas.length - 1,
    );
    cursor.y -= alto;
  });
  cursor.y -= 10;
}

function dibujarBloquesPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, partes: ParteTexto[]) {
  for (const parte of partes) {
    if (parte.espacioExtra > 0) {
      const espacio = parte.espacioExtra * estilo.lineHeightParrafo;
      estilo.checkSpace(cursor, espacio);
      cursor.y -= espacio;
    }
    // Texto de continuación de una viñeta (sin línea en blanco de por
    // medio) se dibuja con el mismo indent que el texto de esa viñeta, en
    // vez de pegado al margen izquierdo — la viñeta misma no usa esto
    // (dibujarVinetaPdf ya aplica su propio indent internamente).
    const estiloEfectivo =
      parte.sangrado && parte.tipo !== "vineta"
        ? {
            ...estilo,
            marginLeft: estilo.marginLeft + INDENT_SANGRIA,
            contentWidth: estilo.contentWidth - INDENT_SANGRIA,
          }
        : estilo;
    if (parte.tipo === "subtitulo") dibujarSubtituloPdf(cursor, estiloEfectivo, parte.texto);
    else if (parte.tipo === "parrafo") dibujarParrafoPdf(cursor, estiloEfectivo, parte.texto);
    else if (parte.tipo === "lista") dibujarListaPdf(cursor, estiloEfectivo, parte.lineas);
    else dibujarVinetaPdf(cursor, estilo, parte.label, parte.resto);
  }
}

// ===== Tabla "CONTROL DE CAMBIOS" (Revisión / Descripción del Cambio /
// Fecha) — historial editable por tipo de documento (ver "Editar tipo de
// documento"), se dibuja una sola vez al final del cuerpo, en la última
// página. Compartida por generarCartaPdf y generarFormatoOficialPdf. =====

export interface RevisionDocumentoPdf {
  revision: string;
  descripcionCambio: string;
  fecha: string;
}

// WinAnsi (cp1252, la codificación que usan las fuentes estándar de
// pdf-lib) no puede representar cualquier code point Unicode — un
// caracter corrupto (mojibake de un dato mal codificado, un emoji, etc.)
// en un campo libre como "Descripción del Cambio" hacía que
// page.drawText() reventara y tumbara la generación del PDF completo, no
// solo esa fila. Se reemplaza cualquier code point fuera del rango seguro
// (ASCII imprimible + acentos/ñ/¿/¡ en español) por "?" antes de dibujar.
function sanearTextoPdf(texto: string): string {
  return texto.replace(/[^\x20-\x7E¡¿À-ÿ]/g, "?");
}

function envolverTextoPlano(
  texto: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra;
    if (actual && font.widthOfTextAtSize(tentativa, fontSize) > maxWidth) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = tentativa;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function dibujarTablaRevisionesPdf(
  cursor: CursorPdf,
  opciones: {
    marginLeft: number;
    contentWidth: number;
    fontRegular: PDFFont;
    fontBold: PDFFont;
    checkSpace: (c: CursorPdf, needed: number) => void;
  },
  revisiones: RevisionDocumentoPdf[],
) {
  if (revisiones.length === 0) return;
  const { marginLeft, contentWidth, fontRegular, fontBold, checkSpace } = opciones;
  const negro = rgb(0.1, 0.1, 0.1);
  const fontSize = 8;
  const padX = 6;
  const padY = 5;
  const lineHeight = 10;

  const colRevisionW = 70;
  const colFechaW = 100;
  const colDescW = contentWidth - colRevisionW - colFechaW;

  checkSpace(cursor, 24);
  cursor.y -= 10;
  cursor.page.drawText("CONTROL DE CAMBIOS", {
    x: marginLeft,
    y: cursor.y,
    size: 9,
    font: fontBold,
    color: negro,
  });
  cursor.y -= 14;

  const dibujarFila = (
    celdasOriginales: [string, string, string],
    font: PDFFont,
    alturaMin: number,
  ) => {
    const celdas: [string, string, string] = [
      sanearTextoPdf(celdasOriginales[0]),
      sanearTextoPdf(celdasOriginales[1]),
      sanearTextoPdf(celdasOriginales[2]),
    ];
    const lineasDesc = envolverTextoPlano(celdas[1], colDescW - padX * 2, fontSize, font);
    const altoFila = Math.max(alturaMin, lineasDesc.length * lineHeight + padY * 2);
    checkSpace(cursor, altoFila);

    const xRevision = marginLeft;
    const xDesc = marginLeft + colRevisionW;
    const xFecha = xDesc + colDescW;
    const filaTopY = cursor.y;

    cursor.page.drawRectangle({
      x: marginLeft,
      y: filaTopY - altoFila,
      width: contentWidth,
      height: altoFila,
      borderColor: negro,
      borderWidth: 1,
    });
    cursor.page.drawLine({
      start: { x: xDesc, y: filaTopY },
      end: { x: xDesc, y: filaTopY - altoFila },
      thickness: 1,
      color: negro,
    });
    cursor.page.drawLine({
      start: { x: xFecha, y: filaTopY },
      end: { x: xFecha, y: filaTopY - altoFila },
      thickness: 1,
      color: negro,
    });

    dibujarCentradoEncabezado(
      cursor.page,
      celdas[0],
      xRevision,
      colRevisionW,
      filaTopY - altoFila / 2 - 3,
      fontSize,
      font,
      negro,
    );
    lineasDesc.forEach((linea, idx) => {
      cursor.page.drawText(linea, {
        x: xDesc + padX,
        y: filaTopY - padY - (idx + 1) * lineHeight + 2,
        size: fontSize,
        font,
        color: negro,
      });
    });
    dibujarCentradoEncabezado(
      cursor.page,
      celdas[2],
      xFecha,
      colFechaW,
      filaTopY - altoFila / 2 - 3,
      fontSize,
      font,
      negro,
    );

    cursor.y -= altoFila;
  };

  dibujarFila(["Revisión", "Descripción del Cambio", "Fecha"], fontBold, 18);
  for (const rev of revisiones) {
    dibujarFila([rev.revision || "-", rev.descripcionCambio, rev.fecha], fontRegular, 16);
  }
}

// ===== Encabezado "formato oficial" (tabla logo / razón social / formato /
// página, y debajo título / revisión) — compartido por generarCartaPdf y
// generarFormatoOficialPdf, para que todos los documentos generados por el
// sistema tengan exactamente la misma cabecera. =====

const ENCABEZADO_ANCHO_LOGO = 70;
const ENCABEZADO_ANCHO_FORMATO = 95;
const ENCABEZADO_ANCHO_PAGINA = 95;
const ENCABEZADO_ANCHO_REVISION = 95;
const ENCABEZADO_ROW1_HEIGHT = 55;
const ENCABEZADO_ROW2_HEIGHT = 26;
const ENCABEZADO_ALTURA = ENCABEZADO_ROW1_HEIGHT + ENCABEZADO_ROW2_HEIGHT;

interface EncabezadoOficialConfig {
  marginLeft: number;
  contentWidth: number;
  headerTopY: number;
  logoImage: PDFImage;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  razonSocial: string;
  tituloDocumento: string;
  formatoCodigo: string;
  formatoCodigoSecundario?: string | null;
  revision?: string | null;
}

function dibujarCentradoEncabezado(
  page: PDFPage,
  texto: string,
  cellX: number,
  cellWidth: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const width = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: cellX + (cellWidth - width) / 2, y, size, font, color });
}

function dibujarBloqueCentradoEncabezado(
  page: PDFPage,
  lineas: { texto: string; size: number; font: PDFFont }[],
  cellX: number,
  cellWidth: number,
  cellTopY: number,
  cellHeight: number,
  color: ReturnType<typeof rgb>,
) {
  const lineHeight = 10;
  const bloqueAlto = lineas.length * lineHeight;
  let y = cellTopY - cellHeight / 2 + bloqueAlto / 2 - lineHeight * 0.8;
  for (const linea of lineas) {
    dibujarCentradoEncabezado(page, linea.texto, cellX, cellWidth, y, linea.size, linea.font, color);
    y -= lineHeight;
  }
}

function dibujarEncabezadoOficialPdf(
  page: PDFPage,
  config: EncabezadoOficialConfig,
  numeroPagina: number,
  totalPaginas: number,
) {
  const {
    marginLeft,
    contentWidth,
    headerTopY,
    logoImage,
    fontRegular,
    fontBold,
    razonSocial,
    tituloDocumento,
    formatoCodigo,
    formatoCodigoSecundario,
    revision,
  } = config;
  const negro = rgb(0.1, 0.1, 0.1);

  const anchoRazonSocial =
    contentWidth - ENCABEZADO_ANCHO_LOGO - ENCABEZADO_ANCHO_FORMATO - ENCABEZADO_ANCHO_PAGINA;
  const anchoTitulo = contentWidth - ENCABEZADO_ANCHO_REVISION;
  const xRazonSocial = marginLeft + ENCABEZADO_ANCHO_LOGO;
  const xFormato = xRazonSocial + anchoRazonSocial;
  const xPagina = xFormato + ENCABEZADO_ANCHO_FORMATO;
  const xRevision = marginLeft + anchoTitulo;

  page.drawRectangle({
    x: marginLeft,
    y: headerTopY - ENCABEZADO_ALTURA,
    width: contentWidth,
    height: ENCABEZADO_ALTURA,
    borderColor: negro,
    borderWidth: 1,
  });

  page.drawLine({
    start: { x: marginLeft, y: headerTopY - ENCABEZADO_ROW1_HEIGHT },
    end: { x: marginLeft + contentWidth, y: headerTopY - ENCABEZADO_ROW1_HEIGHT },
    thickness: 1,
    color: negro,
  });
  [xRazonSocial, xFormato, xPagina].forEach((x) => {
    page.drawLine({
      start: { x, y: headerTopY },
      end: { x, y: headerTopY - ENCABEZADO_ROW1_HEIGHT },
      thickness: 1,
      color: negro,
    });
  });
  page.drawLine({
    start: { x: xRevision, y: headerTopY - ENCABEZADO_ROW1_HEIGHT },
    end: { x: xRevision, y: headerTopY - ENCABEZADO_ALTURA },
    thickness: 1,
    color: negro,
  });

  const logoSize = 45;
  page.drawImage(logoImage, {
    x: marginLeft + (ENCABEZADO_ANCHO_LOGO - logoSize) / 2,
    y: headerTopY - ENCABEZADO_ROW1_HEIGHT + (ENCABEZADO_ROW1_HEIGHT - logoSize) / 2,
    width: logoSize,
    height: logoSize,
  });

  dibujarCentradoEncabezado(
    page,
    razonSocial,
    xRazonSocial,
    anchoRazonSocial,
    headerTopY - ENCABEZADO_ROW1_HEIGHT / 2 - 4,
    11,
    fontBold,
    negro,
  );

  dibujarBloqueCentradoEncabezado(
    page,
    [
      { texto: "FORMATO", size: 7, font: fontBold },
      { texto: formatoCodigo, size: 8, font: fontRegular },
      ...(formatoCodigoSecundario
        ? [{ texto: formatoCodigoSecundario, size: 8, font: fontRegular }]
        : []),
    ],
    xFormato,
    ENCABEZADO_ANCHO_FORMATO,
    headerTopY,
    ENCABEZADO_ROW1_HEIGHT,
    negro,
  );

  dibujarBloqueCentradoEncabezado(
    page,
    [
      { texto: "PAGINA No.", size: 7, font: fontBold },
      { texto: `${numeroPagina} de ${totalPaginas}`, size: 8, font: fontRegular },
    ],
    xPagina,
    ENCABEZADO_ANCHO_PAGINA,
    headerTopY,
    ENCABEZADO_ROW1_HEIGHT,
    negro,
  );

  page.drawText(tituloDocumento, {
    x: marginLeft + 8,
    y: headerTopY - ENCABEZADO_ROW1_HEIGHT - ENCABEZADO_ROW2_HEIGHT / 2 - 3,
    size: 10,
    font: fontBold,
    color: negro,
  });

  dibujarCentradoEncabezado(
    page,
    `REVISION ${revision || "-"}`,
    xRevision,
    ENCABEZADO_ANCHO_REVISION,
    headerTopY - ENCABEZADO_ROW1_HEIGHT - ENCABEZADO_ROW2_HEIGHT / 2 - 3,
    9,
    fontBold,
    negro,
  );
}

// ===== Carta formal simple (encabezado + fecha + destinatario + asunto +
// cuerpo) — usada por la Carta de Vinculación (botón "Ver Carta") y por
// cualquier plantilla descargable sin código de FORMATO propio. =====

export interface GenerarCartaPdfOpciones {
  /** Texto de la carta con los placeholders ya reemplazados por valores reales. */
  contenido: string;
  /** Línea de "Asunto:" que aparece antes del cuerpo, y título mostrado en el encabezado. */
  asunto: string;
  /** Nombre de la persona/empresa destinataria (bloque "Señor(a) / Nombre / Ciudad"). */
  destinatarioNombre: string;
  /** Nombre del archivo .pdf que se descarga/abre. */
  nombreArchivo: string;
  /** Razón social mostrada en el encabezado (por defecto CARTONERA NACIONAL S.A.). */
  membreteRazonSocial?: string;
  /** Código de FORMATO mostrado en el encabezado, si esta carta tiene uno asociado. */
  formatoCodigo?: string;
  /** Segunda línea de código de formato, opcional. */
  formatoCodigoSecundario?: string | null;
  /** Revisión mostrada en el encabezado, si aplica. */
  revision?: string | null;
  /** Historial de revisiones (tabla "CONTROL DE CAMBIOS"), se dibuja una
   * sola vez al final del documento. */
  revisiones?: RevisionDocumentoPdf[];
}

export async function generarCartaPdf({
  contenido,
  asunto,
  destinatarioNombre,
  nombreArchivo,
  membreteRazonSocial = "CARTONERA NACIONAL S.A.",
  formatoCodigo = "-",
  formatoCodigoSecundario,
  revision,
  revisiones = [],
}: GenerarCartaPdfOpciones): Promise<File> {
  const partes = clasificarBloquesTexto(contenido);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(nombreArchivo);
  const fontRegular = await pdfDoc.embedFont("Times-Roman");
  const fontBold = await pdfDoc.embedFont("Times-Bold");
  const helvetica = await pdfDoc.embedFont("Helvetica");
  const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");
  const negro = rgb(0.1, 0.1, 0.1);
  const gris = rgb(0.35, 0.35, 0.35);

  const logoBytes = await fetch("/logo.jpg").then((r) => r.arrayBuffer());
  const logoImage = await pdfDoc.embedJpg(logoBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 50;
  const marginRight = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const fontSizeBody = 11.5;

  const headerTopY = pageHeight - marginTop;
  const bodyTopY = headerTopY - ENCABEZADO_ALTURA - 24;

  const paginas: PDFPage[] = [];
  const nuevaPagina = (): PDFPage => {
    const pagina = pdfDoc.addPage([pageWidth, pageHeight]);
    paginas.push(pagina);
    return pagina;
  };

  const cursor: CursorPdf = { page: nuevaPagina(), y: bodyTopY };

  const checkSpace = (c: CursorPdf, needed: number) => {
    if (c.y - needed < marginBottom) {
      c.page = nuevaPagina();
      c.y = bodyTopY;
    }
  };

  // Fecha
  const fechaCarta = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fechaTexto = `Bogotá D.C., ${fechaCarta}`;
  const fechaWidth = fontRegular.widthOfTextAtSize(fechaTexto, 11);
  cursor.page.drawText(fechaTexto, {
    x: marginLeft + contentWidth - fechaWidth,
    y: cursor.y,
    size: 11,
    font: fontRegular,
    color: negro,
  });
  cursor.y -= 26;

  // Destinatario
  cursor.page.drawText("Señor(a)", {
    x: marginLeft,
    y: cursor.y,
    size: fontSizeBody,
    font: fontRegular,
    color: negro,
  });
  cursor.y -= 15;
  cursor.page.drawText(destinatarioNombre || "-", {
    x: marginLeft,
    y: cursor.y,
    size: fontSizeBody,
    font: fontBold,
    color: negro,
  });
  cursor.y -= 15;
  cursor.page.drawText("Ciudad", {
    x: marginLeft,
    y: cursor.y,
    size: fontSizeBody,
    font: fontRegular,
    color: negro,
  });
  cursor.y -= 24;

  // Asunto (etiqueta en negrita + texto normal)
  const palabrasAsunto: PalabraPdf[] = [
    { texto: "Asunto:", bold: true },
    ...asunto
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ texto: t, bold: false })),
  ];
  const lineasAsunto = envolverPalabrasPdf(
    palabrasAsunto,
    contentWidth,
    fontSizeBody,
    fontRegular,
    fontBold,
  );
  lineasAsunto.forEach((linea) => {
    checkSpace(cursor, 17);
    dibujarLineaMixtaPdf(
      cursor.page,
      linea,
      marginLeft,
      cursor.y,
      contentWidth,
      fontSizeBody,
      fontRegular,
      fontBold,
      negro,
      false,
    );
    cursor.y -= 17;
  });
  cursor.y -= 10;

  // Cuerpo
  const estilo: EstiloCuerpoPdf = {
    marginLeft,
    contentWidth,
    fontSizeBody,
    fontRegular,
    fontBold,
    color: negro,
    lineHeightParrafo: 18,
    lineHeightLista: 19,
    checkSpace,
  };
  dibujarBloquesPdf(cursor, estilo, partes);

  // Cierre
  checkSpace(cursor, 30);
  cursor.y -= 6;
  cursor.page.drawLine({
    start: { x: marginLeft, y: cursor.y },
    end: { x: marginLeft + contentWidth, y: cursor.y },
    thickness: 1,
    color: rgb(0.87, 0.87, 0.87),
  });
  cursor.y -= 14;
  const footerTexto = `Documento generado electrónicamente el ${fechaCarta} · Sistema de Vinculación Comercial`;
  const footerWidth = fontRegular.widthOfTextAtSize(footerTexto, 8.5);
  cursor.page.drawText(footerTexto, {
    x: marginLeft + (contentWidth - footerWidth) / 2,
    y: cursor.y,
    size: 8.5,
    font: fontRegular,
    color: gris,
  });

  dibujarTablaRevisionesPdf(
    cursor,
    { marginLeft, contentWidth, fontRegular: helvetica, fontBold: helveticaBold, checkSpace },
    revisiones,
  );

  // Encabezado — el mismo componente que generarFormatoOficialPdf, en
  // todas las páginas, con la paginación real ya conocida.
  const totalPaginas = paginas.length;
  const encabezadoConfig: EncabezadoOficialConfig = {
    marginLeft,
    contentWidth,
    headerTopY,
    logoImage,
    fontRegular: helvetica,
    fontBold: helveticaBold,
    razonSocial: membreteRazonSocial,
    tituloDocumento: asunto,
    formatoCodigo,
    formatoCodigoSecundario,
    revision,
  };
  paginas.forEach((pagina, idx) => {
    dibujarEncabezadoOficialPdf(pagina, encabezadoConfig, idx + 1, totalPaginas);
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  return new File([blob], nombreArchivo, { type: "application/pdf" });
}

// ===== Formato oficial (mismo encabezado, título/revisión propios del
// tipo de documento) — para documentos con plantilla de texto que
// configuren código de FORMATO/revisión reales. =====

export interface GenerarFormatoOficialPdfOpciones {
  /** Texto del documento con los placeholders ya reemplazados por valores reales. */
  contenido: string;
  /** Título mostrado en la barra bajo el encabezado (ej. "MANIFESTACIÓN SUSCRITA CLIENTES"). */
  tituloDocumento: string;
  /** Código de formato (ej. "F-P3-07"). */
  formatoCodigo: string;
  /** Segunda línea de código de formato, opcional (ej. "B_F-P3-07"). */
  formatoCodigoSecundario?: string | null;
  /** Revisión mostrada en la barra de título (ej. "01"). */
  revision?: string | null;
  /** Nombre del archivo .pdf que se descarga/abre. */
  nombreArchivo: string;
  /** Razón social mostrada en el encabezado. */
  razonSocial?: string;
  /** Historial de revisiones (tabla "CONTROL DE CAMBIOS"), se dibuja una
   * sola vez al final del documento. */
  revisiones?: RevisionDocumentoPdf[];
}

export async function generarFormatoOficialPdf({
  contenido,
  tituloDocumento,
  formatoCodigo,
  formatoCodigoSecundario,
  revision,
  nombreArchivo,
  razonSocial = "CARTONERA NACIONAL S.A.",
  revisiones = [],
}: GenerarFormatoOficialPdfOpciones): Promise<File> {
  const partes = clasificarBloquesTexto(contenido);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(nombreArchivo);
  const helvetica = await pdfDoc.embedFont("Helvetica");
  const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");
  const negro = rgb(0.1, 0.1, 0.1);

  const logoBytes = await fetch("/logo.jpg").then((r) => r.arrayBuffer());
  const logoImage = await pdfDoc.embedJpg(logoBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 50;
  const marginRight = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const fontSizeBody = 10;

  const headerTopY = pageHeight - marginTop;
  const bodyTopY = headerTopY - ENCABEZADO_ALTURA - 24;

  const paginas: PDFPage[] = [];
  const nuevaPagina = (): PDFPage => {
    const pagina = pdfDoc.addPage([pageWidth, pageHeight]);
    paginas.push(pagina);
    return pagina;
  };

  const cursor: CursorPdf = { page: nuevaPagina(), y: bodyTopY };

  const checkSpace = (c: CursorPdf, needed: number) => {
    if (c.y - needed < marginBottom) {
      c.page = nuevaPagina();
      c.y = bodyTopY;
    }
  };

  const estilo: EstiloCuerpoPdf = {
    marginLeft,
    contentWidth,
    fontSizeBody,
    fontRegular: helvetica,
    fontBold: helveticaBold,
    color: negro,
    lineHeightParrafo: 15,
    lineHeightLista: 16,
    checkSpace,
  };
  dibujarBloquesPdf(cursor, estilo, partes);

  dibujarTablaRevisionesPdf(
    cursor,
    { marginLeft, contentWidth, fontRegular: helvetica, fontBold: helveticaBold, checkSpace },
    revisiones,
  );

  // El encabezado se dibuja al final, una vez que se sabe el total real de
  // páginas que ocupó el cuerpo — "PAGINA No. X de N" refleja la
  // paginación real generada, no un valor fijo configurado de antemano.
  const totalPaginas = paginas.length;
  const encabezadoConfig: EncabezadoOficialConfig = {
    marginLeft,
    contentWidth,
    headerTopY,
    logoImage,
    fontRegular: helvetica,
    fontBold: helveticaBold,
    razonSocial,
    tituloDocumento,
    formatoCodigo,
    formatoCodigoSecundario,
    revision,
  };
  paginas.forEach((pagina, idx) => {
    dibujarEncabezadoOficialPdf(pagina, encabezadoConfig, idx + 1, totalPaginas);
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  return new File([blob], nombreArchivo, { type: "application/pdf" });
}

export interface GenerarPlantillaDocumentoOpciones {
  tdoNombre: string;
  tdoPlantillaContenido: string;
  clienteNombre?: string | null;
  clienteNit?: string | null;
  numeroSolicitud?: string | null;
  representanteLegalNombre?: string | null;
  representanteLegalCedula?: string | null;
  formatoCodigo?: string | null;
  formatoCodigoSecundario?: string | null;
  revision?: string | null;
  paginasTotal?: number | null;
  /** Respuestas resueltas por pregunta, para reemplazar los placeholders
   * agregados desde el selector de variables del formulario de tipos de
   * documento. Clave = "<seccion_id>|<fp_descripcion>" para preguntas
   * simples, o "<seccion_id>|<fp_descripcion>|col:<columna>" para una
   * columna de la primera fila de una pregunta tipo TABLA — ver
   * construirMapaRespuestasPregunta.
   *
   * Se identifica por sección+texto y no por fp_id porque "crear nueva
   * versión" del formulario clona cada pregunta como una fila NUEVA (fp_id
   * distinto) pero conserva seccion_id y fp_descripcion tal cual — un
   * placeholder anclado a fp_id se rompería en silencio (queda vacío) en
   * cuanto la solicitud se responde contra una versión más nueva. */
  respuestasPregunta?: Record<string, string>;
  /** Historial de revisiones (tabla "CONTROL DE CAMBIOS"), se dibuja una
   * sola vez al final del documento. */
  revisiones?: RevisionDocumentoPdf[];
}

export interface PreguntaRenderizadaParaPlantilla {
  fp_id: number;
  fp_tipo: string;
  fp_descripcion: string;
  /** Código lógico estable de la pregunta (sobrevive renames y versiones
   * nuevas) — ancla preferida de los placeholders {{pregunta|cod:...}}. */
  fp_codigo?: string | null;
  seccion_id: number;
  valor_resuelto: string;
  tabla_columnas?: string[];
  tabla_filas?: Record<string, string>[];
}

function clavePregunta(seccionId: number, descripcion: string): string {
  return `${seccionId}|${descripcion}`;
}

/**
 * Arma el mapa de sustitución a partir de la respuesta de
 * `/solicitudes/:id/formulario-renderizable`: una entrada por pregunta
 * simple, y una entrada por columna (de la primera fila) para preguntas
 * tipo TABLA — misma convención de "primera fila = principal" que ya usa
 * el resto del código para representante legal.
 */
export function construirMapaRespuestasPregunta(
  preguntas: PreguntaRenderizadaParaPlantilla[],
): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const p of preguntas) {
    // Ancla preferida: fp_codigo (estable ante renames y versiones nuevas).
    // Ancla legada: sección+texto — sigue registrándose para plantillas
    // viejas que aún usan ese formato.
    const claves = [clavePregunta(p.seccion_id, p.fp_descripcion)];
    if (p.fp_codigo) claves.unshift(`cod:${p.fp_codigo}`);
    for (const clave of claves) {
      // Si dos preguntas comparten ancla (dato duplicado, no debería
      // pasar pero ya se vio un caso real), gana la primera — igual
      // criterio "TOP 1" que ya usa crearNuevaVersion al emparejar por
      // descripción.
      if (!(clave in mapa)) mapa[clave] = p.valor_resuelto;
      if (p.fp_tipo === "TABLA" && p.tabla_columnas && p.tabla_filas?.[0]) {
        const primeraFila = p.tabla_filas[0];
        p.tabla_columnas.forEach((columna) => {
          const claveCol = `${clave}|col:${columna}`;
          if (!(claveCol in mapa)) mapa[claveCol] = primeraFila[columna] || "";
        });
      }
    }
  }
  return mapa;
}

/**
 * Sustituye los placeholders {{...}} de la plantilla de un tipo de
 * documento con los datos reales de la solicitud, y genera el PDF
 * reutilizando el mismo renderizador de carta formal. Usado tanto al
 * diligenciar el formulario (DocumentoTablaField) como desde Mis
 * Documentos para los documentos "diferidos" (que se generan después de
 * guardar la solicitud, porque necesitan el número de solicitud).
 */
export async function generarPlantillaDocumentoPdf({
  tdoNombre,
  tdoPlantillaContenido,
  clienteNombre,
  clienteNit,
  numeroSolicitud,
  representanteLegalNombre,
  representanteLegalCedula,
  formatoCodigo,
  formatoCodigoSecundario,
  revision,
  paginasTotal,
  respuestasPregunta,
  revisiones = [],
}: GenerarPlantillaDocumentoOpciones): Promise<File> {
  const reemplazos: Record<string, string> = {
    "{{cliente_nombre}}": clienteNombre || "",
    "{{cliente_nit}}": clienteNit || "",
    "{{numero_solicitud}}": numeroSolicitud || "",
    "{{representante_legal_nombre}}": representanteLegalNombre || "",
    "{{representante_legal_cedula}}": representanteLegalCedula || "",
  };
  const contenidoFijo = Object.entries(reemplazos).reduce(
    (texto, [placeholder, valor]) => texto.split(placeholder).join(valor),
    tdoPlantillaContenido,
  );
  // Variables dinámicas: cualquier pregunta del formulario (o, para
  // preguntas tipo TABLA, una columna puntual de su primera fila), elegida
  // desde el selector al editar la plantilla. Ancla preferida: fp_codigo
  // ({{pregunta|cod:REP_LEGAL_TABLA|col:...}}), estable ante renames y
  // versiones nuevas del formulario. Ancla legada: sección+texto
  // ({{pregunta|1012|REPRESENTANTE LEGAL PRINCIPAL|...}}), que se rompe si
  // renombran la pregunta. Un ancla que no matchea NINGUNA pregunta de la
  // solicitud es un error de configuración de la plantilla — se reporta
  // con error visible en vez de dejar el hueco en blanco en silencio (ya
  // pasó con un documento legal generado con el nombre vacío).
  const anclasRotas: string[] = [];
  const contenido = contenidoFijo.replace(
    /\{\{pregunta\|(?:cod:([A-Za-z0-9_-]+)|(\d+)\|([^|{}]*))(?:\|col:([^|{}]*))?\}\}/g,
    (
      match,
      codigo: string | undefined,
      seccionId: string | undefined,
      descripcion: string | undefined,
      columna?: string,
    ) => {
      const base = codigo ? `cod:${codigo}` : `${seccionId}|${descripcion}`;
      const clave = columna ? `${base}|col:${columna}` : base;
      const valor = respuestasPregunta?.[clave];
      if (valor === undefined) {
        anclasRotas.push(match);
        return "";
      }
      return valor;
    },
  );
  if (anclasRotas.length > 0) {
    throw new Error(
      `La plantilla "${tdoNombre}" referencia preguntas que ya no existen en el formulario de esta solicitud (probablemente fueron renombradas o eliminadas): ${anclasRotas.join(", ")}. Corrige las variables de la plantilla en Parametrización → Documentos.`,
    );
  }

  // Solo los documentos configurados con "páginas totales" usan el
  // encabezado de formato oficial (tabla con logo/código/revisión) — el
  // resto sigue con la carta simple de siempre, sin cambios.
  if (paginasTotal) {
    return generarFormatoOficialPdf({
      contenido,
      tituloDocumento: tdoNombre,
      formatoCodigo: formatoCodigo || "-",
      formatoCodigoSecundario,
      revision,
      nombreArchivo: `plantilla-${tdoNombre}.pdf`,
      revisiones,
    });
  }

  return generarCartaPdf({
    contenido,
    asunto: tdoNombre,
    destinatarioNombre: clienteNombre || "-",
    nombreArchivo: `plantilla-${tdoNombre}.pdf`,
    revisiones,
  });
}
