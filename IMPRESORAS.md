# Ticketeras de red — Mesa Lista 2.1

Este módulo imprime desde la PC servidor mediante TCP y ESC/POS, sin diálogo del navegador. Está preparado para ticketeras compatibles de 80 mm con conexión Ethernet o Wi-Fi y puerto de impresión RAW habilitado. No implementa USB, Bluetooth, impresión por un recurso compartido de Windows ni controladores propietarios.

## Configuración

1. Reinicia el servidor después de actualizar los archivos: Ctrl+C en su terminal y `node server.js`. Actualiza también la página del navegador.
2. Ingresa como administrador. Abre **Administrar → Impresoras → + Ticketera**.
3. Escribe un nombre identificable, por ejemplo «Cocina principal» o «Caja».
4. Selecciona **Impresora de red (IP y puerto)** y escribe la IP local y el puerto TCP configurados en tu ticketera. El campo propone 9100; cámbialo si tu equipo usa otro puerto. No pongas la IP del celular ni la dirección de la aplicación.
5. Elige 48 o 42 columnas para papel de 80 mm. Empieza con CP850, página 2, y comprueba los acentos mediante **Imprimir prueba**. El ancho útil, la tabla de caracteres y el corte dependen del modelo.
6. Guarda la ticketera y asígnala en **Destinos de impresión** a Cocina, Bar, Heladería o Caja. Puedes usar una sola ticketera para varias áreas.
7. Confirma en el papel la recepción, los márgenes, los acentos y el corte antes de empezar el servicio. Si el equipo no tiene cortador, desactiva esa opción.

La IP debe ser una IPv4 local: 10.x.x.x, 172.16–31.x.x o 192.168.x.x. Es conveniente reservarla en el router para que no cambie. La PC y las ticketeras deben poder comunicarse dentro de la red del restaurante. La aplicación no descubre ni modifica la configuración de red del equipo automáticamente.

## Probar sin impresoras

Selecciona **Vista previa, sin imprimir** al crear la ticketera. Asigna las áreas, genera una prueba y abre **Tickets → Todos los estados → Ver ticket**. El estado será «Vista previa»: no se abrirá una conexión a la IP indicada.

## Comandas

Al confirmar un nuevo pedido, el servidor guarda los productos y los tickets en una misma transacción. Genera un ticket por cada área incluida en ese envío. No vuelve a imprimir los productos de comandas anteriores. Guarda mesa, espacio, mozo, hora y notas generales e individuales.

Los pedidos existentes antes de esta actualización no se envían automáticamente al papel. Los nuevos pedidos sin impresora asignada se guardan igualmente y crean tickets «Sin destino», que caja o administración debe revisar.

## Precuentas

Desde la precuenta de una mesa, pulsa **Imprimir precuenta en caja**. Incluye todos los productos de la cuenta y el total. Se envía al destino Caja y no registra un cobro. Si ya hay una precuenta pendiente de esa mesa, resuelve su ticket antes de generar otra.

## Estados y recuperación

| Estado | Qué significa y qué hacer |
|---|---|
| Sin destino | No hay impresora activa para el área. Configúrala y pulsa Reintentar. |
| En cola | Ticket guardado, esperando al servidor. |
| Enviando | La PC está procesando su envío. |
| Enviado por red | Se completó la escritura TCP. Comprueba que salió el papel. |
| No se pudo conectar | Falló antes de intentar escribir los datos. Revisa IP, puerto y encendido, y pulsa Reintentar. |
| Revisar papel | El envío pudo haber sido parcial o el servidor se interrumpió. Comprueba el original antes de pedir una copia. |
| Vista previa | Simulación sin conexión a la impresora. |
| Cancelado | Se canceló el trabajo de impresión; no se modificó el pedido ni el consumo. |

No hay reintentos automáticos después de un error: la cola conserva el problema para revisión. Los tickets que nunca comenzaron a enviarse continúan al reiniciar. Los que estaban enviándose pasan a «Revisar papel»; la recuperación de un servidor interrumpido puede tardar hasta 30 segundos.

**Reimprimir** solicita motivo y confirmación de que se revisó el papel. La copia conserva el contenido original y lleva «REIMPRESIÓN» y el número del ticket original. Se registra cada intento, el destino utilizado y los bytes enviados. Los mozos consultan sus tickets; caja y administración pueden resolver pendientes y generar copias. Solo administración configura impresoras y destinos.

Cambiar la asignación de un área afecta a los tickets nuevos. Los ya en cola conservan la impresora asignada. Cambiar la IP, puerto, codificación o ancho de esa impresora se aplica a sus próximos intentos, incluidos trabajos pendientes. Un intento en curso conserva su configuración inicial. Pausar una impresora bloquea sus pendientes sin cancelar pedidos.

## Alcance de la verificación

Se probaron envío TCP a un receptor local, bytes ESC/POS, caracteres españoles, separación por área, precuentas, transacciones, recuperación, reimpresiones y permisos. No se probó una ticketera física. Una escritura TCP completada no demuestra que salió papel ni detecta de forma fiable falta de papel, tapa abierta o atasco. No se promete compatibilidad con cualquier modelo solo por ser de 80 mm.

La configuración de caracteres se basa en la selección de página [ESC t de Epson](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_lt.html), y el corte en [GS V](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_cv.html). Los valores admitidos dependen del modelo. Para las garantías de escritura por TCP, véase [net.Socket de Node.js](https://nodejs.org/api/net.html#socketwritechunk-encoding-callback).

## Actualizar sin perder datos

Esta actualización agrega tablas de impresión al iniciar y conserva las tablas existentes. Ejecuta **RESPALDAR.cmd** antes de actualizar. Si usas el ZIP de la etapa 2, detén el servidor, copia su código sobre la instalación y conserva tu carpeta `datos`: el ZIP no contiene una base de datos ni cuentas de prueba persistidas. Vuelve a iniciar y recarga el navegador. Las instrucciones generales están en LEEME.md.

Quedan para las siguientes etapas el historial completo de ventas, cierre de caja, reportes CSV/PDF y captura de carta mediante OCR.
