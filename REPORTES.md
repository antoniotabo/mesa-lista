# Reportes y CSV

Reinicia el servidor y recarga los navegadores. Entra como caja o administrador y abre **Reportes**. Elige Desde/Hasta y pulsa **Consultar / actualizar**. Se admiten hasta 366 días por consulta, incluyendo ambos extremos, en horario de Perú.

## Interpretar los importes

- **Consumo vigente del rango:** productos de los pedidos enviados en esas fechas, excluyendo los que actualmente están anulados. Incluye productos pagados y pendientes.
- **Cobrado en el rango:** pagos realizados en esas fechas. Incluye pagos parciales y cobros anteriores a este módulo. El efectivo se cuenta por el importe vendido, descontando el vuelto.
- **Anulado en el rango:** valor de los productos según la fecha en que se anularon. Se conserva su responsable y motivo.
- **Pendiente actual:** saldo actual de todas las mesas abiertas, aunque su atención empezara fuera del rango elegido. No es una reconstrucción del saldo al finalizar una fecha pasada.

Consumo y cobro pueden diferir porque los pagos ocurren en otro momento o solo cubren una parte de la mesa. Los ingresos adicionales y gastos de caja no se suman como ventas: se consultan en los turnos de caja.

Una anulación posterior modifica el consumo vigente de la fecha original del pedido. El reporte de anulaciones la muestra en la fecha de la anulación. No se presenta el consumo como una foto histórica inmutable.

## Vistas

1. **Por día:** consumo vigente, cobrado y cantidad de pagos agrupados por día. Solo aparecen días con actividad.
2. **Medios de pago:** importe y número de pagos de efectivo, Yape/Plin y tarjeta.
3. **Productos cobrados:** unidades pagadas y su importe, usando la fecha de cada pago. Los pagos parciales solo aportan las unidades pagadas en el rango.
4. **Detalle de cobros:** fecha, mesa actual, responsable, persona/referencia, medio, importe, recibido, vuelto y turno.
5. **Consumo:** productos vigentes por fecha del pedido, mesa de origen, mesa actual y mozo.
6. **Anulaciones:** productos, cantidades, importes, fechas, motivos y responsables.
7. **Pendientes actuales:** consumo, pagado y saldo de cada mesa abierta, sin filtro de fechas.

Los nombres de mesas reflejan la cuenta actual después de mover o unir mesas. El consumo conserva también la mesa de origen de cada pedido. Los productos se agrupan por identificador, nombre registrado y área, conservando los precios históricos en los importes.

## Descargar para Excel

Selecciona una vista y pulsa **Exportar CSV**. La descarga incluye todos los registros de esa vista; la pantalla muestra páginas de 30. El CSV se genera con los datos disponibles al descargar. Si hubo cambios, puede diferir de una consulta anterior; pulsa Consultar / actualizar para renovarla.

Se usa UTF-8 con marca de codificación, punto y coma como separador y coma decimal. Si Excel no divide las columnas automáticamente, importa el archivo desde Datos → Desde texto/CSV, eligiendo UTF-8 y punto y coma.

Los reportes tienen acceso restringido a caja y administración. Se añadieron código e interfaz compilada; las pruebas funcionales quedan a cargo del propietario.
