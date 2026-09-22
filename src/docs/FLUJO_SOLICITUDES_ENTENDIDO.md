# Flujo de solicitudes: entendimiento funcional

## Objetivo

Una solicitud no es solamente un formulario. El proceso completo tiene tres pasos y la solicitud debe conservar su contexto mientras avanza:

1. **Diligenciar formulario**
2. **Generar, revisar y firmar documentación**
3. **Enviar la solicitud a revisión**

La pantalla principal y puente único del flujo es `/solicitudes/nueva`. Aunque conserva el segmento `nueva` por compatibilidad de ruta, no representa únicamente la creación: desde allí se continúa una solicitud existente, se abre el formulario, se generan documentos y se envía la solicitud. El formulario vive en `/solicitudes/nueva/formulario` para una solicitud nueva y en `/solicitudes/:id/editar` cuando ya existe una solicitud.

## Actores y entrada al flujo

### Cliente

El cliente entra a `/solicitudes/nueva` y el sistema usa su `cliente_id`. No debe seleccionar otro cliente.

### Usuario interno

Un ejecutivo, administrador u otro usuario interno entra a `/solicitudes/nueva`, selecciona el ejecutivo cuando corresponda y después selecciona el cliente. El `clienteId` se conserva en la URL al abrir el formulario.

### Editar desde Mis solicitudes

Desde `/solicitudes/cliente`, el botón **Editar** lleva primero al puente:

`/solicitudes/nueva`

Desde el puente, el usuario puede abrir `/solicitudes/:id/editar`. El retorno esperado es siempre `/solicitudes/nueva`, no `/solicitudes/cliente` ni una lista genérica.

## Paso 1: diligenciar formulario

### Solicitud nueva

1. Se abre `/solicitudes/nueva`.
2. Si el usuario interno aplica, se selecciona el cliente.
3. Se abre `/solicitudes/nueva/formulario`.
4. El usuario diligencia las secciones.
5. **Guardar borrador** guarda únicamente las respuestas modificadas.
6. Después del primer guardado, la solicitud obtiene un `sol_id` y la URL pasa a `/solicitudes/:id/editar`.
7. El formulario puede seguir editándose sobre ese mismo `sol_id`.

Guardar un borrador no significa que la solicitud haya sido enviada a revisión.

### Solicitud existente en borrador

Si `/solicitudes/nueva` detecta una solicitud en estado `BORRADOR`, debe llevar al formulario de esa solicitud. No debe crear otra solicitud ni mostrar un formulario vacío.

## Paso 2: generar y firmar documentos

El paso 2 se muestra en `/solicitudes/nueva`, debajo del indicador de pasos. Trabaja sobre la solicitud activa y no crea una solicitud nueva.

En este paso:

1. Se consultan los documentos diferidos asociados a la solicitud.
2. Se generan los documentos que tienen plantilla.
3. El usuario descarga, revisa, firma y sube los documentos que requieren firma.
4. Mientras falte algún documento firmado, el paso 2 permanece como **Actual**.
5. Cuando todos los documentos requeridos están cargados, el paso 2 queda **Completado**.

La pantalla del formulario no debe enviar directamente al usuario a la lista cuando termina el formulario si todavía faltan documentos. Debe regresar o llevarlo al contenedor del flujo para que pueda completar este paso.

Al guardar por primera vez una solicitud nueva, o al guardar una solicitud
existente después de editarla, el proceso documental siempre comienza desde
cero: los documentos generados y firmados de una versión anterior se
invalidan, la solicitud queda en estado `PENDIENTE` en la etapa `CLI` con
resultado `PEND_FIRMA`, y el paso 2 vuelve a ser obligatorio.

## Paso 3: enviar solicitud

El paso 3 solo se habilita cuando todos los documentos diferidos requeridos están cargados.

Al enviarlo:

1. La solicitud pasa al flujo de revisión.
2. El cliente deja de estar en el paso de documentos pendientes.
3. Después del envío se puede regresar a Mis solicitudes para consultar el estado.

El botón de envío del paso 3 debe representar la misma acción que ejecuta `PanelFirmaDocumentos`; no deben existir dos acciones distintas que envíen la misma solicitud.

## Edición antes de revisión

Una solicitud que todavía no ha sido revisada por el ejecutivo puede editarse. Editarla invalida la documentación generada con los datos anteriores.

El comportamiento esperado es:

