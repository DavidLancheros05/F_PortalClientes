"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { clientesService } from "@/services/clientes/clientes.service";

interface FormularioPregunta {
  fp_id: number;
  fp_descripcion: string;
  fp_tipo: string;
  fp_subtipo?: string;
  opciones?: {
    op_id: number;
    op_descripcion: string;
  }[];
}

interface Cliente {
  razonSocial?: string;
  cliente_razon_social?: string;
  nitDocumento?: string;
  cliente_nit_documento?: string;
  direccion?: string;
  cliente_direccion?: string;
  telefono?: string;
  cliente_telefono?: string;
  correo?: string;
  email?: string;
  cliente_email?: string;
  tipoIdentificacion?: string;
  cliente_tipo_identificacion?: string;
}

interface User {
  usr_id?: number;
  cliente_id?: number;
}

type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
  };
};

type PrefillSource = "cliente";

interface UsePrefillClienteParams {
  user?: User | null;
  preguntas: FormularioPregunta[];
  enabled: boolean;
}

export function usePrefillCliente({
  user,
  preguntas,
  enabled,
}: UsePrefillClienteParams) {
  const [respuestasPrefill, setRespuestasPrefill] = useState<RespuestasState>(
    {},
  );
  const [prefilledFieldIds, setPrefilledFieldIds] = useState<
    Record<number, true>
  >({});
  const [prefillSourceByFieldId, setPrefillSourceByFieldId] = useState<
    Record<number, PrefillSource>
  >({});
  const [lockedFieldIds, setLockedFieldIds] = useState<Record<number, true>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const preguntaIds = useMemo(
    () => preguntas.map((p) => p.fp_id).join(","),
    [preguntas],
  );

  const userRef = useRef(user);
  userRef.current = user;

  const preguntasRef = useRef(preguntas);
  preguntasRef.current = preguntas;

  useEffect(() => {
    if (!enabled || !user?.usr_id || preguntas.length === 0) return;

    let cancelled = false;
    const currentUser = userRef.current;
    const currentPreguntas = preguntasRef.current;

    const prefillClienteData = async () => {
      if (cancelled) return;
      setLoading(true);

      try {
        let cliente: Cliente | null = null;

        if (currentUser?.cliente_id) {
          cliente = await clientesService.getById(Number(currentUser.cliente_id));
        } else {
          const clientes = await clientesService.getAll();
          cliente = clientes.find((c: any) => c.cli_id === currentUser?.usr_id) || null;
        }

        if (!cliente) return;

        const normalizar = (texto?: string | null) =>
          (texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const findPreguntaId = (
          matcher: (
            pregunta: FormularioPregunta,
            descripcion: string,
          ) => boolean,
        ) =>
          currentPreguntas.find((pregunta) => {
            const descripcion = normalizar(pregunta.fp_descripcion);
            return matcher(pregunta, descripcion);
          })?.fp_id;

        const razonSocialId = findPreguntaId(
          (_p, d) =>
            d.includes("razon social") ||
            d.includes("nombre empresa") ||
            d.includes("nombre de la empresa"),
        );

        const nitDocumentoId = findPreguntaId(
          (p, d) =>
            ["TEXTO", "NUMERO"].includes(p.fp_tipo) &&
            ((p.fp_subtipo === "CC" && !d.includes("tipo de documento")) ||
              (d.includes("nit") && !d.includes("tipo de documento")) ||
              (d.includes("numero de documento") &&
                !d.includes("tipo de documento")) ||
              (d.includes("nro de documento") &&
                !d.includes("tipo de documento")) ||
              (d.includes("identificacion") &&
                !d.includes("tipo de documento"))),
        );

        const tipoDocumentoId = findPreguntaId(
          (p, d) =>
            [
              "SELECT",
              "SELECT_CONDICIONAL",
              "SELECT_TABLA",
              "DOCUMENTOS_TABLA",
            ].includes(p.fp_tipo) &&
            (d.includes("tipo de documento") ||
              d.includes("tipo identificacion")),
        );

        const direccionId = findPreguntaId((_p, d) => d.includes("direccion"));

        const telefonoId = findPreguntaId(
          (p, d) =>
            p.fp_subtipo === "TELEFONO" ||
            d.includes("telefono") ||
            d.includes("celular") ||
            d.includes("movil"),
        );

        const correoId = findPreguntaId(
          (p, d) =>
            p.fp_subtipo === "EMAIL" ||
            d.includes("correo") ||
            d.includes("e-mail") ||
            d.includes("email"),
        );

        const razonSocial =
          cliente.razonSocial || cliente.cliente_razon_social || "";
        const nitDocumento =
          cliente.nitDocumento || cliente.cliente_nit_documento || "";
        const direccion = cliente.direccion || cliente.cliente_direccion || "";
        const telefono = cliente.telefono || cliente.cliente_telefono || "";
        const correo =
          cliente.correo || cliente.email || cliente.cliente_email || "";
        const tipoIdentificacion =
          cliente.tipoIdentificacion ||
          cliente.cliente_tipo_identificacion ||
          "";

        const tipoDocumentoPregunta = tipoDocumentoId
          ? currentPreguntas.find((p) => p.fp_id === tipoDocumentoId)
          : null;

        const tipoDocumentoOpcionId = tipoDocumentoPregunta?.opciones?.find(
          (op) => {
            const opDesc = normalizar(op.op_descripcion);
            const tipo = normalizar(tipoIdentificacion);

            if (!tipo) return false;
            if (opDesc === tipo) return true;
            if (tipo === "cc" && opDesc.includes("cedula de ciudadania"))
              return true;
            if (tipo === "ce" && opDesc.includes("cedula de extranjeria"))
              return true;
            if (tipo === "nit" && opDesc === "nit") return true;
            if (tipo === "pasaporte" && opDesc.includes("pasaporte"))
              return true;

            return false;
          },
        )?.op_id;

        const respuestas: RespuestasState = {};
        const fieldIds: Record<number, true> = {};

        const setIfExists = (
          id?: number,
          value?: string,
          type: "text" | "option" = "text",
        ) => {
          if (!id || !value) return;

          fieldIds[id] = true;

          respuestas[id] =
            type === "option"
              ? { valor_opcion_id: Number(value) }
              : { valor_texto: value };
        };

        setIfExists(razonSocialId, razonSocial);
        setIfExists(nitDocumentoId, nitDocumento);
        setIfExists(direccionId, direccion);
        setIfExists(telefonoId, telefono);
        setIfExists(correoId, correo);

        if (tipoDocumentoId && tipoDocumentoOpcionId) {
          fieldIds[tipoDocumentoId] = true;
          respuestas[tipoDocumentoId] = {
            valor_opcion_id: tipoDocumentoOpcionId,
          };
        }

        setRespuestasPrefill(respuestas);
        setPrefilledFieldIds(fieldIds);

        const sourceMap: Record<number, PrefillSource> = {};
        Object.keys(fieldIds).forEach((id) => {
          sourceMap[Number(id)] = "cliente";
        });
        setPrefillSourceByFieldId(sourceMap);

        if (nitDocumentoId) {
          setLockedFieldIds({ [nitDocumentoId]: true });
        }
      } catch (error) {
        console.error("Error en prefill cliente:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    prefillClienteData();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    respuestasPrefill,
    prefilledFieldIds,
    prefillSourceByFieldId,
    lockedFieldIds,
    loading,
  };
}
