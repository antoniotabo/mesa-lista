# Revisión de preparación para instalar

Fecha: 17 de octubre de 2026. Versión revisada: 3.0.0. Revisión estática del código; no se ejecutaron pruebas, no se levantó el servidor y no se verificaron impresoras físicas.

Conclusión: la aplicación tiene una base amplia para un piloto en un restaurante con servidor Windows y dispositivos en la misma red. Todavía no está validada como una entrega lista para cualquier negocio. Las funciones implementadas y la compilación de la interfaz no equivalen a validación operativa.

## Hallazgos que requieren atención

### 1. Alta prioridad: cobrar antes de preparar oculta productos de cocina

En lib/partial-payments.js, al completar el cobro se marca el servicio como cerrado y se libera la mesa. lib/service.js solo incluye servicios no cerrados en el estado activo. La pantalla Kitchen de src/main.jsx toma sus productos de esos servicios. Además, la acción status rechaza productos de servicios cerrados.

Por tanto, si un cliente paga primero y cocina todavía está preparando, el producto deja de aparecer en esa pantalla y no puede avanzar su preparación desde esa acción. El ticket guardado en la cola no se elimina, pero no resuelve la pérdida de seguimiento en pantalla. Es especialmente relevante para comida para llevar y atención con pago anticipado.

Propuesta: separar los estados financieros de los estados de preparación y entrega. Cocina debe consultar todos los productos pendientes, incluso cuando la cuenta esté pagada. El pago no debe borrar el seguimiento del pedido.

### 2. Prioridad media: autorización de preparación incompleta

En lib/service.js, la acción status valida la existencia y transición del producto, pero no valida un permiso de preparación. El servidor exige iniciar sesión, pero un mozo puede solicitar esa acción directamente aunque Cocina no aparezca en su menú.

Propuesta: decidir quién puede preparar y entregar, y aplicar esos permisos en el servidor. Ocultar un botón no establece la autorización de la operación.

### 3. Limitación operativa: corrección de cobros y cantidades

lib/cancellations.js impide anular líneas que ya tengan unidades pagadas, y la anulación normal comprende la línea completa. No hay un flujo para devolver dinero, corregir un medio de pago o anular una sola unidad de varias ya enviadas. lib/table-transfers.js tampoco permite unir cuentas con pagos parciales.

Propuesta: incorporar devoluciones y correcciones con motivo, autorización y movimientos compensatorios en caja. Conservar el pago original y registrar su ajuste. Añadir anulación por cantidad sin alterar unidades ya pagadas.

### 4. Limitación de instalación: HTTP y arranque manual

server.js usa un servidor HTTP y escucha en todas las interfaces; INICIAR.cmd ejecuta Node en una ventana que debe permanecer abierta. No hay un servicio de Windows instalado, recuperación automática del proceso ni un mecanismo coordinado que reinicie el servidor al actualizar el código. Ya se observaron incompatibilidades al cargar una interfaz nueva contra un servidor anterior.

Propuesta: preparar instalación y actualización controladas, indicador de versión del servidor/interfaz, arranque con Windows, registros de errores y cierre ordenado. Definir la red y protección del acceso antes de cada instalación. La versión actual está diseñada para uso local, no para abrir el puerto a Internet.

### 5. Respaldos: falta validar recuperación y ubicación independiente

lib/backups.js guarda las copias dentro del directorio de datos, normalmente en el mismo disco. Hay descarga manual, pero no copia automática a una ubicación independiente. La recuperación está documentada como un procedimiento manual.

Propuesta: agregar un destino externo configurable, verificar integridad de las copias y preparar una recuperación guiada. El propietario debe comprobar una restauración en una carpeta aparte antes de depender del sistema.

### 6. Validación pendiente de las funciones nuevas

Los archivos tests/integration.test.js y tests/printing.test.js corresponden a flujos anteriores. Por ejemplo, todavía crean usuarios sin can_collect, envían pedidos sin expectedService y cobran con el formato previo a los pagos por productos y turnos de caja. No constituyen evidencia de que la versión actual esté validada. No se ejecutaron en esta revisión, conforme a la preferencia del propietario.

Antes de iniciar operación real, el propietario necesita revisar cobros simples, parciales y mixtos; dos dispositivos operando sobre la misma cuenta; cancelaciones; caja; impresoras reales; corte de Wi-Fi; cierre inesperado del servidor y restauración de una copia. Una vez revisados, registrar qué versión y configuración se aceptaron.

## Límites del alcance actual

- Una instalación local y un directorio de datos por negocio; no existe gestión de varias sucursales o empresas en una sola instalación.
- Ticketeras de red por IP y puerto con ESC/POS; no hay integración general con USB, Bluetooth ni todos los modelos de impresora.
- La lectura de cartas depende del OCR de Windows y sus idiomas instalados.
- Los registros de Yape/Plin y tarjeta son manuales; no hay una integración que confirme automáticamente el dinero recibido.
- Los pedidos necesitan conexión con el servidor. Hay borradores y referencias para reintentar, pero no un sistema completo de operación y sincronización sin conexión.
- No se implementaron inventario por insumos, recetas, compras, descuentos, propinas, reparto con direcciones ni variantes generales por tamaño o sabor. Se incorporarían según el tipo de negocio; no todas son necesarias para el primer restaurante.
- Las entradas gratuitas están vinculadas a la categoría llamada Menú, no a una configuración general de combos.

## Fortalezas presentes en el código

Se usan importes enteros en céntimos, transacciones para pedidos y cobros, referencias para evitar repetir operaciones, control de versiones en varias ediciones, claves con scrypt, sesiones en cookies HttpOnly, permisos de cobro por usuario, historial de responsables, cola de impresión con intentos y estados inciertos, y respaldos consistentes de SQLite.

## Orden sugerido

Primero separar pago de preparación; luego cerrar los permisos de operaciones y añadir correcciones de cobro/cantidades. Después preparar instalación, recuperación y compatibilidad de versiones. Con eso, realizar un piloto con los equipos del primer restaurante y corregir lo observado antes de repetir la instalación en otros negocios.

## Seguimiento: código actualizado a 3.1 (18 de octubre de 2026)

Se incorporaron las correcciones de cobro/preparación, autorización de etapas, anulaciones por cantidad, devoluciones completas de un pago y correcciones de medios. También verificación de integridad y copia adicional de respaldos, cierre ordenado, HTTPS opcional y archivos para configurar el inicio automático con Windows. Los detalles y límites están en ARREGLOS-OPERACION.md. No se ejecutaron pruebas funcionales ni se activó la tarea de Windows. La validación operativa del piloto y las pruebas de impresoras/recuperación siguen pendientes; esta lista de cambios no certifica la instalación.
