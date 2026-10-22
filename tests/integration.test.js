const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createApp}=require('../server');
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'mesa-v2-test-'));
function remove(dir){const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('mesa-v2-test-'));fs.rmSync(resolved,{recursive:true,force:true})}
async function harness(dir){const app=createApp(dir,{printWorker:false});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 async function req(route,body,cookie,extra={}){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const login=async user=>(await req('login',{login:user,password:'testing123'})).cookie;
 const act=(cookie,a)=>req('action',{requestId:crypto.randomUUID(),...a},cookie);
 const close=async()=>{await new Promise(r=>app.server.close(r));app.db.close()};return {...app,base,req,login,act,close};
}
test('Roles, CRUD, control de versiones, cuentas, reintentos y persistencia',async()=>{
 const dir=mk();let h=await harness(dir);try{
  assert.equal((await h.req('state')).status,401);
  assert.equal((await h.req('setup',{name:'Administrador',password:'testing123'})).status,200);
  assert.equal((await h.req('setup',{name:'Otro',password:'testing123'})).status,409);
  const admin=await h.login('admin');assert.ok(admin);
  let s=(await h.req('state',null,admin)).data;assert.equal(s.tables.length,12);assert.equal(s.user.role,'admin');assert.equal(JSON.stringify(s).includes('password'),false);
  let r=await h.act(admin,{type:'catalog',entity:'user',operation:'save',name:'Ana',login:'ana',role:'waiter',password:'testing123'});assert.equal(r.status,200);
  const waiter=await h.login('ana');r=await h.act(waiter,{type:'catalog',entity:'space',operation:'save',name:'No permitido'});assert.equal(r.status,403);
  r=await h.act(admin,{type:'catalog',entity:'space',operation:'save',name:'Segundo piso'});assert.equal(r.status,200);
  s=(await h.req('state',null,admin)).data;const space=s.spaces.find(x=>x.name==='Segundo piso');
  await h.act(admin,{type:'catalog',entity:'table',operation:'save',name:'Mesa VIP',space_id:space.id,seats:6});
  s=(await h.req('state',null,admin)).data;const table=s.tables.find(t=>t.name==='Mesa VIP');assert.equal(table.space_id,space.id);
  assert.equal((await h.act(admin,{type:'catalog',entity:'space',operation:'archive',id:space.id,version:space.version})).status,400);
  const p=s.products[0];const update={type:'catalog',entity:'product',operation:'save',id:p.id,version:p.version,name:'Pollo especial',category:p.category,station_id:p.station_id,price:2500,available:true};
  const simultaneous=await Promise.all([h.act(admin,update),h.act(admin,{...update,name:'Otro cambio'})]);assert.deepEqual(simultaneous.map(x=>x.status).sort(),[200,409]);
  s=(await h.req('state',null,admin)).data;const product=s.products.find(x=>x.id===p.id);
  const rid=crypto.randomUUID(),order={type:'send',table:table.id,items:[{id:p.id,price:product.price,qty:2,note:'Sin ají'}],note:'Para llevar',requestId:rid};
  assert.equal((await h.act(waiter,order)).status,200);assert.equal((await h.act(waiter,order)).status,200);
  s=(await h.req('state',null,admin)).data;let service=s.services.find(x=>x.table_id===table.id);assert.equal(service.items.length,1);assert.equal(service.items[0].waiter,'Ana');assert.equal(service.items[0].order_note,'Para llevar');
  assert.equal((await h.act(admin,{type:'catalog',entity:'table',operation:'archive',id:table.id,version:table.version})).status,400);
  assert.equal((await h.act(admin,{...update,version:product.version,price:3000})).status,200);
  s=(await h.req('state',null,admin)).data;assert.equal(s.services[0].items[0].price,2500);
  assert.equal((await h.act(waiter,{type:'pay',id:service.id,total:5000,received:5000,method:'Efectivo'})).status,403);
  assert.equal((await h.act(waiter,{type:'bill',id:service.id})).status,200);
  assert.equal((await h.act(waiter,{...order,items:[{id:p.id,price:3000,qty:1}],requestId:crypto.randomUUID()})).status,409);
  assert.equal((await h.act(admin,{type:'pay',id:service.id,total:4900,received:5000,method:'Efectivo'})).status,409);
  assert.equal((await h.act(admin,{type:'pay',id:service.id,total:5000,received:6000,method:'Efectivo'})).status,200);
  s=(await h.req('state',null,waiter)).data;assert.equal(s.history.length,1);assert.equal(s.history[0].total,5000);assert.equal(s.payments.length,0);assert.equal(s.users.length,0);
  assert.equal((await h.act(admin,{type:'catalog',entity:'table',operation:'archive',id:table.id,version:table.version})).status,200);
  assert.equal((await h.act(admin,{type:'catalog',entity:'space',operation:'archive',id:space.id,version:space.version})).status,200);
  assert.equal((await h.req('action',{type:'send',requestId:crypto.randomUUID()},waiter,{Origin:'http://another-site.example'})).status,403);
  const self=(await h.req('state',null,admin)).data.users.find(u=>u.role==='admin');assert.equal((await h.act(admin,{type:'catalog',entity:'user',operation:'archive',id:self.id,version:self.version})).status,400);
  const ana=(await h.req('state',null,admin)).data.users.find(u=>u.login==='ana');assert.equal((await h.act(admin,{type:'catalog',entity:'user',operation:'archive',id:ana.id,version:ana.version})).status,200);assert.equal((await h.req('state',null,waiter)).status,401);
  await h.close();h=await harness(dir);const again=await h.login('admin');s=(await h.req('state',null,again)).data;assert.equal(s.payments.length,1);assert.equal(s.history[0].table_name,'Mesa VIP');assert.equal(s.history[0].space_name,'Segundo piso');assert.equal(s.services.length,0);
 }finally{await h.close();remove(dir)}
});
test('Credenciales: errores de acceso y bloqueo temporal',async()=>{const dir=mk(),h=await harness(dir);try{await h.req('setup',{name:'Admin',password:'testing123'});for(let i=0;i<10;i++)assert.equal((await h.req('login',{login:'admin',password:'incorrecta'})).status,401);assert.equal((await h.req('login',{login:'admin',password:'testing123'})).status,429)}finally{await h.close();remove(dir)}});
test('Importación v1 conserva datos, genera respaldo y evita duplicar',async()=>{
 const {DatabaseSync}=require('node:sqlite'),{spawnSync}=require('node:child_process');const dir=mk(),oldFile=path.join(dir,'old.sqlite'),dest=path.join(dir,'new'),old=new DatabaseSync(oldFile);
 old.exec('CREATE TABLE state(id INTEGER PRIMARY KEY,data TEXT)');const account={id:'old-service',table:1,waiter:'Mozo anterior',opened:'2026-10-14T15:00:00Z',items:[{id:'item',product:1,name:'Chaufa',price:1800,qty:2,station:'Cocina',note:'Sin sal',status:'Entregado'}],closed:'2026-10-14T16:00:00Z',total:3600,received:4000,method:'Efectivo'};
 old.prepare('INSERT INTO state VALUES(1,?)').run(JSON.stringify({tables:[{id:1,name:'Mesa antigua'}],products:[{id:1,name:'Chaufa',category:'Chifa',station:'Cocina',price:1800,active:true}],orders:[],sales:[account]}));old.close();
 try{const script=path.join(__dirname,'../scripts/import-v1.js'),run=()=>spawnSync(process.execPath,[script,oldFile],{env:{...process.env,DATA_DIR:dest},encoding:'utf8'});let r=run();assert.equal(r.status,0,r.stderr);const db=new DatabaseSync(path.join(dest,'mesa-lista-v2.sqlite'));assert.equal(db.prepare('SELECT total FROM payments').get().total,3600);assert.equal(db.prepare('SELECT note FROM order_items').get().note,'Sin sal');assert.equal(db.prepare('SELECT count(*) AS n FROM products').get().n,1);db.close();assert.equal(fs.readdirSync(path.join(dest,'respaldos')).length,1);r=run();assert.equal(r.status,1)}finally{remove(dir)}
});
