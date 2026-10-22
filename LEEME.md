# Mesa Lista 3.1 — operación del restaurante

Aplicación local para Windows y Linux. Esta entrega completa usuarios y roles, espacios, mesas y carta, y conserva el flujo básico de comandas, preparación, precuentas en pantalla y cobros. La impresión térmica por IP y puerto ya está implementada. Consulta IMPRESORAS.md para configurarla y conocer los estados de envío. El OCR y los reportes completos todavía no están implementados.

## Probar sin tocar los datos del restaurante

En Windows abre **PROBAR-DEMO.cmd**. Entra a **http://localhost:3001**.

| Usuario | Clave de demostración | Rol |
|---|---|---|
| admin | demo1234 | Administración |
| ana | demo1234 | Mozo |
| luis | demo1234 | Mozo |
| caja | demo1234 | Caja |

La demostración solo acepta conexiones desde esta PC. Guarda sus cambios en `datos-demo`, separado de los datos reales. Los datos de demostración pueden incluir la comanda usada durante la revisión visual. Nunca copies sus usuarios ni su base al restaurante.

## Arrancar el restaurante

1. Requiere Node.js 24 o superior. La interfaz ya está compilada: no necesitas instalar paquetes para usarla.
2. Cierra la versión anterior si sigue usando el puerto 3000.
3. En Windows abre **INICIAR.cmd**. En Linux ejecuta `sh iniciar.sh`. También funciona `node server.js`.
4. En esta PC entra a **http://localhost:3000**. Crea tu administrador con nombre y clave de al menos 8 caracteres. Su usuario será **admin**. El primer administrador solo se puede crear desde la PC servidor.
5. En **Administrar → Equipo** agrega a tus mozos y al cajero, cada uno con su usuario y clave. Los roles se verifican también en el servidor.
6. En **Administrar → Espacios y mesas** configura el salón. En **Administrar → Carta** modifica productos, precios, categorías, disponibilidad y área de preparación.
7. Conecta los celulares al mismo Wi-Fi. Usa en cada navegador la dirección que imprime la ventana del servidor, por ejemplo **http://192.168.1.20:3000**.
8. Si Windows pregunta por Node.js, habilita el acceso solo para la red privada del restaurante. La red de invitados con aislamiento entre equipos puede impedir la conexión. Mantén la PC encendida y sin suspensión.

No requiere Internet para operar. Usa la LAN de confianza del restaurante; esta entrega utiliza HTTP local y no se debe publicar mediante redirección de puertos a Internet. Las sesiones duran hasta 12 horas.

## Uso diario disponible en esta etapa

- El mozo entra a una mesa, toca productos, revisa cantidades y observaciones, y confirma la comanda. En celular el flujo usa tres pantallas: mesas, carta y revisión.
- El borrador se conserva en ese navegador, separado por usuario y mesa. Solo una confirmación del servidor significa que la comanda está guardada.
- Si el envío queda incierto por pérdida de red, se conserva el mismo identificador para reintentar sin duplicar. No se permite editar ese envío hasta resolverlo.
- **Cocina**, disponible para caja y administración en esta etapa, permite cambiar los estados de preparación. El rol específico de cocina podrá incorporarse después.
- El mozo puede mostrar la precuenta. La mesa pasa a «Por cobrar»; caja o administración puede reabrirla o cobrarla.
- Solo caja y administración registran pagos. Se admiten efectivo, Yape/Plin y tarjeta como registro manual; no hay integración con procesadores de pago.
- **Mi actividad** muestra las comandas del mozo. Administración y caja ven el conjunto. La consulta inicial está limitada a las últimas 100 comandas; no sustituye al reporte completo de cierre.
- Retirar productos, mesas o personas conserva sus registros históricos. No se puede retirar una mesa ocupada ni un espacio con mesas activas. Cambiar un precio no altera los pedidos ya enviados.

## Datos y migración

La nueva base está en `datos/mesa-lista-v2.sqlite`. Se importaron las 12 mesas y los 8 productos de la primera versión; no había cuentas abiertas ni ventas. La carpeta anterior no se modificó. El respaldo consistente de su base está en `datos/respaldos/mesa-lista-v1-*.sqlite`.

El importador `node scripts/import-v1.js RUTA_A_LA_BASE_ANTERIOR` está incluido para otras instalaciones, pero rechaza repetir la importación o reemplazar una base nueva que ya tenga actividad. No es necesario ejecutarlo de nuevo en esta entrega.

## Respaldos

Abre **RESPALDAR.cmd** para crear una copia consistente incluso con la app encendida. Copia el archivo generado en `datos/respaldos` a otro disco. Conserva también una copia del código y de esta guía.

