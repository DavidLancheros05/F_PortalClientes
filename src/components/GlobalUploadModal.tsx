"use client";

import { ErrorModal, LoadingModal, SuccessModal } from "@/components/modals";
import { useUpload } from "@/context/UploadContext";

export function GlobalUploadModal() {
  const { status, title, message, clear } = useUpload();

  return (
    <>
      <LoadingModal isOpen={status === "loading"} message={message || "Subiendo archivo..."} />

      <SuccessModal
        isOpen={status === "success"}
        title={title || "Archivo cargado"}
        message={message || "El archivo quedó listo."}
        actionText="Aceptar"
        onAction={clear}
      />

      <ErrorModal
        isOpen={status === "error"}
        title={title || "No se pudo subir el archivo"}
        message={message || "Ocurrió un error al subir el archivo."}
        actionText="Cerrar"
        onAction={clear}
      />
    </>
  );
}
