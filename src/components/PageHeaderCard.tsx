"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderCardProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

// Encabezado estándar de las pantallas de listado/gestión: tarjeta con
// gradiente de marca, botón volver, icono y título — con un slot opcional
// debajo (filtros, etc.) separado por border-top. Ver
// gestion-ejecutivo-negocios/page.tsx para el origen de este patrón.
export function PageHeaderCard({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  onBack,
  actions,
  children,
}: PageHeaderCardProps) {
  return (
    <div className="bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] mb-4">
      {/* overflow-hidden vive en el header (no en la tarjeta completa) a
          propósito: recorta las esquinas del degradado, pero sin cortar
          contenido que se desborda desde `children` (ej. desplegables de
          autocompletar en los filtros) como pasaba antes. */}
      <div className="bg-[linear-gradient(120deg,#003d99_0%,#0050c7_100%)] rounded-t-[22px] overflow-hidden px-7 py-[22px] flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-[34px] h-[34px] rounded-[10px] bg-white/14 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2.3} />
        </button>
        <div className="w-[42px] h-[42px] rounded-xl bg-white/16 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#c3d5f5] mb-0.5">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>

      {children && (
        <div className="px-7 py-5 border-t border-[#eef1f6]">{children}</div>
      )}
    </div>
  );
}
