// Funciones puras de vigencia de documentos, compartidas entre el
// asistente de solicitud (SolicitudFormContent) y la página "Mis Documentos".

export function calcularVigenciaDocumento(
  fechaEmision?: string,
  vigenciaDias?: number | null,
) {
  if (!fechaEmision || vigenciaDias === null || vigenciaDias === undefined) {
    return null;
  }

  const [year, month, day] = fechaEmision.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const fechaBase = new Date(year, month - 1, day);
  if (Number.isNaN(fechaBase.getTime())) {
    return null;
  }

  const fechaVencimiento = new Date(fechaBase);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + vigenciaDias);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const milisegundosPorDia = 1000 * 60 * 60 * 24;
  const diasRestantes = Math.ceil(
    (fechaVencimiento.getTime() - hoy.getTime()) / milisegundosPorDia,
  );

  return {
    diasRestantes,
    fechaVencimiento,
  };
}

export function calcularEstadoAnioDocumento(
  fechaEmision?: string,
  aniosAtrasPermitidos?: number | null,
) {
  if (
    !fechaEmision ||
    aniosAtrasPermitidos === null ||
    aniosAtrasPermitidos === undefined
  ) {
    return null;
  }

  const [year] = fechaEmision.split("-").map(Number);
  if (!year) {
    return null;
  }

  const anioActual = new Date().getFullYear();
  const anioMinimo = anioActual - aniosAtrasPermitidos;
  const anioMaximo = anioActual;
  const valido = year >= anioMinimo && year <= anioMaximo;

  // Mientras es válido, vence al terminar el año en curso (anioMaximo):
  // calculamos cuántos meses y días completos quedan hasta el 31 de diciembre.
  let mesesRestantes: number | undefined;
  let diasRestantes: number | undefined;

  if (valido) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finAnio = new Date(anioActual, 11, 31);

    let meses =
      (finAnio.getFullYear() - hoy.getFullYear()) * 12 +
      (finAnio.getMonth() - hoy.getMonth());
    let dias = finAnio.getDate() - hoy.getDate();

    if (dias < 0) {
      meses -= 1;
      const finMesAnterior = new Date(
        finAnio.getFullYear(),
        finAnio.getMonth(),
        0,
      );
      dias += finMesAnterior.getDate();
    }

    mesesRestantes = Math.max(meses, 0);
    diasRestantes = Math.max(dias, 0);
  }

  return {
    valido,
    anioDocumento: year,
    anioMinimo,
    anioMaximo,
    mesesRestantes,
    diasRestantes,
  };
}

export function getArchivoPreviewUrl(
  archivo: any,
  solicitudId?: number | null,
): string | null {
  if (!archivo) return null;

  // Prioridad 1: Usar el API endpoint si tenemos sa_id
  if (solicitudId && archivo.sa_id) {
    return `/api/solicitudes/${solicitudId}/respuestas/archivo/${archivo.sa_id}`;
  }

  // Prioridad 2: Usar sa_nombre_guardado con ruta relativa
  if (archivo.sa_nombre_guardado) {
    return `/uploads/solicitudes/${encodeURIComponent(archivo.sa_nombre_guardado)}`;
  }

  const rutaAlmacenamiento = archivo.sa_ruta_almacenamiento;
  if (!rutaAlmacenamiento || typeof rutaAlmacenamiento !== "string") {
    return null;
  }

  // Solo aceptar URLs HTTP/HTTPS, no rutas locales del sistema
  if (/^https?:\/\//i.test(rutaAlmacenamiento)) {
    return rutaAlmacenamiento;
  }

  // Rechazar rutas locales del sistema (C:/, D:/, etc.)
  if (/^[a-zA-Z]:[\/\\]/.test(rutaAlmacenamiento)) {
    console.warn(
      "[getArchivoPreviewUrl] Ruta local del sistema rechazada:",
      rutaAlmacenamiento,
    );
    return null;
  }

  // Si es una ruta relativa que contiene /uploads/, usarla
  const rutaNormalizada = rutaAlmacenamiento.replace(/\\/g, "/");
  const uploadsIndex = rutaNormalizada.toLowerCase().lastIndexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return rutaNormalizada.substring(uploadsIndex);
  }

  return null;
}
