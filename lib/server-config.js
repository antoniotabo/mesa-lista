const fs=require('node:fs'),path=require('node:path');
function serverPort(root){
 const file=path.join(root,'config-servidor.json');
 let config={};
 if(fs.existsSync(file)){
  try{config=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))}
  catch{throw Error('No se pudo leer config-servidor.json. Usa el formato {"puerto":3000}.')}
  if(!config||typeof config!=='object'||Array.isArray(config))throw Error('config-servidor.json debe contener un objeto con el campo puerto.');
 }
 const raw=process.env.PORT||(config.puerto??3000);
 if(!['string','number'].includes(typeof raw)||!/^\d+$/.test(String(raw)))throw Error('El puerto del servidor debe ser un entero entre 1 y 65535.');
 const port=Number(raw);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('El puerto del servidor debe estar entre 1 y 65535.');
 return port;
}
module.exports={serverPort};
