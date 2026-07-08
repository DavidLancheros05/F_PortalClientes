"use client";
import { clientesService } from "@/services/clientes/clientes.service";
import { centrosOperacionService } from "@/services/centros-operacion/centros-operacion.service";
import {
  maestrosService,
  type Pais,
  type Departamento,
  type Ciudad,
} from "@/services/maestros/maestros.service";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  FileText,
  Loader2,
  MapPin,
  Mail,
  Save,
  User,
} from "lucide-react";
import { LoadingModal, ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const clienteId = useMemo(() => Number(params?.id), [params]);

  const [razonSocial, setRazonSocial] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState<number | undefined>(undefined);
  const [tiposIdentificacion, setTiposIdentificacion] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [nitDocumento, setNitDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [habilitaAcceso, setHabilitaAcceso] = useState(false);
  const [centros, setCentros] = useState<Array<{ id: number; nombre: string }>>(
    [],
  );
  const [centro_operacion_ids, setCentroOperacionIds] = useState<number[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Array<{ id: number; nombre: string }>>([]);
  const [ejecutivoId, setEjecutivoId] = useState<number | null>(null);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [paisId, setPaisId] = useState<number>(0);
  const [departamentoId, setDepartamentoId] = useState<number>(0);
  const [ciudadId, setCiudadId] = useState<number>(0);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTiposIdentificacion, setLoadingTiposIdentificacion] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleCentro = (centroId: number) => {
    setCentroOperacionIds((prev) =>
      prev.includes(centroId)
        ? prev.filter((id) => id !== centroId)
        : [...prev, centroId],
    );
  };

  useEffect(() => {
    const cargarCliente = async () => {
      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        setError("ID de cliente inválido");
        setLoadingInitial(false);
        return;
      }

      try {
        setLoadingInitial(true);
        setLoadingTiposIdentificacion(true);
        const [clienteData, centrosData, ejecutivosData, clienteCentrosData, paisesData] =
          await Promise.all([
            clientesService.getById(clienteId),
            centrosOperacionService.getAll(),
            clientesService.getEjecutivosNegocio(),
            clientesService.getCentrosOperacion(clienteId),
            maestrosService.getPaises(),
          ]);

        let tiposData: any[] = [];
        try {
          tiposData = await clientesService.getTiposIdentificacion();
        } catch (err) {
          console.warn("Error cargando tipos de identificación:", err);
        }

        setRazonSocial(clienteData.cli_razon_social || "");
        setTiposIdentificacion(tiposData || []);
        setTipoIdentificacion(
          clienteData.cli_tipo_identificacion != null
            ? Number(clienteData.cli_tipo_identificacion)
            : (tiposData?.[0]?.id ? Number(tiposData[0].id) : undefined),
        );
        setNitDocumento(clienteData.cli_nro_identificacion || "");
        setCorreo(clienteData.cli_correo || "");
        setDireccion(clienteData.cli_direccion || "");
        setHabilitaAcceso(Boolean(clienteData.cli_acceso_portal_clientes));
        setCentroOperacionIds(
          Array.isArray(clienteCentrosData)
            ? clienteCentrosData.map((c: any) => c.cop_id || c.id)
            : [],
        );
        setCentros(
          Array.isArray(centrosData)
            ? centrosData.map((c: any) => ({ id: c.cop_id, nombre: c.cop_nombre }))
            : [],
        );
        setEjecutivos(
          Array.isArray(ejecutivosData)
            ? ejecutivosData.map((e: any) => ({
                id: e.ejng_id,
                nombre: e.ejng_nombre,
              }))
            : [],
        );
        setEjecutivoId(clienteData.ejng_id || null);
        setPaises(Array.isArray(paisesData) ? paisesData : []);
        setPaisId(clienteData.pai_id || 0);
        setDepartamentoId(clienteData.dpto_id || 0);
        setCiudadId(clienteData.ciu_id || 0);
      } catch (err: any) {
        setError(err?.message || "Error cargando cliente");
      } finally {
        setLoadingInitial(false);
        setLoadingTiposIdentificacion(false);
      }
    };

    cargarCliente();
  }, [clienteId]);

  // Solo carga las opciones; el reseteo de departamento/ciudad ocurre en el
  // onChange del select (interacción real del usuario), no aquí. Si se
  // reseteara aquí, la hidratación inicial desde los datos del cliente
  // (paisId 0 -> valor cargado) también dispararía el reset y perdería la
  // selección guardada de departamento/ciudad.
  useEffect(() => {
    if (!paisId) {
      setDepartamentos([]);
      return;
    }
    maestrosService
      .getDepartamentos(paisId)
      .then((data) => setDepartamentos(Array.isArray(data) ? data : []))
      .catch(() => setDepartamentos([]));
  }, [paisId]);

  useEffect(() => {
    if (!departamentoId) {
      setCiudades([]);
      return;
    }
    maestrosService
      .getCiudades(departamentoId)
      .then((data) => setCiudades(Array.isArray(data) ? data : []))
      .catch(() => setCiudades([]));
  }, [departamentoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paisId || !departamentoId || !ciudadId) {
      setError("Debe seleccionar país, departamento y ciudad");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await clientesService.update(clienteId, {
        razonSocial,
        tipoIdentificacion,
        nitDocumento,
        correo,
        direccion,
        habilitaAcceso,
        centro_operacion_ids,
        ejecutivoId,
        paisId,
        departamentoId,
        ciudadId,
      });

      setShowConfirmModal(false);
      setSuccess(true);
      setTimeout(() => router.push("/parametrizacion/clientes"), 1200);
    } catch (err: any) {
      setShowConfirmModal(false);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error actualizando cliente",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return <LoadingModal isOpen message="Cargando cliente..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/parametrizacion/clientes")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a clientes
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Editar Cliente
              </h1>
              <p className="text-gray-600 mt-2">
                Actualiza la información del cliente
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h2 className="text-xl font-semibold text-white">
              Información del Cliente
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Ajusta los campos requeridos y guarda los cambios
            </p>
          </div>

          <SuccessModal
            isOpen={success}
            title="¡Cliente actualizado!"
            message="Los cambios se guardaron correctamente."
            autoClose
            autoCloseDelay={1200}
            onAction={() => router.push("/parametrizacion/clientes")}
          />

          <ErrorModal
            isOpen={!!error}
            message={error || ""}
            onAction={() => setError(null)}
          />

          <ConfirmModal
            isOpen={showConfirmModal}
            title="Confirmar cambios"
            message="¿Estás seguro de que deseas guardar los cambios de este cliente?"
            confirmText="Sí, guardar"
            cancelText="Cancelar"
            isLoading={saving}
            onConfirm={handleConfirmSave}
            onCancel={() => setShowConfirmModal(false)}
          />

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <Building className="w-4 h-4 mr-2" /> Razón Social *
                </span>
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                required
                disabled={saving || success}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> Tipo de identificación
                    *
                  </span>
                </label>
                <select
                  value={tipoIdentificacion ?? ""}
                  onChange={(e) =>
                    setTipoIdentificacion(e.target.value ? Number(e.target.value) : undefined)
                  }
                  required
                  disabled={saving || success || loadingTiposIdentificacion}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona tipo</option>
                  {tiposIdentificacion.map((tipo, idx) => (
                    <option key={tipo.id || idx} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> NIT / Identificación *
                  </span>
                </label>
                <input
                  type="text"
                  value={nitDocumento}
                  onChange={(e) => setNitDocumento(e.target.value)}
                  required
                  disabled={saving || success}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" /> Correo *
                  </span>
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  disabled={saving || success}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> Dirección *
                </span>
              </label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
                rows={3}
                disabled={saving || success}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center">
                  <User className="w-4 h-4 mr-2" /> Ejecutivo asignado
                </span>
              </label>
              <select
                value={ejecutivoId ?? ""}
                onChange={(e) =>
                  setEjecutivoId(e.target.value ? Number(e.target.value) : null)
                }
                disabled={saving || success}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin ejecutivo asignado</option>
                {ejecutivos.map((ej, idx) => (
                  <option key={ej.id || idx} value={ej.id}>
                    {ej.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País *
                </label>
                <select
                  value={paisId}
                  onChange={(e) => {
                    setPaisId(Number(e.target.value));
                    setDepartamentoId(0);
                    setCiudadId(0);
                  }}
                  required
                  disabled={saving || success}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Selecciona un país</option>
                  {paises.map((p) => (
                    <option key={p.pais_id} value={p.pais_id}>
                      {p.pais_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento *
                </label>
                <select
                  value={departamentoId}
                  onChange={(e) => {
                    setDepartamentoId(Number(e.target.value));
                    setCiudadId(0);
                  }}
                  required
                  disabled={saving || success || !paisId}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value={0}>Selecciona un departamento</option>
                  {departamentos.map((d) => (
                    <option key={d.depto_id} value={d.depto_id}>
                      {d.depto_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad *
                </label>
                <select
                  value={ciudadId}
                  onChange={(e) => setCiudadId(Number(e.target.value))}
                  required
                  disabled={saving || success || !departamentoId}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value={0}>Selecciona una ciudad</option>
                  {ciudades.map((c) => (
                    <option key={c.ciudad_id} value={c.ciudad_id}>
                      {c.ciudad_nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="habilitaAcceso"
                  checked={habilitaAcceso}
                  onChange={(e) => setHabilitaAcceso(e.target.checked)}
                  disabled={saving || success}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="habilitaAcceso"
                  className="ml-3 text-sm font-medium text-gray-700"
                >
                  Habilitar acceso al portal cliente
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Centros de Operación
              </label>
              <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 max-h-56 overflow-y-auto space-y-2">
                {centros.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay centros de operación disponibles
                  </p>
                ) : (
                  centros.map((centro, idx) => (
                    <label
                      key={centro.id || idx}
                      className="flex items-center gap-3 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={centro_operacion_ids.includes(centro.id)}
                        onChange={() => toggleCentro(centro.id)}
                        disabled={saving || success}
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

            <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/parametrizacion/clientes")}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                disabled={saving || success}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || success}
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" /> Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
