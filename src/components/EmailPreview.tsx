import React from 'react';

interface EmailPreviewProps {
  asunto: string;
  cuerpo_html: string;
  destinatarios_to: string;
}

export function EmailPreview({ asunto, cuerpo_html, destinatarios_to }: EmailPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Encabezado estilo cliente de correo */}
      <div className="bg-gray-50 rounded-t-xl border border-gray-200 overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Para:</span> {destinatarios_to || 'usuario@ejemplo.com'}
            </p>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{asunto || '(Sin asunto)'}</h3>
        </div>

        {/* Cuerpo del email con estilos de email profesional */}
        <div className="bg-white px-6 py-6 border-b border-gray-200">
          <div
            className="email-body text-gray-800 leading-relaxed"
            style={{
              fontSize: '16px',
              lineHeight: '1.5',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: '#1f2937',
            }}
            dangerouslySetInnerHTML={{
              __html: cuerpo_html || '<p style="color: #9ca3af; font-style: italic;">Sin contenido</p>',
            }}
          />
        </div>

        {/* Footer estilo Gmail */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
          <p className="text-xs text-gray-500">
            Este es un preview de cómo se verá el correo. Los estilos pueden variar según el cliente de correo del usuario.
          </p>
        </div>
      </div>

      {/* Nota de estilos */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-800">
          <strong>Consejo:</strong> Incluye estilos inline en tu HTML para mejor compatibilidad. Los clientes de correo tienen soporte limitado para CSS externo.
        </p>
      </div>

      <style>{`
        .email-body p {
          margin: 0 0 16px 0;
        }
        .email-body p:last-child {
          margin-bottom: 0;
        }
        .email-body a {
          color: #2563eb;
          text-decoration: none;
        }
        .email-body a:hover {
          text-decoration: underline;
        }
        .email-body h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 16px 0;
          color: #111827;
        }
        .email-body h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 16px 0;
          color: #111827;
        }
        .email-body h3 {
          font-size: 18px;
          font-weight: bold;
          margin: 16px 0;
          color: #111827;
        }
        .email-body strong, .email-body b {
          font-weight: 600;
        }
        .email-body em, .email-body i {
          font-style: italic;
        }
        .email-body ul, .email-body ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .email-body li {
          margin: 8px 0;
        }
        .email-body table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        .email-body table th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          border: 1px solid #e5e7eb;
        }
        .email-body table td {
          padding: 12px;
          border: 1px solid #e5e7eb;
        }
        .email-body img {
          max-width: 100%;
          height: auto;
        }
        .email-body blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 16px;
          margin: 16px 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
