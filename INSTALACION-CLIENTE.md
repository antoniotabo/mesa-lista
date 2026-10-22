# Instalar Mesa Lista 3.1 en el restaurante

## 1. Preparar la PC servidor

Usa una PC Windows que permanezca encendida durante el servicio. Instala Node.js 24 o superior desde el sitio oficial nodejs.org, con la opción de agregar Node al PATH. Si acabas de instalarlo, cierra y vuelve a abrir las ventanas de comandos.

Extrae el ZIP completo. Coloca la carpeta **Mesa-Lista** dentro de Documentos del usuario de Windows que atenderá el restaurante. No ejecutes el programa dentro del ZIP. Evita carpetas sincronizadas con OneDrive y unidades de red para alojar la base de datos activa; elige una carpeta local con permisos de escritura.

El paquete ya incluye la interfaz compilada. Para usarlo no necesitas Visual Studio, npm install ni compilar. Node.js se instala solamente en la PC servidor.

## 2. Primera apertura

1. Abre **INICIAR.cmd** dentro de Mesa-Lista y deja abierta su ventana.
2. En esa misma PC, abre **http://localhost:3000/**.
3. Crea el administrador con tu nombre y una contraseña de al menos 8 caracteres. Después ingresa con el usuario **admin** y esa contraseña. La primera creación solo se permite desde localhost en la PC servidor.
4. En **Administrar**, configura nombre del restaurante, RUC, dirección, teléfono, logo y mensaje de los tickets.
5. Adapta espacios, mesas, categorías, carta y áreas de preparación. La primera apertura puede crear mesas y productos iniciales: revísalos y retira lo que el cliente no vende.
6. Crea usuarios individuales para mozos, caja y administración. Activa el permiso para cobrar en los mozos que lo necesiten; así cada cobro conserva quién lo realizó.
7. Configura respaldos y las impresoras antes del servicio. Abre un turno de caja para registrar cobros.

Este ZIP no contiene la carpeta de datos del desarrollador, sus usuarios, sus ventas ni su configuración. Al arrancar se crea la carpeta **datos** del cliente.

## Cambiar el puerto del servidor

Abre **config-servidor.json** con el Bloc de notas. Cambia el número de puerto, por ejemplo:

```json
{
  "puerto": 3012
}
```

Guarda el archivo y reinicia el servidor. Ahora entra a **http://localhost:3012/** en la PC y a **http://IP-DE-LA-PC:3012/** desde los celulares. Elige un puerto libre entre 1 y 65535 y permite ese mismo puerto TCP en el firewall de la red privada. Esto cambia el puerto de la aplicación; el puerto de las ticketeras se configura por separado.

Funciona con INICIAR.cmd y con el inicio automático. Si está en segundo plano, cierra y vuelve a iniciar sesión en Windows para reiniciarlo. Si existe una variable de entorno PORT, su valor tiene prioridad sobre el archivo. Si falta el archivo o el campo puerto, se usa 3000. No hace falta recompilar.

## 3. Conectar celulares y otras laptops

Conecta los dispositivos a la misma red del restaurante. En la ventana del servidor aparece la dirección local de la PC; ábrela en el navegador de cada dispositivo. Por ejemplo, si muestra 192.168.1.50, la dirección será **http://192.168.1.50:3000/**. Usa la IP real mostrada, no copies este ejemplo sin revisarlo.

En el celular no uses localhost: esa palabra apunta al propio celular. Cada trabajador debe iniciar sesión con su usuario.

Si no abre, revisa que el servidor siga encendido, que Windows tenga la red del restaurante marcada como privada y que el firewall permita conexiones entrantes TCP al puerto 3000 en esa red privada. Las redes de invitados o con aislamiento de clientes pueden impedir la conexión. No abras este puerto hacia Internet ni configures reenvío de puertos en el router.

Conviene reservar la IP de la PC en el router para que los accesos de los celulares no cambien. Desactiva la suspensión automática de esa PC mientras se trabaja. La aplicación funciona mientras la PC servidor y la red local están disponibles.

## 4. Configurar ticketeras

En **Administrar → Impresoras**, agrega cada ticketera compatible con ESC/POS por red. Escribe su propia dirección IP y su puerto TCP; normalmente es **9100**, pero debes confirmar el de ese modelo. Asigna cada equipo a Cocina, Bar, Heladería o Caja según corresponda.

Las comandas se separan por área para imprimir, mientras el consumo completo sigue perteneciendo a la mesa. La precuenta se imprime desde la cuenta de la mesa y la nota de venta se genera al registrar el cobro.

Reserva también las IP de las ticketeras. Confirma en el equipo real el papel, ancho, acentos, logo y corte. El estado de envío por red no confirma por sí solo que salió el papel. Esta versión conecta directamente a impresoras de red; no incluye integración USB o Bluetooth.

## 5. Respaldo y cierre diario

En **Administrar → Respaldos**, activa las copias automáticas y configura, si está disponible, una carpeta adicional en otro disco o destino de respaldo. Descarga y conserva copias fuera de la PC. Las copias guardadas solamente en el mismo disco no protegen frente a la pérdida de ese disco.

Al finalizar, cierra el turno de caja. Si iniciaste con INICIAR.cmd, detén el servidor con **Ctrl+C** en su ventana antes de apagar Windows. No borres la carpeta datos: contiene los usuarios, configuración e historial del restaurante. Consulta RESPALDOS.md para recuperar una copia.

## 6. Inicio automático opcional

Después de configurar el restaurante, detén el inicio manual y ejecuta **INSTALAR-INICIO-AUTOMATICO.cmd**. El servidor iniciará en segundo plano cuando ese usuario inicie sesión en Windows. No es un servicio que se ejecute antes de iniciar sesión. No abras además INICIAR.cmd, porque ambos usarían el mismo puerto.

Deja la carpeta instalada en esa ubicación. Si la vas a mover, ejecuta primero QUITAR-INICIO-AUTOMATICO.cmd y vuelve a instalar la tarea desde la nueva ubicación. Los registros se guardan en **datos\registros**.

Para volver al modo manual, ejecuta QUITAR-INICIO-AUTOMATICO.cmd, cierra y vuelve a iniciar sesión en Windows para asegurar que el proceso anterior ya terminó, y luego abre INICIAR.cmd.

## 7. Actualizaciones

No extraigas un paquete nuevo encima de un servidor que esté atendiendo. Cierra el servicio, crea un respaldo y conserva una copia de la carpeta datos. Detén todas las instancias del servidor; si usa inicio automático, coordina su detención antes de reemplazar archivos. Actualiza los archivos del programa conservando **datos**, inicia de nuevo y recarga los navegadores con Ctrl+F5.

## Antes de atender al público

Esta entrega queda preparada para una instalación piloto. El propietario debe comprobar en la máquina del cliente un pedido completo por mesa, comandas físicas, precuenta, cobro simple y mixto, vuelto, registro del trabajador, cierre de caja y recuperación de un respaldo antes del uso diario. No se ejecutaron pruebas funcionales durante la preparación de este paquete.
