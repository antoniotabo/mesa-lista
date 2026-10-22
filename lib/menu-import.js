const {applyCatalog,error,name,integer}=require('./catalog');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{execFile}=require('node:child_process');
const normalize=v=>v.trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
function importMenu(db,user,a){
 if(user.role!=='admin')error('Solo administración puede importar la carta',403);
 if(a.confirm!==true||!Array.isArray(a.rows)||!a.rows.length||a.rows.length>100)error('Revisa y confirma entre 1 y 100 productos');
 const seen=new Set(),ids=new Set();let created=0,updated=0;
 for(const r of a.rows){
  if(!r||!['create','update'].includes(r.mode))error('Elige agregar o actualizar para cada producto');
  const label=name(r.name),key=normalize(label);if(seen.has(key))error('Hay nombres repetidos en la importación: '+label);seen.add(key);
  const price=integer(r.price,1,10000000),category=name(r.category,40),station=integer(r.station_id,1,Number.MAX_SAFE_INTEGER);
  if(r.mode==='create'&&db.prepare('SELECT name FROM products WHERE active=1').all().some(p=>normalize(p.name)===key))error('Ya existe '+label+'. Elige actualizar y selecciona el producto.',409);
  let current;
  if(r.mode==='update'){
   current=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(r.id);if(!current)error('El producto para actualizar ya no está activo',409);
   if(ids.has(current.id))error('Un producto está seleccionado para actualizarse más de una vez');ids.add(current.id);
   if(db.prepare('SELECT id,name FROM products WHERE active=1 AND id!=?').all(current.id).some(p=>normalize(p.name)===key))error('El nombre coincide con otro producto: '+label,409);
  }
  applyCatalog(db,user,{type:'catalog',entity:'product',operation:'save',id:current?.id,version:r.version,name:label,price,category,station_id:station,available:current?!!current.available:true});
  if(current)updated++;else created++;
 }
 return {message:`Carta importada: ${created} productos agregados y ${updated} actualizados.`,created,updated};
}
function createMenuOcr(){
 let active=false;
 return async function readMenu(user,a){
  if(user.role!=='admin')error('Solo administración puede leer una carta',403);
  if(process.platform!=='win32')error('La lectura de fotos usa el reconocimiento de Windows en la PC servidor. Puedes pegar el texto para preparar la carta.',503);
  if(active)error('Ya se está leyendo una foto. Espera a que termine.',409);
  const match=typeof a.image==='string'&&a.image.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)error('Envía una imagen PNG o JPEG');
  const bytes=Buffer.from(match[2],'base64');if(bytes.length>6*1024*1024||bytes.length<8)error('La imagen debe pesar como máximo 6 MB');
  const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!valid)error('El archivo no corresponde a una imagen válida');
  active=true;let temporary;
  try{
   temporary=await fs.mkdtemp(path.join(os.tmpdir(),'mesa-lista-ocr-'));const file=path.join(temporary,'carta.'+(match[1]==='png'?'png':'jpg'));await fs.writeFile(file,bytes);
   const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
   const result=await new Promise((resolve,reject)=>execFile(executable,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'../scripts/read-menu.ps1'),'-InputPath',file],{windowsHide:true,timeout:60000,maxBuffer:1024*1024,encoding:'utf8'},(err,stdout)=>{
    let data;try{data=JSON.parse(stdout.replace(/^\uFEFF/,'').trim())}catch{}
    if(data?.error)return reject(Object.assign(new Error(data.error),{status:422}));
    if(err)return reject(Object.assign(new Error(err.killed?'La lectura tardó demasiado. Usa una foto más pequeña o pega el texto.':'No se pudo usar el reconocimiento de Windows. Puedes pegar el texto de la carta.'),{status:503}));
    if(typeof data?.text!=='string')return reject(Object.assign(new Error('No se recibió texto válido del reconocimiento.'),{status:422}));resolve(data);
   }));
   return {text:result.text.slice(0,50000),language:result.language||'',message:'Revisa los nombres y precios antes de importar.'};
  }finally{active=false;if(temporary){try{await fs.unlink(path.join(temporary,'carta.'+(match[1]==='png'?'png':'jpg')));await fs.rmdir(temporary)}catch{}}}
 };
}
module.exports={importMenu,createMenuOcr};
