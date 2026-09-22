"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientesService } from "@/services/clientes/clientes.service";
import { maestrosService, type Pais, type Departamento, type Ciudad } from "@/services/maestros/maestros.service";
import { SuccessModal, ErrorModal, ConfirmModal } from "@/components/modals";
import { Building, FileText, MapPin, Phone, Mail, Save, CheckCircle, Loader2, Shield } from "lucide-react";
import { PageHeaderCard } from "@/components/PageHeaderCard";

type LocationOption = {
  id: number;
  name: string;
};

function LocationCombobox({
  label,
  placeholder,
  value,
  options,
  onChange,
  onQueryChange,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: LocationOption[];
  onChange: (option: LocationOption | null) => void;
  onQueryChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const filteredOptions = options.filter((option) =>
    option.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(normalizedValue),
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label} *</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onChange(null);
          onQueryChange(event.target.value);
          setIsOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition disabled:bg-gray-100"
      />
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                  {option.name}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">No hay coincidencias</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NuevoClientePage() {
  const router = useRouter();
  const [tiposIdentificacion, setTiposIdentificacion] = useState<Array<{ id: number; codigo: string; nombre: string }>>(
    [],
  );
  const [centros, setCentros] = useState<Array<{ id: number; nombre: string }>>([]);
  const [centro_operacion_ids, setCentroOperacionIds] = useState<number[]>([]);
  // Un solo flag: tipos de identificación y centros se piden en el mismo
  // Promise.all y siempre terminan de cargar juntos, así que dos estados
  // separados nunca podían diferir entre sí (código muerto redundante).
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [ejecutivos, setEjecutivos] = useState<Array<{ ejng_id: number; ejng_nombre: string }>>([]);
  const [ejecutivoId, setEjecutivoId] = useState<number>(0);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [paisId, setPaisId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(0);
  const [ciudadId, setCiudadId] = useState<number>(0);
  const [paisQuery, setPaisQuery] = useState("");
  const [departamentoQuery, setDepartamentoQuery] = useState("");
  const [ciudadQuery, setCiudadQuery] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState<number>(0);
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [habilita_acceso, setHabilitaAcceso] = useState(false);
  const [esDistribuidor, setEsDistribuidor] = useState(false);
  const [nitDigVf, setNitDigVf] = useState("");
  const [esExtranjero, setEsExtranjero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingCatalogos(true);

        const [tiposData, centrosData, ejecutivosData, paisesData] = await Promise.all([
          clientesService.getTiposIdentificacion(),
          clientesService.getAllCentrosOperacion(),
          clientesService.getEjecutivosNegocio(),
          maestrosService.getPaises(),
        ]);
        setPaises(Array.isArray(paisesData) ? paisesData : []);

        const tipos = Array.isArray(tiposData) ? tiposData : [];
        setCentros(Array.isArray(centrosData) ? centrosData.map((c) => ({ id: c.cop_id, nombre: c.cop_nombre })) : []);
        setEjecutivos(Array.isArray(ejecutivosData) ? ejecutivosData : []);
        setTiposIdentificacion(tipos);
        if (!tipoIdentificacion && tipos.length > 0) {
          setTipoIdentificacion(tipos[0].id);
        }
      } catch (err: any) {
        setError((prev) => prev || err?.message || "Error cargando datos de configuración del formulario");
      } finally {
        setLoadingCatalogos(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!paisId) {
      setDepartamentos([]);
      setDepartamentoId(0);
      setDepartamentoQuery("");
      setCiudadQuery("");
      return;
    }
    maestrosService
      .getDepartamentos(paisId)
      .then((data) => setDepartamentos(Array.isArray(data) ? data : []))
      .catch(() => setDepartamentos([]));
    setDepartamentoId(0);
    setDepartamentoQuery("");
    setCiudadId(0);
    setCiudadQuery("");
    setCiudades([]);
  }, [paisId]);

  useEffect(() => {
    if (!departamentoId) {
      setCiudades([]);
      setCiudadId(0);
      setCiudadQuery("");
      return;
    }
    maestrosService
      .getCiudades(departamentoId)
      .then((data) => setCiudades(Array.isArray(data) ? data : []))
      .catch(() => setCiudades([]));
    setCiudadId(0);
    setCiudadQuery("");
  }, [departamentoId]);

  const toggleCentro = (centroId: number) => {
    setCentroOperacionIds((prev) =>
      prev.includes(centroId) ? prev.filter((id) => id !== centroId) : [...prev, centroId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tipoIdentificacion || tipoIdentificacion <= 0) {
      setError("Debe seleccionar un tipo de identificación válido");
      return;
    }

    if (!ejecutivoId || ejecutivoId <= 0) {
      setError("Debe seleccionar un ejecutivo asignado");
      return;
    }

    if (!paisId || !departamentoId || !ciudadId) {
      setError("Debe seleccionar país, departamento y ciudad");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      await clientesService.create({
        razonSocial,
        tipoIdentificacion,
        nitDocumento: nit,
        direccion,
        correo,
        habilitaAcceso: habilita_acceso,
        esDistribuidor,
        nitDigVf: nitDigVf || undefined,
        esExtranjero,
        ejecutivoId,
        paisId,
        departamentoId,
        ciudadId,
        centro_operacion_ids,
      });

      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err: any) {
      setShowConfirmModal(false);
      setError(err?.response?.data?.message || err?.message || "Error creando cliente");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeaderCard
          icon={Building}
          eyebrow="Parametrización"
          title="Nuevo cliente"
          subtitle="Crea un nuevo cliente en el sistema"
          onBack={() => router.back()}
        />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <SuccessModal
            isOpen={success}
            title="¡Cliente creado exitosamente!"
            message="El cliente fue registrado correctamente."
            onAction={() => router.push("/parametrizacion/clientes/listado")}
          />

          <ErrorModal isOpen={!!error} message={error || ""} onAction={() => setError(null)} />

          <ConfirmModal
            isOpen={showConfirmModal}
            title="Confirmar creación"
            message="¿Estás seguro de que deseas crear este cliente?"
            confirmText="Sí, crear"
            cancelText="Cancelar"
            isLoading={loading}
            onConfirm={handleConfirmCreate}
            onCancel={() => setShowConfirmModal(false)}
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8">
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="Ej: Empresa S.A."
                  disabled={loading || success}
                />
                <p className="mt-1 text-sm text-gray-500">Nombre legal completo de la empresa</p>
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
                    onChange={(e) => setTipoIdentificacion(Number(e.target.value))}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    disabled={loading || success || loadingCatalogos}>
                    <option value="">Selecciona tipo</option>
                    {tiposIdentificacion.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  placeholder="Dirección completa de la empresa"
                  disabled={loading || success}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ejecutivo asignado *</label>
                  <select
                    value={ejecutivoId}
                    onChange={(e) => setEjecutivoId(Number(e.target.value))}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    disabled={loading || success}>
                    <option value={0}>Selecciona un ejecutivo</option>
                    {ejecutivos.map((ej) => (
                      <option key={ej.ejng_id} value={ej.ejng_id}>
                        {ej.ejng_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Habilitar Acceso */}
                <div className="p-4 bg-gray-50 rounded-lg border border-slate-200">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="habilita_acceso"
                      checked={habilita_acceso}
                      onChange={(e) => setHabilitaAcceso(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={loading || success}
                    />
                    <label htmlFor="habilita_acceso" className="ml-3 flex items-center">
                      <Shield className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Habilitar acceso al portal cliente</span>
                    </label>
                  </div>
                  <p className="mt-2 ml-7 text-sm text-gray-500">
                    Al habilitar esta opción, el cliente podrá acceder al sistema con credenciales específicas
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dígito Verificación NIT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dígito Verificación NIT</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={nitDigVf}
                    onChange={(e) => setNitDigVf(e.target.value.replace(/[^0-9kK]/g, ""))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    placeholder="Ej: K"
                    disabled={loading || success}
                  />
                </div>

                {/* Es Distribuidor */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="es_distribuidor"
                    checked={esDistribuidor}
                    onChange={(e) => setEsDistribuidor(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={loading || success}
                  />
                  <label htmlFor="es_distribuidor" className="ml-3 text-sm font-medium text-gray-700">
                    Cliente Distribuidor
                  </label>
                </div>

                {/* Es Extranjero */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="es_extranjero"
                    checked={esExtranjero}
                    onChange={(e) => setEsExtranjero(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={loading || success}
                  />
                  <label htmlFor="es_extranjero" className="ml-3 text-sm font-medium text-gray-700">
                    Cliente Extranjero
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LocationCombobox
                  label="País"
                  placeholder="Escribe para buscar un país"
                  value={paisQuery}
                  options={paises.map((pais) => ({
                    id: pais.pais_id,
                    name: pais.pais_nombre,
                  }))}
                  onQueryChange={setPaisQuery}
                  onChange={(option) => {
                    setPaisId(option?.id || 0);
                    setPaisQuery(option?.name || "");
                  }}
                  disabled={loading || success}
                />

                <LocationCombobox
                  label="Departamento"
                  placeholder="Escribe para buscar un departamento"
                  value={departamentoQuery}
                  options={departamentos.map((departamento) => ({
                    id: departamento.depto_id,
                    name: departamento.depto_nombre,
                  }))}
                  onQueryChange={setDepartamentoQuery}
                  onChange={(option) => {
                    setDepartamentoId(option?.id || 0);
                    setDepartamentoQuery(option?.name || "");
                  }}
                  disabled={loading || success || !paisId}
                />

                <LocationCombobox
                  label="Ciudad"
                  placeholder="Escribe para buscar una ciudad"
                  value={ciudadQuery}
                  options={ciudades.map((ciudad) => ({
                    id: ciudad.ciudad_id,
                    name: ciudad.ciudad_nombre,
                  }))}
                  onQueryChange={setCiudadQuery}
                  onChange={(option) => {
                    setCiudadId(option?.id || 0);
                    setCiudadQuery(option?.name || "");
                  }}
                  disabled={loading || success || !departamentoId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Centros de Operación</label>
                <div className="border border-slate-300 rounded-lg p-4 bg-gray-50 max-h-56 overflow-y-auto space-y-2">
                  {loadingCatalogos ? (
                    <p className="text-sm text-gray-500">Cargando centros...</p>
                  ) : centros.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay centros de operación disponibles</p>
                  ) : (
                    centros.map((centro) => (
                      <label key={centro.id} className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={centro_operacion_ids.includes(centro.id)}
                          onChange={() => toggleCentro(centro.id)}
                          disabled={loading || success}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span>{centro.nombre}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">Puedes asociar el cliente a uno o varios centros.</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                disabled={loading || success}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex items-center justify-center px-8 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-[0_6px_16px_rgba(0,61,153,0.22)] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="p-2 bg-[#eef3ff] rounded-lg">
                <Building className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Información importante</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-brand-600 mr-2">•</span>
                  Los campos marcados con * son obligatorios
                </li>
                <li className="flex items-start">
                  <span className="text-brand-600 mr-2">•</span>
                  El NIT debe ser único para cada cliente
                </li>
                <li className="flex items-start">
                  <span className="text-brand-600 mr-2">•</span>
                  Puede habilitar el acceso al portal después de crear el cliente
                </li>
                <li className="flex items-start">
                  <span className="text-brand-600 mr-2">•</span>
                  El tipo de identificación se carga dinámicamente desde parametrización
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
