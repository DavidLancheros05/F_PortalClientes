'use client';

import { useState } from 'react';
import { createOpcion } from '@/services/parametrizacion/opciones.service';

interface Props {
  fp_id: number;
  onSaved: () => void;
}

export default function OpcionForm({ fp_id, onSaved }: Props) {
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor.trim()) return;

    setSaving(true);
    await createOpcion(fp_id, {
      fpo_valor: valor,
    });

    setValor('');
    setSaving(false);
    onSaved();
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
    </form>
  );
}
