'use client';

import { useState } from 'react';
import { createOpcion } from '@/services/parametrizacion/opciones.service';
import { ConfirmModal } from '@/components/modals';

interface Props {
  fp_id: number;
  onSaved: () => void;
}

export default function OpcionForm({ fp_id, onSaved }: Props) {
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setShowConfirmModal(true);
  };

  const confirmarCreacion = async () => {
    setSaving(true);
    try {
      await createOpcion(fp_id, {
        fpo_valor: valor,
      });

      setValor('');
      setShowConfirmModal(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        className="border rounded px-3 py-2 w-full"
        placeholder="Nueva opción"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Agregar
      </button>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar creación"
        message={`¿Deseas agregar la opción "${valor.trim()}"?`}
        confirmText="Sí, agregar"
        cancelText="Cancelar"
        isLoading={saving}
        onConfirm={confirmarCreacion}
        onCancel={() => setShowConfirmModal(false)}
      />
    </form>
  );
}
