"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/**
 * Toast no bloqueante para confirmaciones de éxito — reemplaza el patrón de
 * SuccessModal (modal centrado + click en "Aceptar") en las pantallas
 * rediseñadas (ver design_handoff_portal_rediseños/README.md). SuccessModal
 * se mantiene para el resto del portal; este componente es solo para las
 * pantallas que ya migraron al nuevo sistema visual.
 */
export function useToast(autoCloseDelay = 2600) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(msg);
      timerRef.current = setTimeout(() => setMessage(null), autoCloseDelay);
    },
    [autoCloseDelay],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { toastMessage: message, showToast };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        role="status"
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-[11px] bg-[#0f172a] px-[19px] py-3 text-[12.5px] font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.25)]"
        style={{ animation: "toast-in 180ms ease-out" }}
      >
        <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#34d399]" strokeWidth={2.6} />
        {message}
      </div>
    </>
  );
}
