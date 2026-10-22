# Mesa Lista 3.2 — instalación en Windows

## Instalar en la PC principal

Ejecuta Mesa-Lista-3.2-Instalar.exe y pulsa Instalar. Incluye Node.js y la interfaz compilada. No requiere instalar Node, Visual Studio ni paquetes npm. Esta entrega es para Windows 10/11 de 64 bits con .NET Framework 4.5 o superior habilitado. El instalador no tiene firma digital de un editor comercial.

Se instala para el usuario actual en **%LOCALAPPDATA%\MesaLista\programa**. La base de datos se crea al abrir la app en **%LOCALAPPDATA%\MesaLista\datos\mesa-lista-v2.sqlite**. Los respaldos se conservan dentro de datos\respaldos. No incluye usuarios, ventas ni configuración del desarrollador. La primera apertura genera un catálogo y mesas iniciales que debes adaptar.

El instalador crea un acceso directo **Mesa Lista** en el escritorio y en el menú Inicio. Ábrelo: inicia el servidor y muestra la aplicación en el navegador predeterminado. Crea el administrador desde la PC principal e ingresa con admin y tu contraseña. Configura restaurante, carta, mesas, usuarios, caja, respaldos e impresoras. No actives a la vez el inicio automático de una instalación anterior que ocupe el mismo puerto.

## Abrir en celulares

Desde Administración → Conexión, copia la dirección de la PC principal. Los celulares usan esa dirección en su navegador y deben estar en la misma red. No instalan el EXE. Si Windows solicita acceso de red, permite la red privada del restaurante; si no conecta, configura una regla de entrada TCP para el puerto de la app en el firewall privado. El instalador no cambia el firewall ni el router.

Puedes elegir una IP que actualmente pertenezca a la PC y cambiar el puerto desde ese panel, abierto usando localhost en la PC principal. La selección no asigna una IP nueva a Windows: reserva esa IP en el router para que se mantenga. El puerto se aplica al reiniciar el servidor. La variable PORT, si existe en Windows, tiene prioridad. Para modificar el puerto si no se logra abrir la app, edita config-servidor.json dentro de programa.

## Cerrar o reiniciar

Cerrar el navegador mantiene el servidor encendido para los celulares. Usa el icono de Mesa Lista junto al reloj de Windows → Cerrar servidor. Espera a que desaparezca antes de actualizar o volver a abrir. El acceso directo vuelve a iniciar el servidor. No se inicia solo al encender Windows: ábrelo al comenzar el servicio. La PC debe permanecer encendida, sin suspensión, mientras atiendes.

## Actualizar y conservar datos

Crea y descarga un respaldo desde Administrar → Respaldos. Cierra el servidor desde su icono. Ejecuta el nuevo instalador con el mismo usuario de Windows: conserva la carpeta datos y config-servidor.json. El programa se reemplaza, la base de datos no. No borres la carpeta MesaLista ni cambies de usuario de Windows esperando encontrar los mismos datos; la instalación es por usuario.

Una instalación antigua extraída de un ZIP guarda datos en otra ruta. No migra automáticamente: conserva la instalación anterior, respáldala y recupera la copia en la carpeta de datos del instalador, siguiendo RESPALDOS.md con ambos servidores detenidos. No mezcles bases con archivos -wal o -shm de otra instalación. Los datos de demostración también son independientes.

## Impresión y documentos

En Administrar → Impresoras, activa solo los destinos con ticketera. Los destinos desactivados conservan sus tickets digitales y no generan alertas por falta de impresora. No se detiene un envío que ya empezó: revisa el papel. Activar un destino no imprime documentos anteriores automáticamente.

En Caja → Últimos cobros y en Historial puedes descargar la nota de venta en PDF para enviarla al cliente. Usa los datos y el logo guardados en el ticket original, si existe; los cobros antiguos sin ticket se reconstruyen con la configuración actual. La descarga no cobra de nuevo ni envía mensajes por sí sola. Una devolución o corrección queda en su registro separado; el PDF conserva la nota de venta original.

La precuenta informa dentro de su ventana si quedó en cola, salió por red, está en vista previa o se conserva solo digital. El envío por red no confirma físicamente el papel. Las ticketeras deben admitir ESC/POS por red; esta versión no integra USB/Bluetooth.

## Alcance de la entrega

Se compilaron la interfaz, el acceso de escritorio y el instalador. No se ejecutaron pruebas funcionales ni se instaló el EXE en esta PC, según indicación del propietario. Antes de uso diario, el propietario debe verificar en el cliente cobros, comandas, logo y PDF, acceso por Wi-Fi, cierre de caja y recuperación de respaldos. No se promete compatibilidad con cualquier sistema operativo, red o modelo de impresora.