Para restaurar: detén el servidor, mueve la carpeta `datos` completa a una carpeta de resguardo, crea una carpeta `datos` vacía y coloca allí el respaldo elegido con el nombre `mesa-lista-v2.sqlite`. No mezcles archivos WAL/SHM de una base antigua con la restaurada. Vuelve a iniciar. La restauración devuelve los usuarios, pedidos y configuración al momento de ese respaldo.

## Desarrollo y comprobaciones

Código del servidor: `server.js` y `lib/`. Interfaz React: `src/`. Interfaz compilada: `public/`. Pruebas: `tests/`.

Para modificar y recompilar: `npm ci` y `npm run build`. La instalación de dependencias requiere Internet; el uso diario no. Ejecuta `npm test` para comprobar roles, control de cambios concurrentes, integridad de pedidos, cobros, persistencia y migración. El archivo `package-lock.json` fija las dependencias.

## Siguientes etapas

1. Validación física de impresión con las ticketeras: la configuración, cola, control de errores y reimpresiones ya están disponibles.
2. Historial completo, reportes por mozo/mesa/espacio, apertura y cierre de caja, exportación CSV/PDF.
3. Captura de carta, OCR local y revisión antes de guardar.

La captura avanzada de cámara y la instalación como PWA requieren estudiar HTTPS local según los navegadores. El acceso normal por IP mediante HTTP ya está contemplado en esta entrega. Todavía no se probó desde un teléfono físico.

## Actualización 2.2: servicio y caja

Se incorporaron historial por atención, turnos de caja, anulaciones, mover/unir mesas y pagos por productos y cantidades. Consulta CAJA-E-HISTORIAL.md, ANULACIONES.md, MOVER-Y-UNIR-MESAS.md y PAGOS-PARCIALES.md. Reinicia el servidor y recarga los navegadores después de actualizar.

## Actualización 2.3: reportes

Caja y administración disponen de Reportes con fechas, consumo, cobros, productos cobrados, anulaciones y pendientes actuales. Cada vista se puede exportar a CSV. Consulta REPORTES.md para interpretar las fechas y los importes.

## Actualización 2.4: respaldos automáticos

Se activan copias consistentes de SQLite cada 6 horas mientras funciona el servidor, conservando las últimas 30 automáticas. Administración → Respaldos permite configurar frecuencia y conservación, crear una copia manual y descargarla. Consulta RESPALDOS.md para recuperar una copia.

## Actualización 2.5: cargar carta

Administrar → Cargar carta permite leer una foto con el reconocimiento local de Windows o pegar texto, revisar filas y agregar/actualizar productos con confirmación. Consulta CARGAR-CARTA.md para los requisitos de Windows y el procedimiento.

## Actualización 2.6: restaurante y presentación de tickets

Administrar → Restaurante permite guardar nombre comercial, RUC, dirección, teléfono, logo y mensaje final. Las precuentas muestran el saldo pendiente y cada nuevo pago genera una nota de venta en la cola de Caja. Consulta RESTAURANTE.md.

## Actualización 2.7: agregar productos de forma sencilla

Administrar → Agregar productos inicia con nombre y precio. Permite agregar más filas y guardar directamente. Desde una foto inicia la lectura al seleccionar la imagen. Los ajustes por producto y el texto se encuentran en opciones desplegables.

## Actualización 2.8: entradas incluidas del menú

Administrar → Entradas del menú permite editar sopa, ensalada, ocopa u otras opciones a S/ 0.00. Al elegir un producto de categoría Menú, el mozo selecciona la entrada, que se conserva en la comanda sin incrementar el precio. Consulta ENTRADAS-DEL-MENU.md.

## Actualización 3.0.1: versiones de pantalla y servidor

La pantalla comprueba su versión contra la enviada por el servidor antes de permitir operaciones. Si aparecen versiones diferentes, detén la ventana del servidor con Ctrl+C, vuelve a abrir INICIAR.cmd o PROBAR-DEMO.cmd según corresponda y recarga el navegador. Cambiar archivos o presionar F5 no reinicia el código Node que ya estaba ejecutándose.

## Actualización 3.1: correcciones de operación

Preparación y entrega independientes del cobro; permisos de preparación/entrega; anulaciones por cantidad; devoluciones completas de un pago y correcciones de medios con registro; reportes netos; verificación de respaldos y copia adicional; cierre ordenado y archivos opcionales de inicio automático. Consulta ARREGLOS-OPERACION.md para usar cada función y conocer sus límites.
