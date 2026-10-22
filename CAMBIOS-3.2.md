# Revisión del frente y entrega 3.2

## Problemas encontrados y cambios

- Cocina dibujaba una tarjeta por producto: ahora agrupa por atención de mesa y conserva los envíos adicionales dentro de la misma tarjeta. Una nueva atención de una mesa ya cobrada se mantiene separada de su atención anterior si esta aún tiene productos por entregar.
- Se conservan cantidades, notas, áreas, hora y responsable de cada envío. Hay acciones por producto y acciones para avanzar los pendientes/listos de la mesa en conjunto. Si otro dispositivo modificó un producto, se rechaza la acción conjunta y se pide revisar; no se aplica parcialmente.
- Caja no tenía acceso al documento de cada cobro: se añadió descarga de nota de venta PDF en Últimos cobros y en el detalle del Historial. Conserva los productos, importes, datos y logo del ticket original. No crea otro cobro ni manda mensajes automáticamente. El PDF es de 80 mm, con varias páginas cuando haga falta.
- El aviso general podía quedar detrás de la ventana de precuenta: ahora se muestra el resultado dentro de esa ventana y se actualiza con el estado del ticket. No se afirma que salió papel cuando solo existe confirmación de envío por red.
- Cada destino de impresión tiene un interruptor. Desactivarlo conserva documentos solo digitales, sin pendientes por falta de impresora. Se retiran de la cola los tickets de ese destino que aún no comenzaron a enviarse. Los envíos iniciados o inciertos conservan su estado para revisión. Reactivar no imprime automáticamente tickets históricos.
- Se ampliaron botones de servicio, volver a mesas, acciones de cocina y PDF. Se corrigieron ajustes de ancho y distribución en pantallas pequeñas; la navegación móvil se puede desplazar horizontalmente.
- Administración → Conexión muestra direcciones actuales y permite elegir la IP real de la PC y el puerto, sin editar código. La edición requiere administrador desde localhost. No altera la IP de Windows ni el router; el servidor ya escucha en todas las interfaces locales. El puerto requiere reiniciar y abrir la nueva dirección.
- Se corrigió un paréntesis sobrante en el lector del archivo de configuración del puerto.

## Instalador

El EXE incluye Node.js y la interfaz compilada. Crea accesos directos de escritorio e Inicio e instala para el usuario de Windows actual. El acceso abre el navegador e inicia el servidor sin consola. Un icono junto al reloj permite abrir la app, consultar su carpeta de datos y cerrar el servidor de forma ordenada. Abrir el acceso otra vez utiliza la misma instancia del lanzador.

El programa queda en %LOCALAPPDATA%\MesaLista\programa y los datos en %LOCALAPPDATA%\MesaLista\datos. Actualizar conserva la base y la configuración del puerto. Los datos de una instalación anterior extraída del ZIP no se migran automáticamente. Consulta INSTALACION-EXE.md.

## Lo indispensable antes de usarlo diariamente

La copia externa de los respaldos, el acceso desde la red real del cliente y la compatibilidad de la ticketera deben quedar configurados. El propietario debe verificar un ciclo real completo de pedido, preparación, precuenta, pago mixto, PDF, cierre y recuperación de respaldo. El frente no permite asegurar por sí solo el funcionamiento físico de esos equipos.

Se compilaron interfaz y ejecutables y se comprobó sintaxis del servidor. No se inició la app, no se ejecutaron pruebas funcionales y no se instaló el EXE, conforme a la indicación del propietario. Instalador sin firma comercial, dirigido a Windows 10/11 de 64 bits; no es una entrega para cualquier sistema operativo.
