"use client";

import { AlertTriangle, AlertCircle, CheckCircle, XCircle, Loader2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

// Los modales deben cubrir todo el viewport con position: fixed, pero un
// ancestro con backdrop-blur/filter/transform en el árbol de la página crea
// un containing block que rompe ese posicionamiento (ya pasó antes en este
// proyecto). Renderizar en un portal a document.body lo evita sin importar
// dónde se monte el modal. El check de `mounted` es necesario porque
// document no existe durante el render en servidor.
export function ModalPortal({ children }: { children: React.ReactNode }) {
  // Antes esto usaba useEffect para setear `mounted`, lo que forzaba un
  // primer render invisible y un segundo render (tras el efecto) cada vez
  // que un modal se abría — el modal tardaba un ciclo extra en aparecer,
  // más notorio en páginas con varios componentes re-renderizando a la vez.
  // El estado inicial perezoso resuelve `document` una sola vez en el
  // primer render del cliente, sin esperar al efecto.
  const [mounted] = useState(() => typeof document !== "undefined");
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                isDangerous ? "bg-red-100" : "bg-blue-100"
              }`}>
              <AlertCircle size={24} className={isDangerous ? "text-red-600" : "text-blue-600"} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDangerous ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}>
              {isLoading ? "Procesando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function SuccessModal({
  isOpen,
  title,
  message,
  actionText = "Aceptar",
  onAction,
  autoClose = false,
  autoCloseDelay = 3000,
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoClose && onAction) {
      const timer = setTimeout(() => {
        onAction();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onAction]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

            <button
              onClick={onAction}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingModal({ isOpen, message = "Cargando..." }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center">
            <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
            <p className="text-gray-700 font-medium">{message}</p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  actionText?: string;
  onAction: () => void;
}

export function ErrorModal({
  isOpen,
  title = "Ocurrió un error",
  message,
  actionText = "Cerrar",
  onAction,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex flex-col items-center text-center">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
            <button
              onClick={onAction}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
              {actionText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface WarningModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function WarningModal({
  isOpen,
  title = "Advertencia",
  message,
  confirmText = "Continuar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  isLoading = false,
}: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Procesando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

interface InfoModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionText?: string;
  onClose: () => void;
}

// Modal informativo genérico — para texto explicativo que antes vivía
// suelto en la página (ej. detrás de un ícono de información en un header).
export function InfoModal({ isOpen, title, message, actionText = "Entendido", onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Info size={24} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {actionText}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

export interface DetalleCampo {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

interface DetalleModalProps {
  icon: LucideIcon;
  titulo: string;
  subtitulo?: string;
  loading?: boolean;
  error?: string | null;
  campos: DetalleCampo[];
  onClose: () => void;
  onEdit?: () => void;
  editText?: string;
  closeText?: string;
  editDisabled?: boolean;
  maxWidthClassName?: string;
}

// Modal genérico de "detalle": header con ícono/título/subtítulo, grid de
// campos de solo lectura y footer con Cerrar/Editar. Es puramente
// presentacional — la carga de datos (loading/error/campos) la resuelve
// quien lo usa, así sirve para el detalle de cualquier entidad.
export function DetalleModal({
  icon: Icon,
  titulo,
  subtitulo,
  loading = false,
  error = null,
  campos,
  onClose,
  onEdit,
  editText = "Editar",
  closeText = "Cerrar",
  editDisabled = false,
  maxWidthClassName = "max-w-4xl",
}: DetalleModalProps) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div
          className={`bg-white rounded-[22px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] w-full ${maxWidthClassName} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95`}>
          <div className="bg-brand-gradient rounded-t-[22px] overflow-hidden px-7 py-[22px] flex items-center gap-4 flex-shrink-0">
            <div className="w-[42px] h-[42px] rounded-xl bg-white/16 flex items-center justify-center flex-shrink-0">
              <Icon size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0 truncate">{titulo}</h2>
              {subtitulo && <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">{subtitulo}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/14 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors">
              <X size={16} strokeWidth={2.3} />
            </button>
          </div>

          <div className="p-7 overflow-y-auto flex-1">
            {error ? (
              <p className="text-red-600 text-center py-8">{error}</p>
            ) : loading ? (
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={i === 3 ? "md:col-span-2" : ""}>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-11 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {campos.map((campo, i) => (
                  <div key={i} className={campo.fullWidth ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {campo.icon && <campo.icon className="w-4 h-4" />}
                      {campo.label}
                    </label>
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900">
                      {campo.value ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onEdit && (
            <div className="flex gap-3 justify-end px-7 py-5 border-t border-[#eef1f6] flex-shrink-0">
              <button
                onClick={onEdit}
                disabled={loading || !!error || editDisabled}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors disabled:opacity-50 shadow-[0_6px_16px_rgba(0,61,153,0.22)]">
                {editText}
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
