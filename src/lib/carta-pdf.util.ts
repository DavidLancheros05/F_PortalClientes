// Renderizador compartido de "carta formal" en PDF (membrete, ciudad y
// fecha, destinatario, asunto, cuerpo justificado, cierre). Lo usan tanto
// la Carta de Vinculación como cualquier plantilla descargable de un tipo
// de documento — misma tipografía y misma lógica de justificado para que
// todos los documentos generados por el sistema se vean consistentes.
import html2pdf from "html2pdf.js";

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convierte el texto de una plantilla (con placeholders ya reemplazados)
 * en el HTML del cuerpo de la carta. Reglas:
 * - Bloques separados por línea en blanco = párrafos reales.
 * - Un bloque de una sola línea corta que termina en ":" = subtítulo de
 *   sección, en negrita, sin justificar.
 * - Un bloque de varias líneas (sin línea en blanco entre ellas) = lista
 *   de términos o bloque de firma — se muestra línea por línea, sin
 *   justificar (una carta formal nunca justifica listas ni firmas).
 * - Cualquier otro bloque es un párrafo de prosa real y sí se justifica.
 */
function construirCuerpoHtml(contenido: string): string {
  const bloques = contenido
    .split(/\n\s*\n/)
    .map((bloque) =>
      bloque
        .split("\n")
        .map((linea) => linea.trim())
        .filter(Boolean),
    )
    .filter((lineas) => lineas.length > 0);

  return bloques
    .map((lineas) => {
      if (lineas.length === 1) {
        const linea = escaparHtml(lineas[0]);
        const esSubtitulo = lineas[0].length <= 60 && lineas[0].endsWith(":");
        return esSubtitulo
          ? `<p class="carta-subtitulo">${linea}</p>`
          : `<p class="carta-parrafo">${linea}</p>`;
      }
      return `<p class="carta-lista">${lineas.map(escaparHtml).join("<br>")}</p>`;
    })
    .join("");
}

export interface GenerarCartaPdfOpciones {
  /** Texto de la carta con los placeholders ya reemplazados por valores reales. */
  contenido: string;
  /** Línea de "Asunto:" que aparece antes del cuerpo. */
  asunto: string;
  /** Nombre de la persona/empresa destinataria (bloque "Señor(a) / Nombre / Ciudad"). */
  destinatarioNombre: string;
  /** Nombre del archivo .pdf que se descarga/abre. */
  nombreArchivo: string;
  /** Nombre de la empresa en el membrete (por defecto CARTONERA NACIONAL S.A.). */
  membreteRazonSocial?: string;
  /** Línea pequeña bajo el nombre de la empresa en el membrete. */
  membreteLema?: string;
}

export async function generarCartaPdf({
  contenido,
  asunto,
  destinatarioNombre,
  nombreArchivo,
  membreteRazonSocial = "CARTONERA NACIONAL S.A.",
  membreteLema = "Vinculación Comercial",
}: GenerarCartaPdfOpciones): Promise<void> {
  const cuerpoHtml = construirCuerpoHtml(contenido);

  const fechaCarta = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          height: 100%;
        }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1a1a1a;
          background: white;
          font-size: 12.5pt;
        }
        .hoja {
          max-width: 720px;
          margin: 0 auto;
          padding: 50px 55px;
        }
        .membrete {
          text-align: center;
          padding-bottom: 14px;
          margin-bottom: 34px;
          border-bottom: 1px solid #999;
        }
        .membrete .razon-social {
          font-size: 15pt;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        .membrete .lema {
          margin-top: 3px;
          font-size: 9.5pt;
          color: #555;
          font-style: italic;
        }
        .fecha {
          text-align: right;
          margin-bottom: 26px;
          font-size: 11.5pt;
        }
        .destinatario {
          margin-bottom: 20px;
          font-size: 12pt;
          line-height: 1.4;
        }
        .destinatario .nombre {
          font-weight: bold;
        }
        .asunto {
          margin-bottom: 22px;
          font-size: 12pt;
        }
        .cuerpo {
          font-size: 12pt;
        }
        .carta-parrafo {
          text-align: justify;
          text-justify: inter-word;
          line-height: 1.65;
          margin-bottom: 14px;
        }
        .carta-subtitulo {
          font-weight: bold;
          margin: 22px 0 10px;
        }
        .carta-lista {
          margin-bottom: 16px;
          line-height: 1.75;
        }
        .cierre {
          margin-top: 10px;
          font-size: 9.5pt;
          color: #888;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        @media print {
          .hoja {
            padding: 25px 30px;
          }
        }
      </style>
    </head>
    <body>
      <div class="hoja">
        <div class="membrete">
          <div class="razon-social">${escaparHtml(membreteRazonSocial)}</div>
          <div class="lema">${escaparHtml(membreteLema)}</div>
        </div>

        <div class="fecha">Bogotá D.C., ${fechaCarta}</div>

        <div class="destinatario">
          Señor(a)<br>
          <span class="nombre">${escaparHtml(destinatarioNombre || "-")}</span><br>
          Ciudad
        </div>

        <div class="asunto">
          <strong>Asunto:</strong> ${escaparHtml(asunto)}
        </div>

        <div class="cuerpo">${cuerpoHtml}</div>
      </div>
      <div class="cierre">Documento generado electrónicamente el ${fechaCarta} · Sistema de Vinculación Comercial</div>
    </body>
    </html>
  `;

  const opt = {
    margin: 10,
    filename: nombreArchivo,
    image: { type: "png" as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: "portrait" as const, unit: "mm" as const, format: "a4" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] as any },
  };

  const pdf = html2pdf().set(opt).from(htmlContent);
  const pdfObj = await pdf.toPdf().get("pdf");
  const blob = pdfObj.output("blob");
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

  await generarCartaPdf({
    contenido,
    asunto: tdoNombre,
    destinatarioNombre: clienteNombre || "-",
    nombreArchivo: `plantilla-${tdoNombre}.pdf`,
  });
}
