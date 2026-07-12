import api from "@/services/core/api";

export const formularioRespuestasService = {
  // Guardar respuestas y archivos de un formulario
  async guardarRespuestasYArchivos({
    solicitudId,
    respuestas,
    preguntas,
    soloConValor = false,
    hasValorEnRespuesta,
  }: {
    solicitudId: number;
    respuestas: any;
    preguntas: any[];
    soloConValor?: boolean;
    hasValorEnRespuesta?: (r: any) => boolean;
  }) {
    // Cada campo se guarda de forma independiente (su propio archivo y/o
    // valor), así que se lanzan todos en paralelo en vez de uno por uno:
    // con varias decenas de preguntas, guardar secuencialmente sumaba varios
    // segundos de ida y vuelta al servidor por cada campo.
    const tareas = Object.entries(respuestas)
      .filter(([, respuesta]) => {
        if (soloConValor && hasValorEnRespuesta) {
          return hasValorEnRespuesta(respuesta as any);
        }
        return true;
      })
      .map(([fp_id, respuesta]) => async (): Promise<number> => {
        const fpId = parseInt(fp_id);
        const preguntaInfo = preguntas.find((p) => p.fp_id === fpId);
        const esMultiselect = preguntaInfo?.fp_tipo === "MULTISELECT";
        const esArchivo = ["ARCHIVO", "DOCUMENTOS_TABLA", "IMAGEN"].includes(
          preguntaInfo?.fp_tipo || "",
        );
        const esDocumentoTabla = preguntaInfo?.fp_tipo === "DOCUMENTOS_TABLA";

        let guardadas = 0;

        // Manejar archivos
        if (esArchivo && (respuesta as any).archivo) {
          let fechaEmision: string | undefined;

          if (esDocumentoTabla) {
            // Buscar pregunta FECHA hija de este documento
            const preguntaFechaHija = preguntas.find(
              (p) => p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === fpId,
            );
            if (preguntaFechaHija) {
              fechaEmision = respuestas[preguntaFechaHija.fp_id]?.valor_fecha;
            }
            // Si no hay hija, buscar en la misma respuesta
            if (!fechaEmision) {
              fechaEmision = (respuesta as any).valor_fecha;
            }
          }

          await this.guardarArchivoRespuesta(
            solicitudId,
            fpId,
            (respuesta as any).archivo,
            fechaEmision,
          );
          guardadas++;
        }

        if (!esArchivo || esDocumentoTabla) {
          const respuestaFormateada: any = {
            es_multiselect: esMultiselect,
          };

          if ((respuesta as any).valor_texto !== undefined)
            respuestaFormateada.valor_texto = (respuesta as any).valor_texto;
          if ((respuesta as any).valor_numero !== undefined)
            respuestaFormateada.valor_numero = (respuesta as any).valor_numero;
          if ((respuesta as any).valor_fecha !== undefined)
            respuestaFormateada.valor_fecha = (respuesta as any).valor_fecha;

          if (
            esMultiselect &&
            Array.isArray((respuesta as any).valor_opcion_id)
          ) {
            respuestaFormateada.valor_opcion_id = (
              respuesta as any
            ).valor_opcion_id;
          } else if ((respuesta as any).valor_opcion_id) {
            respuestaFormateada.valor_opcion_id = Number(
              (respuesta as any).valor_opcion_id,
            );
          } else {
            respuestaFormateada.valor_opcion_id = null;
          }

          await this.guardarRespuesta(solicitudId, fpId, respuestaFormateada);
          guardadas++;
        }

        return guardadas;
      });

    const resultados = await Promise.all(tareas.map((tarea) => tarea()));
    let respuestasGuardadas = resultados.reduce((sum, n) => sum + n, 0);

    // Procesar documentos existentes que tengan fechas nuevas
    // (cuando el archivo ya existe pero se seleccionó una fecha nueva)
    const documentosConFecha = preguntas.filter(
      (p) => p.fp_tipo === "DOCUMENTOS_TABLA",
    );
    const tareasFecha = documentosConFecha.map((doc) => async () => {
      const docFpId = doc.fp_id;

      // Buscar la fecha hija
      const preguntaFechaHija = preguntas.find(
        (p) => p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === docFpId,
      );

      let fechaEmision: string | undefined;
      if (preguntaFechaHija) {
        fechaEmision = respuestas[preguntaFechaHija.fp_id]?.valor_fecha;
      }
      if (!fechaEmision) {
        fechaEmision = respuestas[docFpId]?.valor_fecha;
      }

      // Si hay fecha, actualizar la fecha del documento (sea existente o nuevo)
      if (fechaEmision && !respuestas[docFpId]?.archivo) {
        await this.actualizarFechaDocumento(solicitudId, docFpId, fechaEmision);
        return 1;
      }
      return 0;
    });

    const resultadosFecha = await Promise.all(
      tareasFecha.map((tarea) => tarea()),
    );
    respuestasGuardadas += resultadosFecha.reduce((sum, n) => sum + n, 0);

    return respuestasGuardadas;
  },

  // Guardar respuesta individual
  async guardarRespuesta(
    solicitudId: number,
    fp_id: number,
    respuestaData: any,
  ) {
    if (!solicitudId || isNaN(solicitudId)) {
      throw new Error("sa_sol_id inválido o no proporcionado");
    }
    const response = await api.post("/solicitudes/respuestas", {
      sa_sol_id: solicitudId,
      fp_id,
      ...respuestaData,
    });
    return response.data;
  },

  // Guardar archivo de respuesta
  async guardarArchivoRespuesta(
    solicitudId: number,
    fp_id: number,
    archivo: File,
    fechaEmision?: string,
  ) {
    // console.log("🔵 [FRONTEND] guardarArchivoRespuesta iniciado:", {
    //   solicitudId,
    //   fp_id,
    //   nombreArchivo: archivo?.name,
    //   fechaEmision: fechaEmision || "NO RECIBIDA",
    // });

    if (!solicitudId || isNaN(solicitudId)) {
      // console.error("🔴 [FRONTEND] sa_sol_id inválido:", solicitudId);
      throw new Error("sa_sol_id inválido o no proporcionado");
    }

    // console.log("📝 [FRONTEND] Construyendo FormData...");
    const formData = new FormData();
    formData.append("sa_sol_id", String(solicitudId));
    formData.append("fp_id", String(fp_id));
    formData.append("archivo", archivo);
    if (fechaEmision) {
      // console.log("📅 [FRONTEND] Agregando fechaEmision:", fechaEmision);
      formData.append("fechaEmision", fechaEmision);
    } else {
      console.warn("⚠️  [FRONTEND] NO hay fechaEmision para agregar");
    }

    // console.log(
    //   "📤 [FRONTEND] Enviando POST a /solicitudes/respuestas/archivo...",
    // );
    const response = await api.post(
      "/solicitudes/respuestas/archivo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    // console.log("✅ [FRONTEND] Respuesta recibida:", response.data);
    return response.data;
  },

  // Eliminar archivo de respuesta
  async eliminarArchivoRespuesta(solicitudId: number, archivoId: number) {
    const response = await api.delete(
      `/solicitudes/${solicitudId}/respuestas/archivo/${archivoId}`,
    );
    return response.data;
  },

  // Actualizar fecha de emisión de un documento existente
  async actualizarFechaDocumento(
    solicitudId: number,
    fpId: number,
    fechaEmision: string,
  ) {
    console.log("📅 [actualizarFechaDocumento] Enviando PATCH:", {
      solicitudId,
      fpId,
      fechaEmision,
    });
    const response = await api.patch(
      `/solicitudes/${solicitudId}/respuestas/documento/fecha`,
      {
        fp_id: fpId,
        fechaEmision: fechaEmision,
      },
    );
    console.log("✅ [actualizarFechaDocumento] Respuesta:", response.data);
    return response.data;
  },

  // Obtener archivos existentes de respuestas
  async getArchivosExistentes(solicitudId: number) {
    const response = await api.get(
      `/solicitudes/${solicitudId}/respuestas/archivo`,
    );
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? []);
  },
};
