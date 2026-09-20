// Íconos de tipo de archivo estilo "documento con esquina doblada" — pedido
// explícito del usuario (quería algo reconocible como el ícono real de
// Excel/PDF, no un ícono abstracto de lucide-react tipo hoja/lupa).
// viewBox de 24 unidades (no 48) a propósito: a los ~20px que se renderizan
// en botones/celdas de tabla, un viewBox más chico hace que el texto "PDF"
// y el detalle de la esquina doblada se vean proporcionalmente más grandes
// y legibles — con 48 quedaban minúsculos e ilegibles.

export function ExcelIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 2h8l6 6v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="#E8F5E9"
        stroke="#1D6F42"
        strokeWidth="1"
      />
      <path d="M13 2v5a1 1 0 0 0 1 1h5" fill="none" stroke="#1D6F42" strokeWidth="1" />
      <rect x="4" y="13" width="16" height="8" rx="1.5" fill="#1D6F42" />
      <text
        x="12"
        y="19"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        XLS
      </text>
    </svg>
  );
}

export function PdfIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 2h8l6 6v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        fill="#FDECEA"
        stroke="#C0392B"
        strokeWidth="1"
      />
      <path d="M13 2v5a1 1 0 0 0 1 1h5" fill="none" stroke="#C0392B" strokeWidth="1" />
      <rect x="4" y="13" width="16" height="8" rx="1.5" fill="#C0392B" />
      <text
        x="12"
        y="19"
        textAnchor="middle"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        PDF
      </text>
    </svg>
  );
}