1. El usuario entra desde Mis solicitudes a `/solicitudes/:id/editar`.
2. Cambia uno o varios datos.
3. Guarda la solicitud.
4. El sistema conserva el mismo `sol_id`.
5. Antes de guardar las respuestas nuevas, se invalidan y vacían los documentos generados y firmados anteriores.
6. La solicitud queda como `PENDIENTE + CLI + PEND_FIRMA`, igual que después del primer guardado de una solicitud nueva.
7. La solicitud vuelve al flujo de tres pasos.
8. El paso 1 queda completado con los datos guardados.
9. El paso 2 queda **Actual** para generar y firmar nuevamente los documentos.
10. El usuario no debe regresar automáticamente a `/solicitudes/cliente` hasta completar y enviar otra vez la solicitud.

El reinicio debe ocurrir porque los documentos firmados representan los datos del formulario. Si cambia el formulario, los documentos anteriores ya no deben considerarse válidos.

## Comportamiento del botón Atrás

El botón Atrás depende del punto de entrada:

- Desde `/solicitudes/nueva/formulario`, debe volver a `/solicitudes/nueva`.
- Desde `/solicitudes/:id/editar`, debe volver al puente `/solicitudes/nueva`, conservando el cliente cuando sea necesario.
- Desde el flujo principal, un usuario interno puede volver al selector de cliente.
- No debe depender únicamente de `router.back()`, porque el historial del navegador puede no contener la pantalla correcta.

## Estados conceptuales

Los estados generales y el workflow cumplen funciones diferentes:

- `sol_ses_id`: estado general de la solicitud, por ejemplo borrador, pendiente o revisión.
- `sol_wet_id`: etapa actual del workflow, por ejemplo cliente o ejecutivo.
- `sol_wee_id`: resultado dentro de la etapa, por ejemplo pendiente o `PEND_FIRMA`.

Para el usuario, la combinación relevante es:

| Situación                               | Paso visible                                         |
| --------------------------------------- | ---------------------------------------------------- |
| No existe solicitud                     | Paso 1 actual                                        |
| Existe borrador                         | Abrir paso 1 para continuar diligenciando            |
| Formulario guardado y faltan documentos | Paso 1 completado, paso 2 actual                     |
| Documentos completos                    | Paso 1 y 2 completados, paso 3 actual                |
| Solicitud enviada                       | El flujo termina y se consulta desde Mis solicitudes |
| Solicitud editada antes de revisiónDocumentos generados
Documentos generados
Formulario Solicitud de vinculación comercial requerimientos y servicios del cliente - Distribuidor

Documento generado y guardado

Ver documento generado
Formulario Solicitud de vinculación comercial requerimientos y servicios del cliente

Documento generado y guardado

Ver documento generado
Manifestación suscrita

Documento generado y guardado

Ver documento generadoetado, paso 2 actual nuevamente          |

## Diferencia entre acciones de guardado

### Guardar borrador

- Es parcial.
- Envía solo las respuestas modificadas.
- Mantiene la solicitud en edición.
- No inicia la revisión.

### Guardar y continuar / enviar formulario completo

- Valida el formulario completo.
- En una solicitud nueva, la deja lista para iniciar el paso documental.
- En una solicitud existente, invalida primero los documentos generados y firmados anteriores.
- Guarda todas las respuestas necesarias para completar la solicitud.
- Puede generar o actualizar archivos relacionados.
- Deja la solicitud en `PENDIENTE + CLI + PEND_FIRMA` hasta completar nuevamente el paso documental.

### Enviar solicitud

- Es la acción final del paso 3.
- Solo debe estar disponible cuando los documentos requeridos estén completos.
- Cambia la solicitud al flujo de revisión.

## Regla de navegación principal

El flujo debe conservar siempre la solicitud y el cliente actuales. La navegación correcta después de editar no es:

`Editar -> Mis solicitudes`

sino:

`Mis solicitudes -> Puente /solicitudes/nueva -> Editar formulario -> Puente /solicitudes/nueva -> Paso 2: firmar documentación -> Enviar -> Mis solicitudes`

## Puntos que deben verificarse en la implementación

1. Al guardar una edición, el retorno debe incluir el cliente si el usuario es interno.
2. Al volver a `/solicitudes/nueva`, la consulta de la última solicitud debe identificar la solicitud editada.
3. La pantalla principal debe mostrar el paso 2 como actual cuando el workflow esté en `CLI + PEND_FIRMA`.
4. Los documentos anteriores no deben bloquear la generación o carga de los documentos nuevos.
5. El retorno a Mis solicitudes debe ocurrir solamente después del envío final, no inmediatamente después de editar.
6. El botón Atrás del formulario debe regresar al contenedor del flujo y no al listado.
