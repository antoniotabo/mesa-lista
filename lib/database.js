const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
function openDatabase(dir){
 fs.mkdirSync(dir,{recursive:true});
 const db=new DatabaseSync(path.join(dir,'mesa-lista-v2.sqlite'));
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,login TEXT NOT NULL UNIQUE COLLATE NOCASE,role TEXT NOT NULL CHECK(role IN ('admin','cashier','waiter')),password TEXT,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS spaces(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS dining_tables(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,space_id INTEGER NOT NULL REFERENCES spaces(id),seats INTEGER NOT NULL DEFAULT 4 CHECK(seats BETWEEN 1 AND 30),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS stations(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE);
 CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category_id INTEGER NOT NULL REFERENCES categories(id),station_id INTEGER NOT NULL REFERENCES stations(id),price INTEGER NOT NULL CHECK(price>0),available INTEGER NOT NULL DEFAULT 1,active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS services(id TEXT PRIMARY KEY,table_id INTEGER NOT NULL REFERENCES dining_tables(id),waiter_id INTEGER NOT NULL REFERENCES users(id),table_name TEXT NOT NULL,space_name TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('occupied','billing','closed')),opened TEXT NOT NULL,closed TEXT);
 CREATE UNIQUE INDEX IF NOT EXISTS one_service_per_table ON services(table_id) WHERE status!='closed';
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,service_id TEXT NOT NULL REFERENCES services(id),waiter_id INTEGER NOT NULL REFERENCES users(id),note TEXT NOT NULL DEFAULT '',created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),product_id INTEGER REFERENCES products(id),name TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 99),station TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'Pendiente');
 CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY,service_id TEXT NOT NULL UNIQUE REFERENCES services(id),cashier_id INTEGER REFERENCES users(id),total INTEGER NOT NULL,received INTEGER NOT NULL,method TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS requests(user_id INTEGER NOT NULL REFERENCES users(id),key TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,key));
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
 `);
 function tx(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
 if(!db.prepare("SELECT 1 FROM meta WHERE key='schema'").get())tx(()=>{
  db.prepare('INSERT INTO meta VALUES(?,?)').run('schema','1');
  for(const name of ['Salón principal','Terraza','Barra','Para llevar'])db.prepare('INSERT INTO spaces(name) VALUES(?)').run(name);
  for(const name of ['Cocina','Bar','Heladería'])db.prepare('INSERT INTO stations(name) VALUES(?)').run(name);
  for(const name of ['Pollos a la brasa','Parrillas','Menú','Bebidas','Postres'])db.prepare('INSERT INTO categories(name) VALUES(?)').run(name);
  for(let i=1;i<=12;i++)db.prepare('INSERT INTO dining_tables(name,space_id) VALUES(?,?)').run(`Mesa ${i}`,i<=8?1:2);
  const products=[['¼ de pollo + papas',1,1,2200],['½ pollo + papas',1,1,4200],['Pollo entero familiar',1,1,7800],['Anticuchos de corazón',2,1,2600],['Menú del día',3,1,1500],['Chicha morada · vaso',4,2,600],['Limonada · jarra',4,2,1600],['Copa de helado',5,3,1000]];
  for(const p of products)db.prepare('INSERT INTO products(name,category_id,station_id,price) VALUES(?,?,?,?)').run(...p);
 });
 require('./printing').initPrinting(db);
 require('./register').initRegister(db);
 require('./cancellations').initCancellations(db);
 require('./table-transfers').initTransfers(db);
 require('./partial-payments').initPartialPayments(db);
 require('./payment-tenders').initTenders(db);
 require('./payment-adjustments').initAdjustments(db);
 require('./menu-entries').initMenuEntries(db);
 require('./permissions').initPermissions(db);
 return {db,tx};
}
module.exports={openDatabase};
