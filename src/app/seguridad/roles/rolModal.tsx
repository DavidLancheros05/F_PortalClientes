"use client";

import React from "react";
import { X, Shield } from "lucide-react";
import RolFormBody from "./RolFormBody";

interface Props {
  rol?: any;
  onClose: () => void;
  onSave: (rol: any) => void;
}

export default function RolModal({ rol, onClose, onSave }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-gradient rounded-xl shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {rol ? "Editar Rol" : "Crear Nuevo Rol"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configura los permisos del rol seleccionando módulos
              </p>
            </div>
          </div>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <RolFormBody rol={rol} onCancel={onClose} onSave={onSave} />
        </div>
      </div>
    </div>
  );
}
