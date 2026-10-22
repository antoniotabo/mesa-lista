const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {error}=require('./catalog');
const localRequest=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
function addresses(){return [...new Set(Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>n.address))]}
function readConfig(root){const file=path.join(root,'config-servidor.json'),raw=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';return {file,config:raw?JSON.parse(raw.replace(/^\uFEFF/,'')):{},version:crypto.createHash('sha256').update(raw).digest('hex')}}
function networkSettings(root,req){const {config,version}=readConfig(root),ips=addresses(),port=req.socket.localPort,protocol=req.socket.encrypted?'https':'http';return {version,ips,port,configuredPort:config.puerto??3000,address:config.direccion||'',environmentPort:!!process.env.PORT,local:localRequest(req),links:ips.map(ip=>({ip,url:`${protocol}://${ip}:${port}`})),dataDir:process.env.DATA_DIR||path.join(root,'datos')}}
function saveNetwork(root,req,a){
 if(!localRequest(req))error('Cambia el servidor desde la PC principal usando localhost.',403);
 const current=readConfig(root);if(a.version!==current.version)error('La configuración cambió. Recarga este panel.',409);
 if(!Number.isInteger(a.port)||a.port<1||a.port>65535)error('Elige un puerto entero entre 1 y 65535.');
 const address=String(a.address||'').trim();if(address&&!addresses().includes(address))error('Selecciona una IP que pertenezca actualmente a esta PC.');
 const next={...current.config,puerto:a.port,direccion:address},temp=current.file+'.'+crypto.randomUUID()+'.tmp';
 try{fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n','utf8');fs.renameSync(temp,current.file)}finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
 return {message:process.env.PORT?'Configuración guardada. PORT está definido en Windows y tiene prioridad: retíralo para usar este puerto.':'Configuración guardada. Reinicia el servidor para aplicar el puerto. Los datos se conservan.',restartRequired:a.port!==req.socket.localPort};
}
module.exports={networkSettings,saveNetwork,localRequest};
