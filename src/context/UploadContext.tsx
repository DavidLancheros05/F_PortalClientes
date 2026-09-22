"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type UploadStatus = "idle" | "loading" | "success" | "error";

interface UploadContextType {
  isOpen: boolean;
  status: UploadStatus;
  title: string;
  message: string;
  startLoading: (message?: string) => void;
  showSuccess: (payload?: { title?: string; message?: string }) => void;
  showError: (payload?: { title?: string; message?: string }) => void;
  clear: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const clear = useCallback(() => {
    setStatus("idle");
    setTitle("");
    setMessage("");
  }, []);

  const startLoading = useCallback((nextMessage = "Subiendo archivo...") => {
    setStatus("loading");
    setTitle("Subiendo archivo");
    setMessage(nextMessage);
  }, []);

  const showSuccess = useCallback((payload?: { title?: string; message?: string }) => {
    setStatus("success");
    setTitle(payload?.title ?? "Archivo cargado");
    setMessage(payload?.message ?? "El archivo quedó listo.");
  }, []);

  const showError = useCallback((payload?: { title?: string; message?: string }) => {
    setStatus("error");
    setTitle(payload?.title ?? "No se pudo subir el archivo");
    setMessage(payload?.message ?? "Ocurrió un error al subir el archivo.");
  }, []);

  return (
    <UploadContext.Provider
      value={{
        isOpen: status !== "idle",
        status,
        title,
        message,
        startLoading,
        showSuccess,
        showError,
        clear,
      }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload debe usarse dentro de UploadProvider");
  }

  return context;
}
