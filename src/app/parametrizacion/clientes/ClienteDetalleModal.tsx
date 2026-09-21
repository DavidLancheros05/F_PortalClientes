"use client";

import { useEffect, useState } from "react";
import { clientesService } from "@/services/clientes/clientes.service";
import {
  maestrosService,
  type Pais,
  type Departamento,
  type Ciudad,
} from "@/services/maestros/maestros.service";
import type {
  TipoIdentificacionResponse,
  ClienteCentroResponse,
} from "@/types/api.types";
import {
  Building,
  FileText,
  Mail,
  MapPin,
  User,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { DetalleModal, type DetalleCampo } from "@/components/modals";

interface ClienteDetalleModalProps {
  clienteId: number;
  onClose: () => void;
  onEdit: () => void;
}

export default function ClienteDetalleModal({
  clienteId,
  onClose,
  onEdit,
}: ClienteDetalleModalProps) {
  const [razonSocial, setRazonSocial] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState("");
  const [nitDocumento, setNitDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [estadoActivo, setEstadoActivo] = useState(false);
  const [accesoPortal, setAccesoPortal] = useState(false);
  const [esDistribuidor, setEsDistribuidor] = useState(false);
  const [nitDigVf, setNitDigVf] = useState("");
  const [esExtranjero, setEsExtranjero] = useState(false);
  const [centros, setCentros] = useState<string[]>([]);
  const [ejecutivo, setEjecutivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cargarCliente = async () => {
      try {
        setLoading(true);
        setError(null);
        const clienteData = await clientesService.getById(clienteId);
        if (cancelled) return;

        setRazonSocial(clienteData.cli_razon_social || "");
        setNitDocumento(clienteData.cli_nro_identificacion || "");
        setCorreo(clienteData.cli_correo || "");
        setDireccion(clienteData.cli_direccion || "");
        setEstadoActivo(clienteData.cli_estado === "A");
        setAccesoPortal(!!clienteData.cli_acceso_pc);
        setEsDistribuidor(!!clienteData.cli_es_distribuidor);
        setNitDigVf(clienteData.cli_nit_dig_vf || "");
        setEsExtranjero(!!clienteData.cli_es_extranjero);
        setEjecutivo(clienteData.ejecutivo || null);

        // El resto son datos "de catálogo" (nombre del tipo de
        // identificación, país/departamento/ciudad, centros de operación):
        // se resuelven aparte porque el detalle del cliente solo trae los
        // ids. Se piden en paralelo y cada uno se ignora si falla, para no
        // tumbar el modal completo por un catálogo caído.
        const [tipos, centrosCliente, paises, departamentos, ciudades] =
          await Promise.all([
            clientesService.getTiposIdentificacion().catch(() => [] as TipoIdentificacionResponse[]),
            clientesService.getCentrosOperacion(clienteId).catch(() => [] as ClienteCentroResponse[]),
            maestrosService.getPaises().catch(() => [] as Pais[]),
            clienteData.pai_id
              ? maestrosService.getDepartamentos(clienteData.pai_id).catch(() => [] as Departamento[])
              : Promise.resolve([] as Departamento[]),
            clienteData.dpto_id
              ? maestrosService.getCiudades(clienteData.dpto_id).catch(() => [] as Ciudad[])
              : Promise.resolve([] as Ciudad[]),
          ]);
        if (cancelled) return;

        const tipoNombre = tipos.find(
          (t) => Number(t.id) === Number(clienteData.cli_tipo_identificacion),
        )?.nombre;
        setTipoIdentificacion(tipoNombre || "");

        setCentros(centrosCliente.map((c) => c.cop_nombre));

        const paisNombre = paises.find(
          (p) => p.pais_id === clienteData.pai_id,
        )?.pais_nombre;
        const deptoNombre = departamentos.find(
          (d) => d.depto_id === clienteData.dpto_id,
        )?.depto_nombre;
        const ciudadNombre = ciudades.find(
          (c) => c.ciudad_id === clienteData.ciu_id,
        )?.ciudad_nombre;
        setUbicacion(
          [ciudadNombre, deptoNombre, paisNombre].filter(Boolean).join(", "),
        );
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error cargando cliente");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    cargarCliente();
    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const badge = (activo: boolean, textoActivo: string, textoInactivo: string) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        activo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
      }`}
    >
      {activo ? textoActivo : textoInactivo}
    </span>
  );

  const campos: DetalleCampo[] = [
    { label: "Razón Social", value: razonSocial },
    { label: "Tipo de Identificación", icon: FileText, value: tipoIdentificacion || "-" },
    {
      label: "NIT / Documento",
      icon: FileText,
      value: <span className="font-mono">{nitDocumento}</span>,
    },
    { label: "Correo", icon: Mail, value: correo || "-" },
    { label: "Ubicación", icon: Globe, value: ubicacion || "-" },
    { label: "Dirección", icon: MapPin, value: direccion || "-", fullWidth: true },
    { label: "Estado", icon: ShieldCheck, value: badge(estadoActivo, "Activo", "Inactivo") },
    {
      label: "Acceso al Portal",
      icon: ShieldCheck,
      value: badge(accesoPortal, "Habilitado", "No habilitado"),
    },
    {
      label: "Dígito Verificación NIT",
      value: nitDigVf || "-",
    },
    {
      label: "Tipo de Cliente",
      value: badge(esDistribuidor, "Distribuidor", "No distribuidor"),
    },
    {
      label: "Nacionalidad",
      value: badge(esExtranjero, "Extranjero", "Nacional"),
    },
    {
      label: "Centros de Operación",
      icon: Building,
      value: centros.length > 0 ? centros.join(", ") : "-",
      fullWidth: true,
    },
    {
      label: "Ejecutivo Asignado",
      icon: User,
      value: ejecutivo ? ejecutivo.nombre : "Sin asignar",
      fullWidth: true,
    },
  ];

  return (
    <DetalleModal
      icon={Building}
      titulo={loading ? "Cargando..." : razonSocial || "Detalle del cliente"}
      subtitulo="Detalle del cliente"
      loading={loading}
      error={error}
      campos={campos}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
}
