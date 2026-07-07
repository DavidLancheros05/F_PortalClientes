import { useState, useEffect } from 'react'
import { formulariosService } from '@/services/parametrizacion/formularios.service'

export interface Pregunta {
  fp_id: number
  fp_descripcion: string
  fp_tipo: string
  fp_estado: boolean
  fp_orden: number
  fp_requerida: boolean
  fp_minimo: number | null
  fp_maximo: number | null
  fp_subtipo: string | null
  fp_patron: string | null
  fp_tabla_maestro: string | null
  fp_opcion_disparadora: string | null
  fp_descripcion_adicional: string | null
  fp_validacion_adicional: string | null
  fp_pregunta_padre_id: number | null
  fp_valor_padre_disparador: string | null
  fp_catalogo_base_datos: string | null
  fp_catalogo_tabla: string | null
  fp_catalogo_columna: string | null
  fp_tipo_documento_id: number | null
  seccion_id: number
  formulario_id: number
}

export interface Seccion {
  seccion_id: number
  seccion_nombre: string
  seccion_descripcion: string | null
  seccion_orden: number
  seccion_activo: boolean
  preguntas: Pregunta[]
}

export function useFormulario(formularioId: number = 1) {
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    formulariosService
      .getSeccionesFormulario(formularioId)
      .then((data) => setSecciones(data))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [formularioId])

  return { secciones, loading, error }
}
