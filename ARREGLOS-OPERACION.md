# Actualización de operación 3.1

Reinicia el servidor y recarga los navegadores. El código comprueba que la versión del servidor coincida con la pantalla antes de permitir operaciones. Esta entrega incorpora código y compilación; no se ejecutaron pruebas funcionales ni se cambió la configuración de Windows del equipo.

## Cobro separado de preparación

Un pago completo libera la mesa para nuevas atenciones, pero el pedido permanece en Preparación hasta marcarlo entregado. Cocina consulta productos pendientes de todas las atenciones, incluidas las pagadas. Cada tarjeta identifica mesa, espacio, fecha y referencia del pedido para distinguir dos atenciones que usaron la misma mesa.

Los pedidos anteriores que quedaron sin marcar Entregado pueden aparecer ahora, aunque su cuenta se haya cobrado. Revisa su fecha antes de preparar: el programa no supone automáticamente que fueron entregados.

## Permisos de preparación y entrega

En **Administrar → Equipo → Editar persona** existen permisos separados para cobrar, preparar y marcar entrega. Caja y administración conservan estas funciones por su rol. Los mozos pueden marcar entrega inicialmente; la preparación requiere habilitación. Sus permisos se comprueban en el servidor, además de controlar los botones.

El mozo que solo puede entregar ve **Entregas**, con los productos listos. Un usuario con preparación ve **Preparación**, con filtros por área y etapa. Al editar permisos, la persona debe volver a iniciar sesión.

## Anulaciones por cantidad

Caja o administración puede anular una o varias unidades que aún no estén pagadas. Se conserva la cantidad original, cada anulación, el motivo y responsable. Las unidades pagadas quedan protegidas y la cocina recibe un aviso por la cantidad anulada. El historial y el reporte de anulaciones incluyen las operaciones parciales.

## Devolver un pago

Desde **Historial → detalle de la atención → pago → Devolver este pago**, caja o administración puede registrar la devolución completa de ese pago. Requiere un turno de caja abierto, un motivo y confirmar que el dinero ya se devolvió al cliente. La app registra la operación; no realiza transferencias bancarias.

Se conserva el pago original, se registra el dinero devuelto en los medios vigentes del pago, se anulan las unidades de ese pago y se generan avisos para preparación y Caja. Si la atención tenía otros pagos, estos se conservan. La devolución no reabre la cuenta ni ocupa una mesa liberada.

La devolución es del pago completo elegido: para un cobro parcial devuelve ese cobro, no toda la atención. No incluye elegir solo algunas unidades de un mismo pago ni devolver importes arbitrarios. Los cobros de la primera versión que aparecen con identificador legacy no admiten este ajuste desde el panel.

Si falta efectivo registrado para devolverlo, primero revisa el fondo y los movimientos del turno. No registres ingresos ficticios para forzar la operación.

## Corregir un medio de pago

En el mismo detalle usa **Corregir medio**. Elige el medio registrado, el correcto, el importe a trasladar y el motivo. Puede corregirse todo o parte del importe disponible en ese medio. Se conserva el pago original y se registra un ajuste entre medios en el turno actual; no se vuelven a cobrar los productos.

Ejemplo: un pago de S/ 30 se registró como efectivo, pero fue Yape/Plin. La corrección descuenta S/ 30 del efectivo y suma S/ 30 a Yape/Plin en el turno donde registras el ajuste. No modifica un cierre de caja anterior. La nota original se conserva y se genera un ticket separado de corrección.

Si el pago se devuelve después de una corrección, se usan los medios vigentes. No se puede corregir ni devolver nuevamente un pago ya devuelto.

## Caja y reportes

Caja incluye devoluciones y correcciones en el turno activo. El esperado de efectivo contempla estos ajustes además de fondo, ventas, otros ingresos y gastos.

El reporte diario separa cobrado bruto, devuelto y cobrado neto. Las devoluciones se descuentan en su fecha, y los medios incorporan correcciones en la fecha del ajuste. El reporte de productos descuenta unidades devueltas en la fecha de devolución: puede mostrar valores negativos si corresponde devolver ventas de días anteriores.

El detalle del pago conserva el medio original y muestra sus correcciones, distribución vigente y devolución. El consumo vigente refleja las cantidades que permanecen después de anulaciones y devoluciones; no es una foto histórica inmutable.

## Respaldos

Cada copia nueva pasa por la comprobación de integridad de SQLite antes de ofrecerse como disponible. En **Administrar → Respaldos → Configurar** puedes indicar una carpeta adicional en otro disco o unidad de red. Es una ruta de la PC servidor, por ejemplo E:\RespaldosMesaLista.

La copia adicional se verifica comparando su contenido con el respaldo local. Si falla, la copia local sigue disponible y el panel muestra el error de la copia adicional. Las copias externas no se eliminan automáticamente. La recuperación sigue el procedimiento de RESPALDOS.md y debe comprobarse en una ubicación aparte antes de depender de ella.

## Inicio y cierre del servidor

Ctrl+C solicita un cierre ordenado, espera los procesos de impresión y respaldo y cierra la base. Si no consigue terminar en 20 segundos, finaliza y la siguiente apertura aplica los mecanismos de recuperación de las colas.

El inicio manual sigue disponible con INICIAR.cmd y la demo con PROBAR-DEMO.cmd. Opcionalmente, **INSTALAR-INICIO-AUTOMATICO.cmd** registra una tarea de Windows para iniciar la instalación real al entrar con ese usuario, en el puerto 3000. No se ha ejecutado este instalador desde Codex. No abras el inicio manual simultáneamente. Puedes retirar la tarea con QUITAR-INICIO-AUTOMATICO.cmd. Mover la carpeta requiere reinstalar la tarea. Los registros quedan en datos\registros.

Esta opción necesita una sesión de Windows y que el equipo permanezca encendido; no es un servicio que arranque antes de iniciar sesión. La configuración del equipo puede requerir permisos para registrar tareas.

## HTTPS opcional

El servidor permite configurar TLS_CERT_FILE y TLS_KEY_FILE con rutas de un certificado y su clave antes de iniciar la instalación real. Deben configurarse juntos. Al usarlos, el servidor anuncia HTTPS y añade Secure a las cookies de sesión. El certificado debe corresponder al nombre usado por los dispositivos y ser de confianza para ellos. La demo conserva HTTP local.

El código no instala certificados ni abre puertos del router. La elección y configuración de la red del restaurante sigue siendo parte de la instalación.

## Límites que siguen pendientes

Las verificaciones funcionales con varios dispositivos, impresoras físicas y recuperación de respaldos quedan a cargo del propietario. Los archivos de pruebas antiguos no se han ejecutado ni actualizado como certificación de esta entrega. Inventario, variantes generales, reparto, operación sin conexión, múltiples sucursales y devoluciones parciales dentro de un mismo pago siguen fuera de esta etapa.
