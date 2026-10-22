# Agregar productos de forma sencilla

Entra como administrador y abre **Administrar → Agregar productos**. Para agregar un solo producto también puedes usar **Administrar → Carta → + Producto**.

## Escribir productos

1. Elige la categoría y el área de preparación.
2. Escribe el nombre y el precio.
3. Pulsa **Otro producto** para agregar más filas, si lo necesitas.
4. Pulsa **Guardar producto(s)**.

La categoría y el área de arriba se aplican a todas las filas al cambiarlas. En **Más opciones**, junto a cada producto, puedes elegir una categoría o área distinta.

## Desde una foto

Selecciona **Desde una foto** y elige una imagen. La lectura empieza automáticamente. Revisa los nombres y precios de la lista resultante y pulsa Guardar. Una nueva foto reemplaza la lista en revisión.

Usa una foto frontal, legible y de una columna. Se admiten JPEG, PNG y WebP de hasta 20 MB. Para una carta grande, importa una sección por vez. El navegador reduce la imagen para enviarla a la PC servidor.

La lectura usa Windows.Media.Ocr de la laptop servidor, sin servicios externos de pago. Windows debe tener un idioma de reconocimiento compatible instalado. Se prefiere español y, si no está disponible, se intenta un idioma compatible del usuario de Windows. El auxiliar usa Windows PowerShell 5.1; no cambia políticas permanentes de la PC.

Si no puedes leer una foto, abre **Pegar o corregir texto de la carta** al pie. Escribe un producto con precio por línea, por ejemplo **Arroz chaufa S/ 18.00**, y pulsa **Pasar texto a la lista**. También puedes escribir los productos directamente.

## Revisión y productos existentes

Si el nombre coincide con un único producto existente, se indica que se actualizará. Revisa el precio antes de guardar. En Más opciones puedes elegir otro producto existente. Si hay varias coincidencias, debes seleccionar cuál actualizar.

Las líneas dudosas se muestran desmarcadas: corrige sus datos y marca Incluir este producto. Las líneas sin nombre y precio reconocibles aparecen junto al texto para revisarlas. No se interpretan automáticamente variantes por tamaño ni tablas de varias columnas.

Se admiten hasta 100 productos por guardado. No se permiten nombres repetidos en la lista ni agregar un producto nuevo con un nombre que ya existe. Las actualizaciones conservan la disponibilidad del producto, y los pedidos anteriores mantienen sus nombres y precios registrados.

El botón Guardar confirma los productos incluidos. Se guarda toda la lista en una sola operación: si hay una fila inválida, no se guarda ninguna. Si otro administrador modifica un producto mientras revisas la lista, el servidor pide revisar su versión antes de continuar.

Si se interrumpe la conexión, utiliza **Confirmar resultado** para reintentar la misma solicitud, sin repetir la importación. Mantén habilitado el almacenamiento del navegador.

Referencias: [OCR de Windows](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.recognizeasync) y [ejemplo oficial de Microsoft](https://github.com/microsoft/Windows-universal-samples/blob/main/Samples/OCR/cs/OcrFileImage.xaml.cs).

Interfaz simplificada y compilada. Las pruebas funcionales quedan a cargo del propietario.
