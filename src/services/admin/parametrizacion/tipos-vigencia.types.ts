// src/services/admin/parametrizacion/tipos-vigencia.types.ts

export interface TipoVigencia {
  tipoVigenciaId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  orden: number;
}

export interface TipoVigenciaPayload {
  nombre?: string;
  descripcion?: string;
  estado?: boolean;
}
