"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Send, Loader } from "lucide-react";

interface Comentario {
  pc_id?: number;
  pc_comentario?: string;
  pc_usuario?: string;
  pc_fecha?: string;
  pc_es_interno?: boolean;
  id?: number;
  comentario?: string;
  usuario?: string;
  fecha?: string;
  es_interno?: boolean;
}

interface PQRSCommentsProps {
  comentarios: Comentario[];
  pqrsEstado: string | { pe_id: number; pe_nombre: string; pe_color?: string };
  pqrsId: number;
  onAddComentario: (comentario: string) => Promise<void>;
  usuarioNombre?: string;
}

export function PQRSComments({
  comentarios,
  pqrsEstado,
  pqrsId,
  onAddComentario,
  usuarioNombre,
}: PQRSCommentsProps) {
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comentarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;

    try {
      setEnviando(true);
      await onAddComentario(nuevoComentario);
      setNuevoComentario("");
    } catch (error) {
      console.error("Error enviando comentario:", error);
    } finally {
      setEnviando(false);
    }
  };

  const formatCommentDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "PPp", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getEstadoString = () => {
    if (typeof pqrsEstado === "string") return pqrsEstado || "";
    return pqrsEstado?.pe_nombre || "";
  };

  const estadoActual = getEstadoString();
  const estadoUpper = (estadoActual || "").toUpperCase();
  const canRespond = estadoUpper !== "CERRADA";

  return (
    <div className="space-y-6">
      {/* Comentarios existentes */}
      <div className="space-y-4">
        {comentarios && comentarios.length > 0 ? (
          comentarios.map((comentario, index) => {
            const key = comentario.pc_id || comentario.id || `temp-${index}-${comentario.pc_fecha || comentario.fecha || Date.now()}`;
            return (
            <div
              key={key}
              className="flex gap-4"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {(comentario.pc_usuario || comentario.usuario || "?")[0].toUpperCase()}
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {comentario.pc_usuario || comentario.usuario || "Usuario"}
                      </h4>
                      {comentario.pc_es_interno || comentario.es_interno && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          Interno
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatCommentDate(
                        comentario.pc_fecha || comentario.fecha
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comentario.pc_comentario || comentario.comentario}
                  </p>
                </div>
              </div>
            </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay comentarios aún</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Formulario de respuesta */}
      {canRespond ? (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tu respuesta
          </label>
          <div className="space-y-3">
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              rows={4}
              disabled={enviando}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {nuevoComentario.length} caracteres
              </span>
              <button
                type="submit"
                disabled={!nuevoComentario.trim() || enviando}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar respuesta
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-semibold">
              Esta PQRS está cerrada y no acepta más comentarios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
