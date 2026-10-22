const APP_VERSION=require('./package.json').version;
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {openDatabase}=require('./lib/database'),{hash,verify,tokenHash}=require('./lib/security'),{applyCatalog,error,name}=require('./lib/catalog'),{snapshot,changeService}=require('./lib/service');
const {printState,applyPrinting,createPrintWorker}=require('./lib/printing');
const {registerState,applyRegister,history}=require('./lib/register');
const {report,csv}=require('./lib/reports');
const {createBackupManager}=require('./lib/backups');
const {business,branding,saveBusiness}=require('./lib/business');
const {importMenu,createMenuOcr}=require('./lib/menu-import');
function createApp(dir,options={}){
 const {db,tx}=openDatabase(dir),attempts=new Map(),backups=createBackupManager(db,dir),readMenu=createMenuOcr();
 const tls=options.tls||(!options.demo&&process.env.TLS_CERT_FILE&&process.env.TLS_KEY_FILE?{cert:fs.readFileSync(process.env.TLS_CERT_FILE),key:fs.readFileSync(process.env.TLS_KEY_FILE)}:null),protocol=tls?'https':'http';
 if(!options.demo&&!!process.env.TLS_CERT_FILE!==!!process.env.TLS_KEY_FILE)throw Error('Configura juntos TLS_CERT_FILE y TLS_KEY_FILE para usar HTTPS');
 const createServer=tls?handler=>require('node:https').createServer(tls,handler):handler=>http.createServer(handler);
 const server=createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Mesa-Lista','server');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://localhost').pathname;
   if(req.method==='GET'&&['/','/app.js','/app.css'].includes(url)){
    const file=path.join(__dirname,'public',url==='/'?'index.html':url.slice(1));if(!fs.existsSync(file))error('Primero compila la interfaz con npm run build',503);
    res.writeHead(200,{'Content-Type':url.endsWith('.js')?'text/javascript; charset=utf-8':url.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(fs.readFileSync(file));
   }
   if(!url.startsWith('/api/'))error('No encontrado',404);
   let a={};if(req.method==='POST'){
    if(req.headers.origin&&req.headers.origin!==`${req.socket.encrypted?'https':'http'}://${req.headers.host}`)error('Origen no permitido',403);
    if(!String(req.headers['content-type']||'').startsWith('application/json'))error('Se requiere JSON',415);
    const limit=url==='/api/menu/ocr'?9*1024*1024:100000;
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>limit)error('Solicitud demasiado grande',413)}try{a=JSON.parse(body)}catch{error('JSON inválido')};if(!a||typeof a!=='object'||Array.isArray(a))error('Solicitud inválida');
   }
   const needsSetup=!db.prepare("SELECT 1 FROM users WHERE role='admin' AND active=1").get();
   if(url==='/api/session'&&req.method==='GET'){
    const user=authenticate();return json(200,{needsSetup,business:branding(db),demo:!!options.demo,user:user?require('./lib/permissions').publicUser(user):null});
   }
   if(url==='/api/setup'&&req.method==='POST'){
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))error('Crea el administrador desde la PC servidor usando localhost',403);
    if(!needsSetup)error('La configuración inicial ya fue completada',409);
    const label=name(a.name);if(typeof a.password!=='string'||a.password.length<8||a.password.length>128)error('Usa una clave de 8 a 128 caracteres');
    tx(()=>{db.prepare("INSERT INTO users(name,login,role,password) VALUES(?,'admin','admin',?)").run(label,hash(a.password));});return json(200,{message:'Administrador creado. Ingresa con admin y tu clave.'});
   }
   if(url==='/api/login'&&req.method==='POST'){
    const key=req.socket.remoteAddress,now=Date.now();let limit=attempts.get(key);if(limit&&limit.until>now&&limit.count>=10)error('Demasiados intentos. Espera 5 minutos.',429);if(!limit||limit.until<=now)limit={count:0,until:now+300000};
    if(typeof a.login!=='string'||typeof a.password!=='string'||a.password.length>128)error('Credenciales inválidas',401);
    const u=db.prepare('SELECT * FROM users WHERE login=? COLLATE NOCASE AND active=1').get(a.login.trim());
    if(!u||!verify(a.password,u.password)){limit.count++;attempts.set(key,limit);error('Usuario o clave incorrectos',401)}
    attempts.delete(key);db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
    const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token),u.id,now+43200000);res.setHeader('Set-Cookie',`mesa_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${req.socket.encrypted?'; Secure':''}`);return json(200,{user:require('./lib/permissions').publicUser(u)});
   }
   function authenticate(){const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('mesa_session='))?.slice(13);if(!raw)return null;return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1').get(tokenHash(raw),Date.now())}
   const user=authenticate();if(!user)error('Inicia sesión para continuar',401);
   if(url==='/api/server-settings'){
    if(user.role!=='admin')error('Solo administración configura la conexión.',403);
    const settings=require('./lib/network-settings');
    if(req.method==='GET')return json(200,settings.networkSettings(__dirname,req));
    if(req.method==='POST')return json(200,settings.saveNetwork(__dirname,req,a));
   }
   if(url==='/api/receipt'&&req.method==='GET'){
    const {saleReceipt,receiptPdf}=require('./lib/receipts'),payment=new URL(req.url,'http://localhost').searchParams.get('payment');
    const {payload,job}=saleReceipt(db,user,payment),pdf=receiptPdf(payload,job);
    res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Nota-de-venta-'+String(payment).replace(/[^a-zA-Z0-9-]/g,'').slice(0,40)+'.pdf"','Cache-Control':'no-store'});return res.end(pdf);
   }
   if(url==='/api/logout'&&req.method==='POST'){
    const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('mesa_session='))?.slice(13);if(raw)db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(raw));res.setHeader('Set-Cookie',`mesa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${req.socket.encrypted?'; Secure':''}`);return json(200,{ok:true});
   }
   if(url==='/api/state'&&req.method==='GET')return json(200,{apiVersion:APP_VERSION,...snapshot(db,user),...printState(db,user),...registerState(db,user)});
   if(url==='/api/history'&&req.method==='GET')return json(200,history(db,user,new URL(req.url,'http://localhost').searchParams));
   if(url==='/api/menu/ocr'&&req.method==='POST')return json(200,await readMenu(user,a));
   if(url==='/api/backups'&&req.method==='GET'){if(user.role!=='admin')error('Solo administración consulta respaldos',403);return json(200,backups.state())}
   if(url==='/api/backups/download'&&req.method==='GET'){
    if(user.role!=='admin')error('Solo administración descarga respaldos',403);
    const copy=await backups.download(Number(new URL(req.url,'http://localhost').searchParams.get('id')));
    const stream=fs.createReadStream(copy.file);stream.on('error',()=>res.destroy());res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':copy.size,'Cache-Control':'no-store','Content-Disposition':`attachment; filename="${copy.name}"`});return stream.pipe(res);
   }
   if(url==='/api/reports'&&req.method==='GET'){
    const params=new URL(req.url,'http://localhost').searchParams;
    db.exec('BEGIN');let result;try{result=report(db,user,params);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
    if(params.get('format')==='csv'){const body=csv(result);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="mesa-lista-${result.kind}-${result.from}-${result.to}.csv"`});return res.end(body)}
    return json(200,result);
   }
   if(url==='/api/action'&&req.method==='POST'){
    if(req.headers['x-mesa-version']&&req.headers['x-mesa-version']!==APP_VERSION)error('La pantalla y el servidor tienen versiones diferentes. Reinicia el servidor y recarga la página antes de continuar.',409);
    if(typeof a.requestId!=='string'||a.requestId.length<8||a.requestId.length>100)error('Identificador de solicitud requerido');
    const result=tx(()=>{
     const old=db.prepare('SELECT result FROM requests WHERE user_id=? AND key=?').get(user.id,a.requestId);if(old)return JSON.parse(old.result);
     let result;if(typeof a.type==='string'&&a.type.startsWith('payment.'))result=require('./lib/payment-adjustments').applyAdjustment(db,user,a);else if(typeof a.type==='string'&&a.type.startsWith('menu-entry.'))result=require('./lib/menu-entries').applyMenuEntry(db,user,a);else if(a.type==='business.save')result=saveBusiness(db,user,a);else if(a.type==='menu.import')result=importMenu(db,user,a);else if(a.type==='catalog'){applyCatalog(db,user,a);result={message:'Cambios guardados'}}else if(typeof a.type==='string'&&(a.type.startsWith('print.')||a.type.startsWith('printer.')))result=applyPrinting(db,user,a);else if(typeof a.type==='string'&&a.type.startsWith('backup.'))result=backups.apply(user,a);else if(typeof a.type==='string'&&a.type.startsWith('cash.'))result=applyRegister(db,user,a);else result=changeService(db,user,a);
     db.prepare('INSERT INTO audit(user_id,action,detail,created) VALUES(?,?,?,?)').run(user.id,a.type,JSON.stringify({entity:a.entity,id:a.id,operation:a.operation,status:a.status,qty:a.qty,reason:a.reason,destination:a.destination,printer_id:a.printer_id,job:result.job,payment:result.payment,adjustment:result.adjustment,method:a.type==='pay'?a.method:undefined,total:a.type==='pay'?a.total:undefined,received:a.type==='pay'?a.received:undefined,backup:result.backup,created:result.created,updated:result.updated}),new Date().toISOString());
     db.prepare('INSERT INTO requests VALUES(?,?,?)').run(user.id,a.requestId,JSON.stringify(result));return result;
    });if(a.type?.startsWith('backup.'))backups.wake();return json(200,result);
   }
   error('No encontrado',404);
  }catch(e){const message=/UNIQUE constraint/.test(e.message)?'Ya existe un registro con ese nombre o usuario.':e.status?e.message:'No se pudo completar la operación';if(!e.status&&!/constraint/.test(e.message))console.error(e);json(e.status||400,{error:message})}
 });
 const printWorker=createPrintWorker(db,options.printOptions);
 let workerStopPromise;function stopWorkers(){return workerStopPromise||(workerStopPromise=Promise.all([printWorker.stop(),backups.stop()]))}
 if(options.printWorker!==false){server.once('listening',()=>printWorker.start());server.once('close',()=>stopWorkers().catch(e=>console.error(e.message)))}
 if(options.backups!==false){server.once('listening',()=>backups.start());server.once('close',()=>stopWorkers().catch(e=>console.error(e.message)))}
 let closing;
 function shutdown(){if(closing)return closing;closing=(async()=>{if(server.listening)await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));await stopWorkers();db.close()})();return closing}
 return {server,db,printWorker,backups,shutdown,protocol};
}
if(require.main===module){
 const port=require('./lib/server-config').serverPort(__dirname),dir=process.env.DATA_DIR||path.join(__dirname,'datos'),{server,shutdown,protocol}=createApp(dir);
 let shuttingDown=false;
 function finish(code=0){if(shuttingDown)return;shuttingDown=true;console.log('Cerrando Mesa Lista; espera a que terminen los envíos y respaldos...');const timeout=setTimeout(()=>process.exit(1),20000);timeout.unref();shutdown().then(()=>{clearTimeout(timeout);process.exit(code)}).catch(e=>{console.error(e.message);process.exit(1)})}
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>finish());
 if(process.env.MESA_DESKTOP==='1'){
  require('node:readline').createInterface({input:process.stdin}).on('line',line=>{if(line==='mesa-lista:shutdown')finish()}).on('close',()=>finish());
 }
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'El puerto está ocupado. Cierra la versión anterior o cambia el puerto en config-servidor.json.':e.message);finish(1)});
 server.listen(port,'0.0.0.0',()=>{console.log(`Mesa Lista ${APP_VERSION}: ${protocol}://localhost:${port}`);for(const n of Object.values(os.networkInterfaces()).flat())if(n.family==='IPv4'&&!n.internal)console.log(`Celulares: ${protocol}://${n.address}:${port}`)});
}
module.exports={createApp};
