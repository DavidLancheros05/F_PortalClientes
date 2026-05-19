"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { modulosManagementService } from "@/services/modulos.service";

interface SubModulo {
  nombre: string;
  ruta: string;
}

interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

const CrearModuloPage = () => {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ruta, setRuta] = useState("");
  const [subModulos, setSubModulos] = useState<SubModulo[]>([]);
  const [permisos, setPermisos] = useState<Permisos>({
    ver: true,
    crear: false,
    editar: false,
    eliminar: false,
    aprobar: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSubModulo = () => {
    setSubModulos([...subModulos, { nombre: "", ruta: "" }]);
  };

  const handleSubModuloChange = (index: number, field: keyof SubModulo, value: string) => {
    const newSubs = [...subModulos];
    newSubs[index][field] = value;
    setSubModulos(newSubs);
  };

  const handleRemoveSubModulo = (index: number) => {
    const newSubs = [...subModulos];
    newSubs.splice(index, 1);
    setSubModulos(newSubs);
  };

  const handlePermisoChange = (perm: keyof Permisos) => {
    setPermisos({ ...permisos, [perm]: !permisos[perm] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await modulosManagementService.createModulo({
        nombre,
        ruta,
        padre_id: null,
        icono: "",
        orden: 1,
      });

      router.push("/modulos");
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#003366] bg-clip-text text-transparent bg-gradient-to-r from-[#003366] to-[#0072C6]">
          Crear Nuevo Módulo
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Módulo principal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Pedidos"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
            <input
              type="text"
              placeholder="Ej: /pedidos"
              value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          {/* Permisos */}
          <div>
            <p className="font-semibold text-gray-700 mb-2">Permisos</p>
            <div className="flex flex-wrap gap-4">
              {Object.keys(permisos).map((perm) => (
                <label key={perm} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={permisos[perm as keyof Permisos]}
                    onChange={() => handlePermisoChange(perm as keyof Permisos)}
                    className="h-4 w-4 text-[#0072C6] focus:ring-[#0072C6] border-gray-300 rounded"
                  />
                  <span className="text-gray-700 capitalize">{perm}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submódulos */}
          <div>
            <p className="font-semibold text-gray-700 mb-2">Submódulos</p>
            {subModulos.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={sub.nombre}
                  onChange={(e) => handleSubModuloChange(i, "nombre", e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-transparent outline-none transition-all duration-200"
                />
                <input
                  type="text"
                  placeholder="Ruta"
                  value={sub.ruta}
                  onChange={(e) => handleSubModuloChange(i, "ruta", e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#0072C6] focus:border-transparent outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSubModulo(i)}
                  className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
                >
                  Eliminar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSubModulo}
              className="px-4 py-2 bg-[#0072C6] text-white rounded-xl hover:bg-[#003366] transition"
            >
              Agregar Submódulo
            </button>
          </div>

          {/* Botón Crear */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-4 bg-gradient-to-r from-[#003366] to-[#0072C6] text-white font-semibold rounded-xl shadow-lg hover:scale-105 transform transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Módulo"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CrearModuloPage;
