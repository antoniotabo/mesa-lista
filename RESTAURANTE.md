# Datos del restaurante y tickets

Reinicia el servidor y recarga los navegadores después de actualizar. Ingresa como administrador y abre **Administrar → Restaurante**.

Puedes configurar:

- Nombre comercial, visible en la app y en los nuevos tickets.
- RUC, opcional, de 11 dígitos.
- Dirección y teléfono.
- Logo PNG, JPEG o WebP.
- Mensaje final, de hasta 180 caracteres.

El mensaje inicial es **Gracias por tu visita. ¡Te esperamos pronto!**. Puedes cambiarlo por el mensaje de tu restaurante.

## Precuenta

Antes de cobrar se imprime con el título **PRECUENTA**, los datos del restaurante, las unidades aún pendientes y su total. Si hubo pagos parciales, solo incluye el saldo que queda por pagar.

## Nota de venta

Cada nuevo pago, completo o parcial, genera automáticamente una **NOTA DE VENTA** en la cola de impresión asignada a Caja. Contiene únicamente los productos de ese pago, importe, medio de pago, recibido, vuelto y referencia de la persona cuando se haya indicado.

Si Caja no tiene impresora asignada, el pago se conserva y la nota queda bloqueada en Tickets hasta resolver su destino. Para copias adicionales usa Reimprimir desde Tickets, con su motivo. La copia se identifica como reimpresión.

Los cobros registrados antes de esta actualización conservan su historial y no generan notas automáticamente al actualizar.

## Logo y datos guardados

El logo se reduce para la app y se prepara una versión en blanco y negro para las precuentas y notas. Puedes desactivar **Imprimir logo** y conservarlo en la app. La impresión de imágenes depende del soporte de la ticketera para el [formato raster ESC/POS utilizado](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html).

Cada ticket nuevo conserva una copia de los datos del restaurante usados al crearlo. Editar la configuración afecta a los nuevos tickets; las reimpresiones conservan la presentación del original. Las comandas de preparación muestran el nombre del restaurante.

El RUC se guarda como texto y se comprueba su longitud y formato numérico. No se consulta un servicio externo para validarlo. Los datos y el logo quedan incluidos en los respaldos de la base de datos.

Si otro administrador cambia la configuración mientras la editas, pulsa **Recargar datos actuales**, revisa y vuelve a guardar. Si hay un corte de conexión al guardar, usa **Confirmar resultado** para reintentar la misma solicitud.

Código e interfaz compilada. No se ejecutaron pruebas de guardado ni de impresión; las pruebas funcionales quedan a cargo del propietario.

Actualización 2.7.3: la vista previa de Tickets muestra el logo en blanco y negro a partir de los mismos datos raster enviados a la ticketera. El encabezado y el mensaje final están centrados; los productos conservan su lectura a la izquierda y los importes se alinean a la derecha. Si el ticket se creó sin logo o con la impresión del logo desactivada, conserva esa presentación. En el papel, el resultado depende también del ancho y soporte de imágenes de la ticketera configurada.
