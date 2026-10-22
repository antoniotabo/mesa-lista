# Historial y turnos de caja

Actualización del 17 de octubre de 2026. Código incorporado; pruebas funcionales a cargo del propietario.

Reinicia el servidor y recarga el navegador para cargar los cambios. Al arrancar se añaden las tablas de caja y la relación de cobros con turnos, conservando los registros anteriores. Mantén tus respaldos habituales antes de actualizar.

## Historial

En **Historial → Por mesa y atención**, elige fechas, nombre de mesa y estado. La fecha corresponde a la apertura de la atención, en horario de Perú. Cada fila reúne todos los pedidos y adicionales de esa atención. Una mesa reutilizada después del cobro tendrá otra atención independiente.

El detalle muestra productos, notas, responsables, horarios, total y cobro. Los mozos consultan las atenciones en las que enviaron pedidos; caja y administración consultan todas. Hay páginas de 30 registros, sin el límite anterior de las últimas 100 comandas.

## Caja

1. Entra como caja o administrador y abre **Caja → Abrir caja**.
2. Indica el efectivo inicial. Existe un único turno compartido por todo el restaurante.
3. Cobra las mesas normalmente. Cada cobro se vincula al turno abierto. Sin turno abierto se pueden tomar pedidos, pero no cobrar.
4. Registra otros ingresos, gastos o retiros con su importe y motivo. Estos movimientos afectan solo al efectivo y no representan ventas.
5. Al cerrar, cuenta el efectivo y registra el importe. Si hay diferencia, escribe una explicación. El cierre queda conservado y no se edita desde la interfaz.

Efectivo esperado = fondo inicial + ventas cobradas en efectivo + otros ingresos − gastos y retiros. Se utiliza el total vendido, descontando el vuelto del dinero recibido. Yape/Plin y tarjetas se muestran aparte.

Si hay nuevos cobros o movimientos mientras preparas el cierre, el servidor pide revisar nuevamente los importes. Las mesas aún sin cobrar permanecen abiertas; su cobro pertenecerá al turno abierto en ese momento.

En **Historial → Turnos de caja** puedes consultar las aperturas, cobros, movimientos, responsables, cierre, efectivo contado y diferencia. Los cobros anteriores a este módulo conservan su detalle y se identifican como anteriores, sin asignarlos artificialmente a un turno nuevo.

Pendiente para siguientes etapas: anulaciones con motivo, mover/unir mesas, dividir cuentas, reportes ampliados, respaldos automáticos y carga de carta desde una foto.
