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

type ParteTexto =
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; lineas: string[] }
  | { tipo: "vineta"; label: string; resto: string };

function clasificarBloquesTexto(contenido: string): ParteTexto[] {
  const bloques = contenido
    .split(/\n\s*\n/)
    .map((bloque) =>
      bloque
        .split("\n")
        .map((linea) => linea.trim())
        .filter(Boolean),
    )
    .filter((lineas) => lineas.length > 0);

  const partes: ParteTexto[] = [];

  for (const lineas of bloques) {
    if (esBloqueVineta(lineas)) {
      const [primera, ...resto] = lineas;
      partes.push({ tipo: "vineta", label: primera, resto: resto.join(" ") });
      continue;
    }
    if (lineas.length === 1) {
      const esSubtitulo = lineas[0].length <= 60 && lineas[0].endsWith(":");
      if (esSubtitulo) {
        partes.push({ tipo: "subtitulo", texto: lineas[0] });
      } else {
        partes.push({ tipo: "parrafo", texto: lineas[0] });
      }
    } else {
      partes.push({ tipo: "lista", lineas });
    }
  }

  return partes;
}

// ===== Primitivas de dibujo de texto con palabras mixtas negrita/regular =====

interface PalabraPdf {
  texto: string;
  bold: boolean;
}

// Envuelve una secuencia de palabras (algunas en negrita) en líneas que no
// superen maxWidth, midiendo cada palabra con su propia fuente.
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
    const anchoPalabra = font.widthOfTextAtSize(palabra.texto, fontSize);
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
      page.drawText(palabra.texto, { x: cursorX, y, size: fontSize, font, color });
      cursorX += font.widthOfTextAtSize(palabra.texto, fontSize) + spaceWidth;
    }
    return;
  }

  const anchoNatural =
    palabras.reduce(
      (suma, p) =>
        suma + (p.bold ? fontBold : fontRegular).widthOfTextAtSize(p.texto, fontSize),
      0,
    ) +
    spaceWidth * (palabras.length - 1);
  const espacioExtra = Math.max(0, maxWidth - anchoNatural);
  const espacioPorHueco = espacioExtra / (palabras.length - 1);

  let cursorX = x;
  palabras.forEach((palabra) => {
    const font = palabra.bold ? fontBold : fontRegular;
    page.drawText(palabra.texto, { x: cursorX, y, size: fontSize, font, color });
    cursorX +=
      font.widthOfTextAtSize(palabra.texto, fontSize) + spaceWidth + espacioPorHueco;
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
  const palabras: PalabraPdf[] = texto
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ({ texto: t, bold: false }));
  const lineas = envolverPalabrasPdf(
    palabras,
    estilo.contentWidth,
    estilo.fontSizeBody,
    estilo.fontRegular,
    estilo.fontBold,
  );
  lineas.forEach((lineaPalabras, idx) => {
    estilo.checkSpace(cursor, estilo.lineHeightParrafo);
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
    cursor.y -= estilo.lineHeightParrafo;
  });
  cursor.y -= 10;
}

function dibujarSubtituloPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, texto: string) {
  estilo.checkSpace(cursor, estilo.fontSizeBody + 14);
  cursor.y -= 14;
  cursor.page.drawText(texto, {
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
    const palabras: PalabraPdf[] = linea
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ texto: t, bold: false }));
    const subLineas = envolverPalabrasPdf(
      palabras,
      estilo.contentWidth,
      estilo.fontSizeBody,
      estilo.fontRegular,
      estilo.fontBold,
    );
    subLineas.forEach((subLinea) => {
      estilo.checkSpace(cursor, estilo.lineHeightLista);
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
      cursor.y -= estilo.lineHeightLista;
    });
  }
  cursor.y -= 12;
}

function dibujarVinetaPdf(
  cursor: CursorPdf,
  estilo: EstiloCuerpoPdf,
  label: string,
  resto: string,
) {
  const indent = 14;
  const maxWidth = estilo.contentWidth - indent;
  const palabras: PalabraPdf[] = [
    ...label
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ texto: t, bold: true })),
    ...resto
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ texto: t, bold: false })),
  ];
  const lineas = envolverPalabrasPdf(
    palabras,
    maxWidth,
    estilo.fontSizeBody,
    estilo.fontRegular,
    estilo.fontBold,
  );
  lineas.forEach((lineaPalabras, idx) => {
    estilo.checkSpace(cursor, estilo.lineHeightParrafo);
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
    cursor.y -= estilo.lineHeightParrafo;
  });
  cursor.y -= 10;
}

function dibujarBloquesPdf(cursor: CursorPdf, estilo: EstiloCuerpoPdf, partes: ParteTexto[]) {
  for (const parte of partes) {
    if (parte.tipo === "subtitulo") dibujarSubtituloPdf(cursor, estilo, parte.texto);
    else if (parte.tipo === "parrafo") dibujarParrafoPdf(cursor, estilo, parte.texto);
    else if (parte.tipo === "lista") dibujarListaPdf(cursor, estilo, parte.lineas);
    else dibujarVinetaPdf(cursor, estilo, parte.label, parte.resto);
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
}: GenerarCartaPdfOpciones): Promise<void> {
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
}

export async function generarFormatoOficialPdf({
  contenido,
  tituloDocumento,
  formatoCodigo,
  formatoCodigoSecundario,
  revision,
  nombreArchivo,
  razonSocial = "CARTONERA NACIONAL S.A.",
}: GenerarFormatoOficialPdfOpciones): Promise<void> {
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
}: GenerarPlantillaDocumentoOpciones): Promise<void> {
  const reemplazos: Record<string, string> = {
    "{{cliente_nombre}}": clienteNombre || "",
    "{{cliente_nit}}": clienteNit || "",
    "{{numero_solicitud}}": numeroSolicitud || "",
    "{{representante_legal_nombre}}": representanteLegalNombre || "",
    "{{representante_legal_cedula}}": representanteLegalCedula || "",
  };
  const contenido = Object.entries(reemplazos).reduce(
    (texto, [placeholder, valor]) => texto.split(placeholder).join(valor),
    tdoPlantillaContenido,
  );

  // Solo los documentos configurados con "páginas totales" usan el
  // encabezado de formato oficial (tabla con logo/código/revisión) — el
  // resto sigue con la carta simple de siempre, sin cambios.
  if (paginasTotal) {
    await generarFormatoOficialPdf({
      contenido,
      tituloDocumento: tdoNombre,
      formatoCodigo: formatoCodigo || "-",
      formatoCodigoSecundario,
      revision,
      nombreArchivo: `plantilla-${tdoNombre}.pdf`,
    });
    return;
  }

  await generarCartaPdf({
    contenido,
    asunto: tdoNombre,
    destinatarioNombre: clienteNombre || "-",
    nombreArchivo: `plantilla-${tdoNombre}.pdf`,
  });
}
