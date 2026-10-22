const {error,name}=require('./catalog');
const isMenu=category=>String(category).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='menu';
function initMenuEntries(db){
 db.exec("CREATE TABLE IF NOT EXISTS menu_entries(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,price INTEGER NOT NULL DEFAULT 0 CHECK(price=0),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1)");
 if(!db.prepare("SELECT 1 FROM meta WHERE key='menu-entries-seeded'").get()){
  for(const entry of ['Sopa','Ensalada','Ocopa'])db.prepare('INSERT OR IGNORE INTO menu_entries(name) VALUES(?)').run(entry);
  db.prepare("INSERT OR IGNORE INTO meta VALUES('menu-entries-seeded','1')").run();
 }
}
function applyMenuEntry(db,user,a){
 if(user.role!=='admin')error('Solo administración edita las entradas del menú',403);
 const row=a.id?db.prepare('SELECT * FROM menu_entries WHERE id=? AND active=1').get(a.id):null;
 if(a.id&&(!row||row.version!==a.version))error('La entrada cambió. Actualiza y vuelve a editarla.',409);
 if(a.type==='menu-entry.archive'){if(!row)error('Entrada no encontrada');db.prepare('UPDATE menu_entries SET active=0,version=version+1 WHERE id=?').run(row.id);return {message:'Entrada retirada. Los pedidos anteriores se conservan.'}}
 if(a.type!=='menu-entry.save')error('Acción desconocida');
 if(a.price!==0)error('Las entradas incluidas del menú tienen precio S/ 0.00');const label=name(a.name,60);
 if(row)db.prepare('UPDATE menu_entries SET name=?,version=version+1 WHERE id=?').run(label,row.id);
 else{const previous=db.prepare('SELECT * FROM menu_entries WHERE name=? COLLATE NOCASE').get(label);if(previous?.active)error('Ya existe una entrada con ese nombre');if(previous)db.prepare('UPDATE menu_entries SET active=1,version=version+1 WHERE id=?').run(previous.id);else db.prepare('INSERT INTO menu_entries(name) VALUES(?)').run(label)}
 return {message:'Entrada del menú guardada. Precio incluido: S/ 0.00.'};
}
function entryForOrder(db,product,item){
 if(!isMenu(product.category)){if(item.entry_id)error('Las entradas incluidas solo se pueden elegir en productos de la categoría Menú');return product.name}
 const entry=db.prepare('SELECT * FROM menu_entries WHERE id=? AND active=1').get(item.entry_id||0);
 if(!entry||entry.version!==item.entry_version)error('Elige una entrada vigente para '+product.name+'. Retira esa línea y vuelve a agregarla.',409);
 return product.name+' · Entrada: '+entry.name+' (incluida)';
}
module.exports={initMenuEntries,applyMenuEntry,entryForOrder};
