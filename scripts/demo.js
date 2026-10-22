const path=require('node:path'),{openDatabase}=require('../lib/database'),{hash}=require('../lib/security'),{createApp}=require('../server');
const dir=process.env.DATA_DIR||path.join(__dirname,'../datos-demo');
const {db,tx}=openDatabase(dir);
if(!db.prepare("SELECT 1 FROM meta WHERE key='demo-users'").get())tx(()=>{
 for(const [name,login,role] of [['Administrador de prueba','admin','admin'],['Ana','ana','waiter'],['Luis','luis','waiter'],['Caja de prueba','caja','cashier']])db.prepare('INSERT INTO users(name,login,role,password) VALUES(?,?,?,?)').run(name,login,role,hash('demo1234'));
 db.prepare('INSERT INTO meta VALUES(?,?)').run('demo-users','1');
});
if(!db.prepare("SELECT 1 FROM meta WHERE key='demo-waiter-collection'").get())tx(()=>{
 db.prepare("UPDATE users SET can_collect=1,version=version+1 WHERE role='waiter' AND active=1").run();
 db.prepare("INSERT INTO meta VALUES('demo-waiter-collection','1')").run();
});db.close();
const {server,shutdown}=createApp(dir,{demo:true}),port=Number(process.env.PORT||3001);server.listen(port,'127.0.0.1',()=>console.log(`DEMO SOLO EN ESTA PC: http://localhost:${port}\nUsuarios: admin, ana, luis, caja. Clave: demo1234\nDatos de ejemplo separados de datos reales.`));

let closing=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(closing)return;closing=true;const timeout=setTimeout(()=>process.exit(1),20000);timeout.unref();shutdown().then(()=>{clearTimeout(timeout);process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})});
