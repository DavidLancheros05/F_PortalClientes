"use client";

import { AlertTriangle, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Los modales deben cubrir todo el viewport con position: fixed, pero un
// ancestro con backdrop-blur/filter/transform en el árbol de la página crea
// un containing block que rompe ese posicionamiento (ya pasó antes en este
// proyecto). Renderizar en un portal a document.body lo evita sin importar
// dónde se monte el modal. El check de `mounted` es necesario porque
// document no existe durante el render en servidor.
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
              }`}
            >
              <AlertCircle
                size={24}
                className={isDangerous ? "text-red-600" : "text-blue-600"}
              />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDangerous
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
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
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
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

export function LoadingModal({
  isOpen,
  message = "Cargando...",
}: LoadingModalProps) {
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
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
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
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Procesando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
