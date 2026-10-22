const {DatabaseSync,backup}=require('node:sqlite'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {openDatabase}=require('../lib/database');
async function run(){
 const source=path.resolve(process.argv[2]||path.join(__dirname,'../../mesa-lista/datos/mesa-lista.sqlite'));
 const dest=path.resolve(process.env.DATA_DIR||path.join(__dirname,'../datos'));fs.mkdirSync(path.join(dest,'respaldos'),{recursive:true});
 const {db,tx}=openDatabase(dest);try{
 if(db.prepare("SELECT value FROM meta WHERE key='import-v1'").get())throw Error('La versión anterior ya fue importada. No se repetirá.');
 if(db.prepare('SELECT 1 FROM services LIMIT 1').get()||db.prepare('SELECT 1 FROM audit LIMIT 1').get())throw Error('La versión nueva ya tiene actividad. No se sobrescribirá.');
 const old=new DatabaseSync(source,{readOnly:true});let s;try{await backup(old,path.join(dest,'respaldos','mesa-lista-v1-'+Date.now()+'.sqlite'));s=JSON.parse(old.prepare('SELECT data FROM state WHERE id=1').get().data)}finally{old.close()}
 tx(()=>{
  db.exec('DELETE FROM products; DELETE FROM dining_tables; DELETE FROM categories;');
  const space=db.prepare('SELECT id FROM spaces ORDER BY id LIMIT 1').get().id;
  for(const t of s.tables)db.prepare('INSERT INTO dining_tables(id,name,space_id) VALUES(?,?,?)').run(t.id,t.name,space);
  for(const p of s.products){db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').run(p.category);db.prepare('INSERT OR IGNORE INTO stations(name) VALUES(?)').run(p.station);db.prepare('INSERT INTO products(id,name,category_id,station_id,price,available) VALUES(?,?,?,?,?,?)').run(p.id,p.name,db.prepare('SELECT id FROM categories WHERE name=?').get(p.category).id,db.prepare('SELECT id FROM stations WHERE name=?').get(p.station).id,p.price,+p.active)}
  let index=0;const people=new Map();function waiter(label){label=label||'Equipo anterior';if(people.has(label))return people.get(label);const id=Number(db.prepare("INSERT INTO users(name,login,role,password,active) VALUES(?,?,'waiter',NULL,0)").run(label,'historico-'+(++index)).lastInsertRowid);people.set(label,id);return id}
  const all=[...(s.orders||[]).map(o=>({...o,closed:null})),...(s.sales||[])];
  for(const o of all){let t=db.prepare('SELECT t.*,s.name AS space FROM dining_tables t JOIN spaces s ON s.id=t.space_id WHERE t.id=?').get(o.table);if(!t){db.prepare('INSERT INTO dining_tables(id,name,space_id,active) VALUES(?,?,?,0)').run(o.table,'Mesa histórica '+o.table,space);t=db.prepare('SELECT t.*,s.name AS space FROM dining_tables t JOIN spaces s ON s.id=t.space_id WHERE t.id=?').get(o.table)}
   const who=waiter(o.waiter),service='v1-'+o.id,order=crypto.randomUUID();db.prepare('INSERT INTO services(id,table_id,waiter_id,table_name,space_name,status,opened,closed) VALUES(?,?,?,?,?,?,?,?)').run(service,t.id,who,t.name,t.space,o.closed?'closed':'occupied',o.opened,o.closed||null);db.prepare('INSERT INTO orders(id,service_id,waiter_id,created) VALUES(?,?,?,?)').run(order,service,who,o.opened);
   for(const i of o.items)db.prepare('INSERT INTO order_items(id,order_id,product_id,name,price,qty,station,note,status) VALUES(?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),order,db.prepare('SELECT id FROM products WHERE id=?').get(i.product)?.id||null,i.name,i.price,i.qty,i.station,i.note||'',i.status||'Pendiente');
   if(o.closed)db.prepare('INSERT INTO payments(service_id,total,received,method,created) VALUES(?,?,?,?,?)').run(service,o.total,o.received,o.method,o.closed);
  }
  db.prepare('INSERT INTO meta VALUES(?,?)').run('import-v1',new Date().toISOString());
 });console.log(JSON.stringify({mesas:s.tables.length,productos:s.products.length,cuentasAbiertas:s.orders.length,ventas:s.sales.length,respaldo:'datos/respaldos'}));
 }finally{db.close()}
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
