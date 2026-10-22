// Use data URLs, which the application's image policy explicitly permits.
// Read the actual file header so an incorrect MIME label does not block a photo.
export async function readLocalImage(file){
 if(!file.size)throw Error('El archivo está vacío. Selecciona una foto guardada en tu equipo.');
 const bytes=new Uint8Array(await file.slice(0,32).arrayBuffer());
 const ascii=(from,to)=>String.fromCharCode(...bytes.slice(from,to));
 let type;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
 else if(bytes[0]===137&&ascii(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)type='image/png';
 else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')type='image/webp';
 else if(ascii(4,8)==='ftyp')throw Error('Este formato de foto no se puede abrir aquí. Exporta la imagen como JPG o PNG y vuelve a seleccionarla. Cambiar solo la extensión no la convierte.');
 else throw Error('El archivo no contiene una imagen JPG, PNG o WebP reconocible. Ábrelo en Fotos o Paint y guarda una copia como JPG o PNG.');
 const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).replace(/^data:[^;]*;/,'data:'+type+';'));reader.onerror=()=>reject(Error('No se pudo leer el archivo. Guarda una copia en tu equipo e inténtalo de nuevo.'));reader.onabort=()=>reject(Error('Se canceló la lectura de la foto.'));reader.readAsDataURL(file)});
 return new Promise((resolve,reject)=>{
  const image=new Image();const finish=(err)=>{clearTimeout(timer);image.onload=null;image.onerror=null;if(err){image.src='';reject(Error(err))}else resolve(image)};
  const timer=setTimeout(()=>finish('La foto tardó demasiado en abrirse. Usa una imagen más pequeña o una sección de la carta.'),20000);
  image.onload=()=>image.naturalWidth&&image.naturalHeight?finish():finish('La imagen no tiene un tamaño válido. Guarda otra copia como JPG o PNG.');
  image.onerror=()=>finish('No se pudo abrir esta imagen. Guárdala de nuevo como JPG o PNG desde Fotos o Paint y vuelve a seleccionarla.');
  image.src=source;
 });
}
