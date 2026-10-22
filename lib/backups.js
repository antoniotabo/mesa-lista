const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const {error,integer}=require('./catalog');
const {verifyDatabase,copyVerified}=require('./backup-verification');
const defaults={enabled:true,hours:6,keep:30,copyFolder:''};
function createBackupManager(db,dir){
 const folder=path.resolve(dir,'respaldos'),source=path.resolve(dir,'mesa-lista-v2.sqlite'),owner=randomUUID();
 db.exec(`CREATE TABLE IF NOT EXISTS backup_runs(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,status TEXT NOT NULL,user_id INTEGER REFERENCES users(id),created TEXT NOT NULL,finished TEXT,file TEXT,bytes INTEGER,error TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS backup_lease(id INTEGER PRIMARY KEY CHECK(id=1),owner TEXT NOT NULL,expires INTEGER NOT NULL);
 INSERT OR IGNORE INTO backup_lease VALUES(1,'',0);`);
 for(const field of ['replica_file','replica_error'])if(!db.prepare('PRAGMA table_info(backup_runs)').all().some(c=>c.name===field))db.exec(`ALTER TABLE backup_runs ADD COLUMN ${field} TEXT NOT NULL DEFAULT ''`);
 let timer=null,working=null,stopped=true;
 const config=()=>{const row=db.prepare("SELECT value FROM meta WHERE key='backup-settings'").get();return row?{...defaults,...JSON.parse(row.value)}:{...defaults}};
 function state(){const runs=db.prepare('SELECT b.*,u.name AS author FROM backup_runs b LEFT JOIN users u ON u.id=b.user_id ORDER BY b.id DESC LIMIT 100').all();const last=db.prepare("SELECT * FROM backup_runs WHERE status='completed' ORDER BY finished DESC LIMIT 1").get();const c=config();return {config:c,folder,runs,last:last||null,next:c.enabled?(last?new Date(Date.parse(last.finished)+c.hours*3600000).toISOString():null):null};}
 function apply(user,a){
  if(user.role!=='admin')error('Solo administración gestiona los respaldos',403);
  if(a.type==='backup.configure'){
   if(typeof a.enabled!=='boolean')error('Configuración inválida');const copyFolder=String(a.copyFolder||'').trim();if(copyFolder&&(copyFolder.length>300||!path.isAbsolute(copyFolder)||copyFolder.includes('\0')||path.resolve(copyFolder)===folder))error('Indica la ruta absoluta de una carpeta diferente para la copia adicional');const c={enabled:a.enabled,hours:integer(a.hours,1,24),keep:integer(a.keep,7,90),copyFolder};
   db.prepare("INSERT INTO meta(key,value) VALUES('backup-settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(c));return {message:'Configuración de respaldos guardada.'};
  }
  if(a.type!=='backup.create')error('Acción de respaldo desconocida');
  const queued=db.prepare("SELECT id FROM backup_runs WHERE status IN ('queued','running') ORDER BY id LIMIT 1").get();if(queued)return {message:'Ya hay un respaldo en proceso. Consulta su estado.',backup:queued.id};
  const id=Number(db.prepare("INSERT INTO backup_runs(kind,status,user_id,created) VALUES('manual','queued',?,?)").run(user.id,new Date().toISOString()).lastInsertRowid);return {message:'Respaldo manual en cola. Consulta su resultado en este panel.',backup:id};
 }
 function claim(){const now=Date.now();return db.prepare('UPDATE backup_lease SET owner=?,expires=? WHERE id=1 AND (owner=? OR expires<?)').run(owner,now+120000,owner,now).changes===1;}
 async function prune(){
  const keep=config().keep,old=db.prepare("SELECT id,file FROM backup_runs WHERE kind='auto' AND status='completed' ORDER BY id DESC LIMIT -1 OFFSET ?").all(keep);
  for(const r of old){if(!/^mesa-lista-auto-[a-f0-9-]+\.sqlite$/.test(r.file||''))continue;const file=path.join(folder,r.file);try{const info=await fs.lstat(file);if(!info.isFile()||info.isSymbolicLink())continue;await fs.unlink(file);db.prepare("UPDATE backup_runs SET status='deleted' WHERE id=?").run(r.id)}catch(e){if(e.code==='ENOENT')db.prepare("UPDATE backup_runs SET status='deleted' WHERE id=?").run(r.id);else throw e}}
 }
 async function tick(){
  if(stopped||working)return;
  // A lease serializes backup workers even if two server instances share data.
  if(!claim())return;
  const active=db.prepare("SELECT id FROM backup_runs WHERE status='running'").all();
  for(const r of active)db.prepare("UPDATE backup_runs SET status='failed',finished=?,error='Respaldo interrumpido. La copia no se ofrece para descargar; crea una nueva.' WHERE id=?").run(new Date().toISOString(),r.id);
  const c=config(),last=db.prepare("SELECT finished FROM backup_runs WHERE status IN ('completed','deleted') ORDER BY finished DESC LIMIT 1").get(),lastAuto=db.prepare("SELECT created FROM backup_runs WHERE kind='auto' ORDER BY id DESC LIMIT 1").get();
  if(c.enabled&&(!last||Date.now()-Date.parse(last.finished)>=c.hours*3600000)&&(!lastAuto||Date.now()-Date.parse(lastAuto.created)>=300000)&&!db.prepare("SELECT 1 FROM backup_runs WHERE status='queued'").get())db.prepare("INSERT INTO backup_runs(kind,status,created) VALUES('auto','queued',?)").run(new Date().toISOString());
  const run=db.prepare("SELECT * FROM backup_runs WHERE status='queued' ORDER BY id LIMIT 1").get();
  if(!run){db.prepare("UPDATE backup_lease SET owner='',expires=0 WHERE owner=?").run(owner);return}
  db.prepare("UPDATE backup_runs SET status='running' WHERE id=?").run(run.id);
  working=perform(run);try{await working}finally{working=null;db.prepare("UPDATE backup_lease SET owner='',expires=0 WHERE owner=?").run(owner)}
 }
 async function perform(run){
  const file=`mesa-lista-${run.kind}-${randomUUID()}.sqlite`,temporary=path.join(folder,file+'.partial');let readDb;
  const heartbeat=setInterval(()=>db.prepare('UPDATE backup_lease SET expires=? WHERE owner=?').run(Date.now()+120000,owner),15000);heartbeat.unref();
  try{
   await fs.mkdir(folder,{recursive:true});
   readDb=new DatabaseSync(source,{readOnly:true});
   await backup(readDb,temporary);readDb.close();readDb=null;
   // Only expose the finished SQLite copy, never a partially written file.
   verifyDatabase(temporary);await fs.rename(temporary,path.join(folder,file));const info=await fs.stat(path.join(folder,file));
   db.prepare("UPDATE backup_runs SET status='completed',finished=?,file=?,bytes=? WHERE id=?").run(new Date().toISOString(),file,info.size,run.id);
   if(config().copyFolder){try{const replica=await copyVerified(path.join(folder,file),config().copyFolder,file);db.prepare('UPDATE backup_runs SET replica_file=? WHERE id=?').run(replica,run.id)}catch(e){db.prepare('UPDATE backup_runs SET replica_error=? WHERE id=?').run('Copia local disponible; copia adicional falló: '+e.message,run.id)}}
   try{await prune()}catch(e){db.prepare('UPDATE backup_runs SET error=? WHERE id=?').run('Copia guardada; no se pudieron retirar algunas copias automáticas antiguas: '+e.message,run.id)}
  }catch(e){db.prepare("UPDATE backup_runs SET status='failed',finished=?,error=? WHERE id=?").run(new Date().toISOString(),e.message,run.id);try{await fs.unlink(temporary)}catch{}}
  finally{clearInterval(heartbeat);if(readDb)readDb.close()}
 }
 function wake(){if(!stopped)setImmediate(()=>tick().catch(e=>console.error('Respaldos:',e.message)))}
 function start(){if(!stopped)return;stopped=false;timer=setInterval(wake,30000);timer.unref();wake()}
 async function stop(){stopped=true;if(timer)clearInterval(timer);if(working)await working;db.prepare("UPDATE backup_lease SET owner='',expires=0 WHERE owner=?").run(owner)}
 async function download(id){
  integer(id,1,Number.MAX_SAFE_INTEGER);const r=db.prepare("SELECT file FROM backup_runs WHERE id=? AND status='completed'").get(id);if(!r||!/^mesa-lista-(auto|manual)-[a-f0-9-]+\.sqlite$/.test(r.file||''))error('Respaldo no disponible',404);
  const file=path.join(folder,r.file);let info;try{info=await fs.lstat(file)}catch{error('No se encuentra esta copia en el disco',404)}if(!info.isFile()||info.isSymbolicLink())error('Archivo no disponible',404);
  return {file,name:r.file,size:info.size};
 }
 return {state,apply,start,stop,wake,download};
}
module.exports={createBackupManager};
