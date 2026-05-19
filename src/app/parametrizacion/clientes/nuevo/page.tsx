"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientesService } from "@/services/clientes/clientes.service";
import {
  Building,
  FileText,
  MapPin,
  Phone,
  Mail,
  UserPlus,
  Save,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";

export default function NuevoClientePage() {
  const router = useRouter();
  const [tiposIdentificacion, setTiposIdentificacion] = useState<
    Array<{ codigo: string; nombre: string }>
  >([]);
  const [loadingTiposIdentificacion, setLoadingTiposIdentificacion] =
    useState(true);
  const [centros, setCentros] = useState<Array<{ id: number; nombre: string }>>(
    [],
  );
  const [centroOperacionIds, setCentroOperacionIds] = useState<number[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(true);
  const [razonSocial, setRazonSocial] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [habilita_acceso, setHabilitaAcceso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingCentros(true);
        setLoadingTiposIdentificacion(true);

        const [tiposData, centrosData] = await Promise.all([
          clientesService.getTiposIdentificacion(),
          clientesService.getAllCentrosOperacion(),
        ]);

        const tipos = Array.isArray(tiposData) ? tiposData : [];
        setCentros(Array.isArray(centrosData) ? centrosData : []);
        setTiposIdentificacion(tipos);
        if (!tipoIdentificacion && tipos.length > 0) {
          setTipoIdentificacion(String(tipos[0].codigo));
        }
      } catch (err: any) {
        setError(
          (prev) =>
            prev ||
            err?.message ||
            "Error cargando datos de configuración del formulario",
        );
      } finally {
        setLoadingCentros(false);
        setLoadingTiposIdentificacion(false);
      }
    };

    loadData();
  }, []);

  const toggleCentro = (centroId: number) => {
    setCentroOperacionIds((prev) =>
      prev.includes(centroId)
        ? prev.filter((id) => id !== centroId)
        : [...prev, centroId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await clientesService.create({
        razonSocial,
        tipoIdentificacion,
        nit,
        direccion,
        telefono,
        correo,
        habilita_acceso,
        centroOperacionIds,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/clientes");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Error creando cliente");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Nuevo Cliente
              </h1>
              <p className="text-gray-600 mt-2">
                Crea un nuevo cliente en el sistema
              </p>
            </div>

            <div className="p-3 bg-blue-100 rounded-xl">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center text-white">
              <UserPlus className="w-6 h-6 mr-3" />
              <div>
                <h2 className="text-xl font-semibold">
                  Información del Cliente
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Complete todos los campos requeridos
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-800">
                    ¡Cliente creado exitosamente!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Redirigiendo a la lista de clientes...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-6">
              {/* Razón Social */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Razón Social *
                  </div>
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Ej: Empresa S.A."
                  disabled={loading || success}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Nombre legal completo de la empresa
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Tipo de identificación *
                    </div>
                  </label>
                  <select
                    value={tipoIdentificacion}
                    onChange={(e) => setTipoIdentificacion(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={loading || success || loadingTiposIdentificacion}
                  >
                    <option value="">Selecciona tipo</option>
                    {tiposIdentificacion.map((tipo) => (
                      <option key={tipo.codigo} value={tipo.codigo}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NIT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      NIT / Identificación *
                    </div>
                  </label>
                  <input
                    type="text"
                    value={nit}
                    onChange={(e) => setNit(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ej: 123456789-0"
                    disabled={loading || success}
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Teléfono *
                    </div>
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Ej: 3001234567"
                    disabled={loading || success}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Correo *
                    </div>
                  </label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="correo@empresa.com"
                    disabled={loading || success}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Dirección *
                  </div>
                </label>
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="Dirección completa de la empresa"
                  disabled={loading || success}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Centros de Operación
                </label>
                <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 max-h-56 overflow-y-auto space-y-2">
                  {loadingCentros ? (
                    <p className="text-sm text-gray-500">Cargando centros...</p>
                  ) : centros.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No hay centros de operación disponibles
                    </p>
                  ) : (
                    centros.map((centro) => (
                      <label
                        key={centro.id}
                        className="flex items-center gap-3 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={centroOperacionIds.includes(centro.id)}
                          onChange={() => toggleCentro(centro.id)}
                          disabled={loading || success}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span>{centro.nombre}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Puedes asociar el cliente a uno o varios centros.
                </p>
              </div>

              {/* Habilitar Acceso */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="habilita_acceso"
                    checked={habilita_acceso}
                    onChange={(e) => setHabilitaAcceso(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={loading || success}
                  />
                  <label
                    htmlFor="habilita_acceso"
                    className="ml-3 flex items-center"
                  >
                    <Shield className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Habilitar acceso al portal cliente
                    </span>
                  </label>
                </div>
                <p className="mt-2 ml-7 text-sm text-gray-500">
                  Al habilitar esta opción, el cliente podrá acceder al sistema
                  con credenciales específicas
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                disabled={loading || success}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    ¡Creado!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Crear Cliente
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Information Card */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Información importante
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Los campos marcados con * son obligatorios
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  El NIT debe ser único para cada cliente
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Puede habilitar el acceso al portal después de crear el
                  cliente
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  El tipo de identificación se carga dinámicamente desde
                  parametrización
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
