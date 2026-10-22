# Respaldos automáticos

Reinicia el servidor y recarga el navegador después de actualizar. Entra como administrador y abre **Administrar → Respaldos**.

## Frecuencia y conservación

Por defecto se crea una copia cada 6 horas y se conservan las últimas 30 copias automáticas. Desde el panel puedes activar o desactivar la programación, elegir entre 1 y 24 horas y conservar entre 7 y 90 copias automáticas.

El servidor debe estar funcionando. Si estuvo apagado cuando correspondía una copia, se crea al arrancar cuando el intervalo ya venció. Si no hay ninguna copia registrada, se programa la primera al iniciar el servicio. El calendario se revisa aproximadamente cada 30 segundos. Una copia manual reciente también reinicia el intervalo para evitar otra copia automática inmediata.

Después de un fallo automático, se espera al menos cinco minutos antes de volver a intentarlo. Consulta el estado y el mensaje de error en el panel. Un respaldo interrumpido deja de ofrecerse como disponible; después de reiniciar puede tardar hasta dos minutos en liberarse el proceso anterior.

Las copias se guardan en la carpeta **respaldos** dentro del directorio de datos utilizado por el servidor. El panel muestra la ruta exacta. Se utiliza la función de respaldo de SQLite para incluir los datos confirmados aunque el restaurante siga trabajando. El archivo se ofrece para descargar cuando termina de crearse.

## Copia manual y descarga

Pulsa **Crear respaldo ahora** y espera a que su estado sea **Disponible**. Luego pulsa **Descargar**. La descarga se guarda en el dispositivo desde el que abriste el panel. Si accedes desde un celular, se descarga en ese celular.

Las copias manuales no se eliminan automáticamente. Las copias automáticas más antiguas se retiran solamente después de guardar una copia nueva, conservando la cantidad configurada. Bajar la cantidad no borra archivos inmediatamente al guardar la configuración.

Los archivos creados antes de este módulo mediante **RESPALDAR.cmd** se conservan en la carpeta, aunque no aparecen en la lista del nuevo panel. El comando manual sigue disponible. Los archivos incompletos con extensión **.partial** no se ofrecen como respaldos descargables.

Solo administración puede configurar, crear y descargar desde el panel. Cada copia contiene todos los datos del restaurante, incluidos usuarios y configuración. Guarda también copias descargadas en otro disco o dispositivo: las copias de la misma PC dependen de ese disco.

## Recuperar una copia

La recuperación es manual en esta etapa, porque reemplaza los datos actuales del restaurante.

1. Detén Mesa Lista con Ctrl+C en la ventana del servidor. Cierra cualquier otra instancia que use los mismos datos.
2. Conserva una copia de toda la carpeta de datos actual en otra ubicación, incluyendo los archivos de SQLite que pudiera contener.
3. Prepara una carpeta de datos vacía para recuperar la copia. Copia allí el archivo de respaldo elegido y renómbralo **mesa-lista-v2.sqlite**. No mezcles el respaldo con archivos **-wal** o **-shm** de otra base.
4. Con el servidor aún detenido, conserva la carpeta de datos anterior con otro nombre y coloca la carpeta preparada en la ruta de datos que usa el servidor. La ruta predeterminada es **datos**, junto a server.js; si usas DATA_DIR, respeta esa ruta.
5. Inicia el servidor normalmente y recarga los dispositivos. La aplicación incorporará los campos que falten según la versión del código. Volverán los datos y configuraciones que existían en el momento del respaldo.

Los archivos de las copias anteriores pueden permanecer en la carpeta de datos conservada. No deben sobrescribirse al recuperar la base. El panel mostrará los registros presentes dentro de la copia restaurada; algunos archivos listados pueden estar en la carpeta anterior y no en la nueva.

Código e interfaz compilada. No se ejecutaron pruebas de creación ni de restauración; las pruebas funcionales quedan a cargo del propietario.
