# Cobrar una mesa por partes

Entra como caja o administrador, abre un turno de caja y accede a **Caja → Precuenta** de la mesa. También puedes abrir la precuenta desde la propia mesa.

1. En **Cobrar toda la mesa o una parte**, indica cuántas unidades paga esta persona de cada producto. Usa cero para dejarlo pendiente.
2. Puedes pulsar **Limpiar selección** para empezar una cuenta individual, o **Todo lo pendiente** para cobrar el saldo completo.
3. Agrega una persona o referencia opcional y elige Efectivo, Yape/Plin o Tarjeta.
4. Para efectivo, introduce lo recibido. Se calcula el vuelto. Los otros medios registran el importe exacto seleccionado.
5. Confirma. El sistema conserva las unidades pagadas y muestra el saldo pendiente. Cuando todo queda pagado, libera la mesa.

Ejemplo: de tres refrescos, una persona puede pagar uno y otra persona los dos restantes. Cada pago puede usar un medio distinto. Esta etapa divide por unidades completas; no fracciona el precio de una misma unidad entre varias personas.

## Historial, precuentas y caja

El detalle de la atención muestra el total consumido, lo pagado, lo pendiente y cada pago con sus productos, cantidades, referencia, responsable y medio de pago. Los cobros anteriores a esta actualización siguen visibles.

Cada pago se registra en el turno de caja abierto en ese momento. Si el turno cierra antes de terminar la mesa, los pagos siguientes pertenecen al turno que se abra después. Solo el efectivo afecta al efectivo esperado; los demás medios se muestran aparte.

Las precuentas nuevas muestran exclusivamente las unidades pendientes. Una precuenta anterior a un pago queda desactualizada y no se puede reimprimir: genera una nueva. Las precuentas bloqueadas, fallidas o en cola se invalidan al registrar un cobro. Si una está enviándose o tiene resultado incierto, primero resuélvela desde Tickets.

## Operaciones relacionadas

- Una línea con unidades pagadas no se puede anular con la anulación normal. Las devoluciones y anulaciones parciales requieren otra etapa.
- Una cuenta con pagos parciales se puede trasladar a una mesa libre. No se puede unir con otra cuenta en esta versión.
- Para agregar nuevos pedidos a una mesa que queda por cobrar, caja o administración puede reabrir su atención. Los pagos realizados se conservan.
- Si otro dispositivo paga unidades seleccionadas, el servidor rechaza el cobro desactualizado y pide revisar las cantidades.
- Si se interrumpe la conexión durante el cobro, reintenta la misma operación. La referencia se guarda en el navegador para consultar el resultado sin duplicar el pago. Mantén habilitado el almacenamiento del navegador.

Reinicia el servidor y recarga los navegadores para aplicar esta actualización. Las tablas nuevas se incorporan al iniciar, conservando los cobros anteriores. Se generó la interfaz; las pruebas funcionales quedan a cargo del propietario.

Actualización 2.7.1: el efectivo recibido se escribe en un campo de texto decimal para evitar cambios por rueda del mouse o flechas del control numérico. Admite punto o coma y hasta dos decimales; convierte directamente a céntimos enteros sin redondear una entrada con decimales extra. Se muestran recibido y vuelto antes de cobrar, con botones de monto exacto y billetes. El servidor comprueba que el importe en céntimos coincida con el texto enviado. Los tickets anteriores conservan los importes registrados.

## Permiso de cobro para mozos (2.9)

Administración puede activar **Puede registrar cobros** desde Administrar → Equipo → Editar persona. El permiso está desactivado inicialmente para los mozos existentes y nuevos. Caja y administración mantienen el cobro por su rol.

El mozo autorizado entra a Mesas, abre la mesa y pulsa **Precuenta y cobro**. Puede cobrar toda la cuenta o unidades seleccionadas, en efectivo, Yape/Plin o tarjeta. Debe existir un turno abierto por caja o administración. Cada pago conserva el usuario que lo registró y se incluye en el turno activo; genera su nota de venta en Caja.

El permiso no habilita apertura/cierre de caja, gastos, anulaciones, cambios de mesas, reportes ni configuración. El mozo puede consultar en su historial las atenciones en las que envió pedidos o registró pagos. Los tickets fallidos y reimpresiones siguen siendo gestionados por caja o administración.

Editar el usuario cierra sus sesiones para aplicar los cambios: el mozo debe volver a iniciar sesión. Reinicia el servidor y recarga los navegadores después de actualizar esta versión. Interfaz compilada; pruebas funcionales a cargo del propietario.

## Responsable de cada cobro (2.9.1)

Cada nuevo pago conserva nombre, usuario y rol de quien cobró, y la mesa y espacio en que se registró. Esta identificación permanece aunque después se renombre al usuario o se traslade la cuenta. Los pagos anteriores se vinculan a los datos disponibles al actualizar; no se pueden reconstruir nombres o roles que hubieran cambiado antes.

El historial de la atención, los últimos cobros, los turnos de caja, el reporte Detalle de cobros y su CSV identifican **Cobrado por**. La nota de venta también muestra al responsable. Fecha, importe, medio, recibido, vuelto, productos, turno y usuario quedan vinculados al pago. Cada persona debe entrar con su propia cuenta para que el registro corresponda a quien realizó el cobro.

Actualización 2.9.2: al iniciar PROBAR-DEMO.cmd se habilita una sola vez el cobro de los mozos de demostración existentes (Ana y Luis). Después se conserva cualquier cambio de permisos realizado por administración. Al crear usuarios desde Equipo, el permiso de cobro aparece marcado inicialmente y puede desmarcarse antes de guardar. La precuenta diferencia la falta de permiso y la falta de turno abierto.

## Pago mixto (3.0)

En Medio de pago elige **Mixto**. Distribuye el importe del cobro entre Efectivo, Yape/Plin y Tarjeta; utiliza al menos dos medios y deja en blanco los no usados. La suma debe coincidir exactamente con el importe seleccionado. Puede aplicarse tanto al saldo completo como a productos de un pago parcial.

Si hay una parte en efectivo, escribe por separado el efectivo recibido. El vuelto se calcula contra la parte aplicada en efectivo, no contra todo el cobro. Ejemplo: para S/ 50.00, S/ 20.00 en efectivo y S/ 30.00 por Yape/Plin; si recibes un billete de S/ 50.00, devuelve S/ 30.00. La caja suma S/ 20.00 de efectivo vendido y S/ 30.00 de Yape/Plin.

Se registra un solo cobro y una sola nota de venta con sus medios desglosados. Los productos se pagan una sola vez. El historial, últimos cobros y turnos muestran los componentes; el reporte de medios de pago y CSV distribuye los importes entre sus medios reales. La cantidad de cobros por medio cuenta las participaciones de cada medio; un cobro mixto puede aparecer en más de un medio, mientras el resumen diario lo cuenta una sola vez.

En el historial y reporte, Recibido total suma los importes digitales y el efectivo recibido antes del vuelto. La nota de venta indica el efectivo recibido por separado. Los cobros anteriores se conservan y se interpretan según su medio original. Reinicia el servidor y recarga los navegadores. Interfaz compilada; pruebas funcionales a cargo del propietario.
