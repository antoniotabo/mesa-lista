const net=require('node:net'),crypto=require('node:crypto');
const {error,name,integer}=require('./catalog');
const {ticketText,renderTicket}=require('./escpos');
const {business}=require('./business');
const now=()=>new Date().toISOString();
function initPrinting(db){db.exec(`
 CREATE TABLE IF NOT EXISTS printers(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,host TEXT NOT NULL DEFAULT '',port INTEGER NOT NULL DEFAULT 9100,mode TEXT NOT NULL CHECK(mode IN ('tcp','preview')),encoding TEXT NOT NULL DEFAULT 'cp850',code_page INTEGER NOT NULL DEFAULT 2,columns INTEGER NOT NULL DEFAULT 48,cut INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS print_routes(destination TEXT PRIMARY KEY,printer_id INTEGER REFERENCES printers(id));
 CREATE TABLE IF NOT EXISTS print_jobs(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,destination TEXT NOT NULL,printer_id INTEGER REFERENCES printers(id),user_id INTEGER NOT NULL REFERENCES users(id),order_id TEXT REFERENCES orders(id),service_id TEXT REFERENCES services(id),payload TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',copy_of INTEGER REFERENCES print_jobs(id),created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS print_attempts(id INTEGER PRIMARY KEY,job_id INTEGER NOT NULL REFERENCES print_jobs(id),printer_snapshot TEXT NOT NULL,bytes BLOB,status TEXT NOT NULL,error TEXT NOT NULL DEFAULT '',started TEXT NOT NULL,finished TEXT);
 CREATE TABLE IF NOT EXISTS print_lease(id INTEGER PRIMARY KEY CHECK(id=1),owner TEXT NOT NULL,expires INTEGER NOT NULL);
 INSERT OR IGNORE INTO print_lease VALUES(1,'',0);
 CREATE INDEX IF NOT EXISTS print_pending ON print_jobs(status,id);
 `);
 if(!db.prepare('PRAGMA table_info(print_routes)').all().some(c=>c.name==='enabled'))db.exec('ALTER TABLE print_routes ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
}
function destinationPrinter(db,destination){return db.prepare('SELECT p.* FROM print_routes r JOIN printers p ON p.id=r.printer_id WHERE r.destination=? AND p.active=1').get(destination)}
function enqueue(db,{payload,destination,userId,orderId=null,serviceId=null,printer=null,copyOf=null}){
 payload={...payload,business:payload.business||business(db)};
 const enabled=printer||db.prepare('SELECT enabled FROM print_routes WHERE destination=?').get(destination)?.enabled!==0;
 const p=printer||destinationPrinter(db,destination),status=!enabled?'digital':p?.active?'queued':'blocked',time=now();
 return Number(db.prepare('INSERT INTO print_jobs(kind,destination,printer_id,user_id,order_id,service_id,payload,status,reason,copy_of,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(payload.kind,destination,p?.id||null,userId,orderId,serviceId,JSON.stringify(payload),status,status==='digital'?'Solo digital: impresión desactivada para este destino.':status==='blocked'?'Asigna una impresora activa para esta área.':'',copyOf,time,time).lastInsertRowid);
}
function queueOrder(db,order,user){
 const o=db.prepare('SELECT o.*,s.table_name,s.space_name,u.name AS waiter FROM orders o JOIN services s ON s.id=o.service_id JOIN users u ON u.id=o.waiter_id WHERE o.id=?').get(order);
 const items=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order),ids=[];
 for(const station of new Set(items.map(i=>i.station)))ids.push(enqueue(db,{userId:user.id,orderId:order,serviceId:o.service_id,destination:station,payload:{kind:'order',reference:order.slice(0,8),table:o.table_name,space:o.space_name,waiter:o.waiter,created:o.created,station,note:o.note,items:items.filter(i=>i.station===station)}}));
 return ids;
}
function printState(db,user){
 const own=user.role==='waiter';
 const where=`WHERE ${own?'j.user_id=? AND ':''}(j.status IN ('blocked','failed','uncertain','queued','sending') OR j.id IN (SELECT id FROM print_jobs ${own?'WHERE user_id=?':''} ORDER BY id DESC LIMIT 100))`;
 const jobs=db.prepare(`SELECT j.*,p.name AS printer_name FROM print_jobs j LEFT JOIN printers p ON p.id=j.printer_id ${where} ORDER BY j.id DESC`).all(...(own?[user.id,user.id]:[])).map(j=>{const payload=JSON.parse(j.payload);const cols=db.prepare('SELECT columns FROM printers WHERE id=?').get(j.printer_id)?.columns||48;return {...j,payload:undefined,preview:ticketText(payload,cols,j),previewRaster:['bill','sale'].includes(payload.kind)&&payload.business?.printLogo!==false?payload.business?.raster||null:null,table:payload.table||'',attempts:db.prepare('SELECT id,status,error,started,finished FROM print_attempts WHERE job_id=? ORDER BY id DESC').all(j.id)}});
 return {printers:user.role==='admin'?db.prepare('SELECT * FROM printers ORDER BY id').all():[],routes:user.role==='admin'?db.prepare('SELECT * FROM print_routes').all():[],printJobs:jobs,printCounts:db.prepare(`SELECT status,count(*) AS count FROM print_jobs ${user.role==='waiter'?'WHERE user_id=?':''} GROUP BY status`).all(...(user.role==='waiter'?[user.id]:[]))};
}
function validHost(host){if(net.isIP(host)!==4)return false;const [a,b,c,d]=host.split('.').map(Number);return d!==0&&d!==255&&(a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===127&&b===0&&c===0&&d===1))}
function applyPrinting(db,user,a){
 if(a.type==='printer.save'){
  if(user.role!=='admin')error('Solo administración configura impresoras',403);
  const label=name(a.name),mode=a.mode;if(!['tcp','preview'].includes(mode))error('Modo inválido');const host=String(a.host||'').trim();if(mode==='tcp'&&!validHost(host))error('Ingresa la IPv4 local de la ticketera, por ejemplo 192.168.1.50');
  const port=integer(a.port,1,65535),columns=integer(a.columns,32,64),page=integer(a.code_page,0,255);if(!['cp850','cp1252','ascii'].includes(a.encoding))error('Codificación inválida');
  if(typeof a.cut!=='boolean'||typeof a.active!=='boolean')error('Configuración inválida');
  if(a.id){const p=db.prepare('SELECT * FROM printers WHERE id=?').get(a.id);if(!p)error('Impresora no encontrada');if(p.version!==a.version)error('La configuración cambió. Vuelve a abrirla.',409);db.prepare('UPDATE printers SET name=?,host=?,port=?,mode=?,encoding=?,code_page=?,columns=?,cut=?,active=?,version=version+1 WHERE id=?').run(label,host,port,mode,a.encoding,page,columns,+a.cut,+a.active,p.id)}else db.prepare('INSERT INTO printers(name,host,port,mode,encoding,code_page,columns,cut,active) VALUES(?,?,?,?,?,?,?,?,?)').run(label,host,port,mode,a.encoding,page,columns,+a.cut,+a.active);
  return {message:'Impresora guardada. Asigna las áreas que debe atender.'};
 }
 if(a.type==='printer.route'){
  if(user.role!=='admin')error('Solo administración asigna impresoras',403);
  if(a.destination!=='Caja'&&!db.prepare('SELECT 1 FROM stations WHERE name=?').get(a.destination))error('Área desconocida');
  if(a.printer_id!==null&&!db.prepare('SELECT 1 FROM printers WHERE id=?').get(a.printer_id))error('Elige una impresora existente');
  const current=db.prepare('SELECT * FROM print_routes WHERE destination=?').get(a.destination);
  const enabled=a.enabled===undefined?(current?.enabled??1):a.enabled===true?1:a.enabled===false?0:error('Revisa la activación del destino');
  db.prepare('INSERT INTO print_routes(destination,printer_id,enabled) VALUES(?,?,?) ON CONFLICT(destination) DO UPDATE SET printer_id=excluded.printer_id,enabled=excluded.enabled').run(a.destination,a.printer_id,enabled);
  if(!enabled)db.prepare("UPDATE print_jobs SET status='digital',reason='Impresión desactivada: conservado solo digital, sin envío.',updated=? WHERE destination=? AND status IN ('queued','blocked','failed')").run(now(),a.destination);
  return {message:enabled?'Destino activado. Los tickets anteriores no se imprimen automáticamente.':'Impresión desactivada para '+a.destination+'. Los pedidos se siguen guardando. Un envío ya iniciado debe revisarse en papel.'};
 }
 if(a.type==='printer.test'){
  if(user.role!=='admin')error('Solo administración puede probar impresoras',403);const p=db.prepare('SELECT * FROM printers WHERE id=? AND active=1').get(a.id);if(!p)error('Activa la impresora antes de probarla');
  const job=enqueue(db,{userId:user.id,destination:'Prueba',printer:p,payload:{kind:'test',created:now(),station:p.name,items:[]}});return {message:'Prueba en cola. Consulta su resultado en Tickets.',job};
 }
 if(a.type==='print.bill'){
  const s=db.prepare("SELECT s.*,u.name AS waiter FROM services s JOIN users u ON s.waiter_id=u.id WHERE s.id=? AND s.status!='closed'").get(a.id);if(!s)error('Cuenta no disponible');
  const items=db.prepare('SELECT i.id,i.name,i.price,i.note,i.qty-(COALESCE((SELECT sum(pi.qty) FROM payment_items pi WHERE pi.item_id=i.id),0)-COALESCE((SELECT sum(ri.qty) FROM refund_items ri WHERE ri.item_id=i.id),0)) AS qty FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=? AND i.cancelled_at IS NULL').all(s.id).filter(i=>i.qty>0);
  const payload={kind:'bill',created:now(),table:s.table_name,space:s.space_name,waiter:s.waiter,items,note:'Saldo pendiente. No incluye productos ya pagados.'};
  const existing=db.prepare("SELECT * FROM print_jobs WHERE service_id=? AND kind='bill' AND status IN ('queued','sending','blocked','failed','uncertain') ORDER BY id DESC LIMIT 1").get(s.id);
  if(existing)error(`Ya existe una precuenta pendiente (#${existing.id}). Revisa Tickets antes de volver a imprimir.`,409);
  db.prepare("UPDATE services SET status='billing' WHERE id=?").run(s.id);const job=enqueue(db,{payload,destination:'Caja',userId:user.id,serviceId:s.id});
  const status=db.prepare('SELECT status FROM print_jobs WHERE id=?').get(job).status;
  return {message:status==='digital'?'Precuenta guardada solo digital. La impresión de Caja está desactivada.':status==='blocked'?'Precuenta guardada sin enviar: asigna una impresora a Caja.':'Precuenta enviada a la cola de Caja.',job,status};
 }
 if(!['print.retry','print.copy','print.cancel'].includes(a.type))error('Acción de impresión desconocida');
 if(user.role==='waiter')error('Caja o administración debe resolver o reimprimir tickets',403);
 const j=db.prepare('SELECT * FROM print_jobs WHERE id=?').get(a.id);if(!j)error('Ticket no encontrado');
 if(a.type==='print.cancel'){
  if(!['blocked','queued','failed','uncertain'].includes(j.status))error('Este ticket no se puede cancelar',409);const reason=name(a.reason,200);db.prepare("UPDATE print_jobs SET status='cancelled',reason=?,updated=? WHERE id=?").run(reason,now(),j.id);return {message:'Ticket cancelado. El pedido permanece guardado.'};
 }
 if(a.type==='print.copy'){
  if(j.kind==='bill'&&db.prepare('SELECT 1 FROM payment_ledger WHERE service_id=? AND created>=?').get(j.service_id,JSON.parse(j.payload).created))error('Esta precuenta es anterior a un pago. Genera una nueva con el saldo pendiente.',409);
  if(j.kind==='bill'&&db.prepare('SELECT 1 FROM table_transfers WHERE (source_id=? OR target_id=?) AND created>=?').get(j.service_id,j.service_id,JSON.parse(j.payload).created))error('La mesa cambió. Genera una nueva precuenta desde la mesa actual.',409);
  if(j.kind==='bill'&&db.prepare('SELECT 1 FROM cancellation_events e JOIN order_items i ON i.id=e.item_id JOIN orders o ON o.id=i.order_id WHERE o.service_id=? AND e.created>=?').get(j.service_id,JSON.parse(j.payload).created))error('Esta precuenta quedó desactualizada por una anulación. Genera una nueva desde la mesa.',409);
  if(!['sent','uncertain','simulated','digital'].includes(j.status))error('Solo puedes generar una copia de un ticket enviado, incierto, digital o simulado',409);const reason=name(a.reason,200);if(a.confirm!==true)error('Confirma que revisaste si ya salió papel');
  // Resolving an uncertain original avoids multiple accidental copies from it.
  if(j.status==='uncertain')db.prepare("UPDATE print_jobs SET status='cancelled',reason=?,updated=? WHERE id=?").run('Reemplazado por reimpresión: '+reason,now(),j.id);
  const p=j.destination==='Prueba'?db.prepare('SELECT * FROM printers WHERE id=?').get(j.printer_id):null;
  const job=enqueue(db,{payload:JSON.parse(j.payload),destination:j.destination,userId:user.id,orderId:j.order_id,serviceId:j.service_id,printer:p,copyOf:j.id});db.prepare('UPDATE print_jobs SET reason=? WHERE id=?').run('Reimpresión: '+reason,job);return {message:'Copia identificada como REIMPRESIÓN añadida a la cola.',job};
 }
 if(!['blocked','failed'].includes(j.status))error('Solo puedes reintentar tickets sin envío. Para resultados inciertos usa Reimprimir.',409);
 if(db.prepare('SELECT enabled FROM print_routes WHERE destination=?').get(j.destination)?.enabled===0)error('La impresión está desactivada para este destino. Actívala primero.');
 const p=j.destination==='Prueba'?db.prepare('SELECT * FROM printers WHERE id=? AND active=1').get(j.printer_id):destinationPrinter(db,j.destination);if(!p)error('Asigna una impresora activa a esta área primero');
 db.prepare("UPDATE print_jobs SET status='queued',printer_id=?,reason='',updated=? WHERE id=?").run(p.id,now(),j.id);return {message:'Ticket devuelto a la cola'};
}
function tcpSend(printer,bytes,{timeout=5000}={}){
 return new Promise(resolve=>{let wrote=false,done=false;const socket=new net.Socket();const timer=setTimeout(()=>finish(wrote?'uncertain':'failed','Tiempo de conexión agotado'),timeout);
  const finish=(status,reason='')=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve({status,reason})};
  socket.on('error',e=>finish(wrote?'uncertain':'failed',`Conexión: ${e.code||'error'}`));socket.on('close',()=>{if(!done)finish(wrote?'uncertain':'failed','Conexión cerrada antes de completar el envío')});
  socket.connect(printer.port,printer.host,()=>{wrote=true;socket.end(bytes,()=>finish('sent','Datos enviados por TCP; verifica el papel en la ticketera.'))});
 });
}
function createPrintWorker(db,{transport=tcpSend,interval=700}={}){
 const owner=crypto.randomUUID();let timer=null,busy=false,stopped=false;
 function lease(){const t=Date.now(),row=db.prepare('SELECT * FROM print_lease WHERE id=1').get();if(row.owner!==owner&&row.expires>t)return false;
  const changed=db.prepare('UPDATE print_lease SET owner=?,expires=? WHERE id=1 AND (owner=? OR expires<=?)').run(owner,t+30000,owner,t);if(!changed.changes)return false;
  if(row.owner!==owner){db.prepare("UPDATE print_jobs SET status='uncertain',reason='Servidor interrumpido durante el envío. Revisa el papel antes de reimprimir.',updated=? WHERE status='sending'").run(now());db.prepare("UPDATE print_attempts SET status='uncertain',error='Servidor interrumpido',finished=? WHERE status='sending'").run(now())}return true;
 }
 async function tick(){if(stopped||busy)return;try{if(!lease())return;busy=true;const j=db.prepare("SELECT * FROM print_jobs WHERE status='queued' ORDER BY id LIMIT 1").get();if(!j)return;
   const p=db.prepare('SELECT * FROM printers WHERE id=? AND active=1').get(j.printer_id);if(!p){db.prepare("UPDATE print_jobs SET status='blocked',reason='Impresora desactivada o no asignada',updated=? WHERE id=?").run(now(),j.id);return}
   const {bytes}=renderTicket(JSON.parse(j.payload),p,j);db.exec('BEGIN IMMEDIATE');let attempt;try{db.prepare("UPDATE print_jobs SET status='sending',updated=? WHERE id=?").run(now(),j.id);attempt=Number(db.prepare("INSERT INTO print_attempts(job_id,printer_snapshot,bytes,status,started) VALUES(?,?,?,'sending',?)").run(j.id,JSON.stringify(p),bytes,now()).lastInsertRowid);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
   let result;try{result=p.mode==='preview'?{status:'simulated',reason:'Vista previa: no se enviaron datos a una impresora.'}:await transport(p,bytes)}catch(e){result={status:'uncertain',reason:'No se pudo confirmar el envío: '+e.message}}
   if(!['sent','simulated','failed','uncertain'].includes(result.status))result={status:'uncertain',reason:'Respuesta del transporte desconocida'};
   db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE print_jobs SET status=?,reason=?,updated=? WHERE id=?').run(result.status,result.reason||'',now(),j.id);db.prepare('UPDATE print_attempts SET status=?,error=?,finished=? WHERE id=?').run(result.status,result.reason||'',now(),attempt);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  }catch(e){console.error('Cola de impresión:',e.message)}finally{busy=false}}
 return {tick,start(){timer=setInterval(tick,interval);timer.unref();tick()},async stop(){stopped=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,20));db.prepare('UPDATE print_lease SET expires=0 WHERE id=1 AND owner=?').run(owner)}};
}
module.exports={enqueue,initPrinting,queueOrder,printState,applyPrinting,createPrintWorker,tcpSend,validHost};
