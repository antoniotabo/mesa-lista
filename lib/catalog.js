const {hash}=require('./security');
function error(message,status=400){throw Object.assign(new Error(message),{status})}
function name(v,max=80){if(typeof v!=='string'||!v.trim()||v.trim().length>max)error(`Escribe un nombre de 1 a ${max} caracteres`);return v.trim()}
function integer(v,min,max){if(!Number.isInteger(v)||v<min||v>max)error('Valor numérico inválido');return v}
function version(a,row){if(!row)error('Registro no encontrado',404);if(a.version!==row.version)error('Otra persona modificó este registro. Actualiza y vuelve a abrirlo.',409)}
function applyCatalog(db,user,a){
 if(user.role!=='admin')error('Solo administración puede realizar esta acción',403);
 const table={space:'spaces',table:'dining_tables',product:'products',user:'users'}[a.entity];if(!table)error('Tipo de registro inválido');
 const row=a.id?db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(a.id):null;if(a.id)version(a,row);
 if(a.operation==='archive'){
  if(!row)error('Registro no encontrado');
  if(a.entity==='user'){
   if(row.id===user.id)error('No puedes desactivar tu propio usuario');
   if(row.role==='admin'&&db.prepare("SELECT count(*) AS n FROM users WHERE role='admin' AND active=1").get().n<=1)error('Debe quedar un administrador activo');
   db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);
  }
  if(a.entity==='space'&&db.prepare('SELECT 1 FROM dining_tables WHERE space_id=? AND active=1').get(row.id))error('Mueve o retira las mesas de este espacio primero');
  if(a.entity==='table'&&db.prepare("SELECT 1 FROM services WHERE table_id=? AND status!='closed'").get(row.id))error('No puedes retirar una mesa con atención abierta');
  db.prepare(`UPDATE ${table} SET active=0,version=version+1 WHERE id=?`).run(row.id);return;
 }
 if(a.operation!=='save')error('Operación inválida');const label=name(a.name);
 if(a.entity==='space'){
  if(row)db.prepare('UPDATE spaces SET name=?,version=version+1 WHERE id=?').run(label,row.id);else db.prepare('INSERT INTO spaces(name) VALUES(?)').run(label);
 }
 if(a.entity==='table'){
  const space=db.prepare('SELECT * FROM spaces WHERE id=? AND active=1').get(a.space_id);if(!space)error('Elige un espacio activo');const seats=integer(a.seats,1,30);
  if(row&&db.prepare("SELECT 1 FROM services WHERE table_id=? AND status!='closed'").get(row.id))error('Edita la mesa cuando termine su atención');
  if(row)db.prepare('UPDATE dining_tables SET name=?,space_id=?,seats=?,version=version+1 WHERE id=?').run(label,space.id,seats,row.id);else db.prepare('INSERT INTO dining_tables(name,space_id,seats) VALUES(?,?,?)').run(label,space.id,seats);
 }
 if(a.entity==='product'){
  const price=integer(a.price,1,10000000);if(!db.prepare('SELECT id FROM stations WHERE id=?').get(a.station_id))error('Área inválida');const category=name(a.category,40);
  db.prepare('INSERT OR IGNORE INTO categories(name) VALUES(?)').run(category);const cat=db.prepare('SELECT id FROM categories WHERE name=? COLLATE NOCASE').get(category).id;
  if(typeof a.available!=='boolean')error('Disponibilidad inválida');
  if(row)db.prepare('UPDATE products SET name=?,category_id=?,station_id=?,price=?,available=?,version=version+1 WHERE id=?').run(label,cat,a.station_id,price,+a.available,row.id);else db.prepare('INSERT INTO products(name,category_id,station_id,price,available) VALUES(?,?,?,?,?)').run(label,cat,a.station_id,price,+a.available);
 }
 if(a.entity==='user'){
  const login=name(a.login,40).toLowerCase();if(!/^[a-z0-9._-]+$/.test(login))error('El usuario solo admite letras sin acentos, números, punto, guion y guion bajo');if(!['admin','cashier','waiter'].includes(a.role))error('Rol inválido');
  if(row?.id===user.id&&a.role!=='admin')error('No puedes quitarte tu propio permiso de administrador');
  if(row?.role==='admin'&&a.role!=='admin'&&db.prepare("SELECT count(*) AS n FROM users WHERE role='admin' AND active=1").get().n<=1)error('Debe quedar un administrador');
  if(!row||a.password){if(typeof a.password!=='string'||a.password.length<6||a.password.length>128)error('La clave debe tener entre 6 y 128 caracteres')}
  const password=a.password?hash(a.password):row.password;
  if(typeof a.can_collect!=='boolean')error('Indica el permiso de cobro del usuario');const collect=+a.can_collect;for(const field of ['can_prepare','can_deliver'])if(typeof a[field]!=='boolean')error('Revisa los permisos de preparación y entrega');const prepare=+a.can_prepare,deliver=+a.can_deliver;
  if(row){db.prepare('UPDATE users SET name=?,login=?,role=?,password=?,can_collect=?,can_prepare=?,can_deliver=?,version=version+1 WHERE id=?').run(label,login,a.role,password,collect,prepare,deliver,row.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id)}else db.prepare('INSERT INTO users(name,login,role,password,can_collect,can_prepare,can_deliver) VALUES(?,?,?,?,?,?,?)').run(label,login,a.role,password,collect,prepare,deliver);
 }
}
module.exports={applyCatalog,error,name,integer};
