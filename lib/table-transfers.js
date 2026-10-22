const {error}=require('./catalog');
const {enqueue}=require('./printing');
function initTransfers(db){
 for(const [table,column,type] of [['services','merged_into','TEXT REFERENCES services(id)'],['orders','origin_table','TEXT'],['orders','origin_space','TEXT']])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
 db.exec(`UPDATE orders SET origin_table=(SELECT table_name FROM services WHERE id=orders.service_id),origin_space=(SELECT space_name FROM services WHERE id=orders.service_id) WHERE origin_table IS NULL;
 CREATE TABLE IF NOT EXISTS table_transfers(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,source_id TEXT NOT NULL REFERENCES services(id),target_id TEXT NOT NULL REFERENCES services(id),from_table TEXT NOT NULL,to_table TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES users(id),reason TEXT NOT NULL,created TEXT NOT NULL);`);
}
function signature(db,id){return db.prepare('SELECT i.id,i.qty,i.cancelled_at,(COALESCE((SELECT sum(pi.qty) FROM payment_items pi WHERE pi.item_id=i.id),0)-COALESCE((SELECT sum(ri.qty) FROM refund_items ri WHERE ri.item_id=i.id),0)) AS paid_qty FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=? ORDER BY i.id').all(id).map(i=>i.id+':'+i.qty+':'+i.paid_qty+':'+(i.cancelled_at||'')).join('|');}
function transfer(db,user,a){
 if(!['admin','cashier'].includes(user.role))error('Solo caja o administración puede mover o unir mesas',403);
 const source=db.prepare("SELECT * FROM services WHERE id=? AND status!='closed'").get(a.id);
 const table=db.prepare('SELECT t.*,s.name AS space_name FROM dining_tables t JOIN spaces s ON s.id=t.space_id WHERE t.id=? AND t.active=1 AND s.active=1').get(a.table);
 if(!source||!table||source.table_id===table.id||source.table_id!==a.sourceTable)error('Las mesas cambiaron. Vuelve a abrir la operación.',409);
 const target=db.prepare("SELECT * FROM services WHERE table_id=? AND status!='closed'").get(table.id);
 if((a.type==='table.move'&&target)||(a.type==='table.merge'&&(!target||target.id!==a.target)))error('El estado de la mesa de destino cambió.',409);
 if(signature(db,source.id)!==a.sourceSignature||(target&&signature(db,target.id)!==a.targetSignature))error('Hay cambios en los pedidos. Vuelve a revisar las mesas antes de confirmar.',409);
 if(target&&db.prepare('SELECT 1 FROM payment_ledger WHERE service_id IN (?,?)').get(source.id,target.id))error('No se pueden unir cuentas que ya tienen pagos parciales. Puedes trasladarlas a mesas libres o terminar de cobrarlas.',409);
 const reason=String(a.reason||'').trim();if(reason.length<3||reason.length>300||a.confirm!==true)error('Indica el motivo y confirma la operación');
 const ids=[source.id,...(target?[target.id]:[])],time=new Date().toISOString();
 for(const id of ids){
  if(db.prepare("SELECT 1 FROM print_jobs WHERE service_id=? AND kind='bill' AND status IN ('sending','uncertain')").get(id))error('Resuelve primero la precuenta en envío o incierta desde Tickets.',409);
  db.prepare("UPDATE print_jobs SET status='cancelled',reason='Precuenta invalidada por cambio de mesa',updated=? WHERE service_id=? AND kind='bill' AND status IN ('queued','blocked','failed')").run(time,id);
 }
 const items=db.prepare('SELECT i.*,o.id AS reference FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=? AND i.cancelled_at IS NULL').all(source.id);
 const destination=target?.id||source.id;
 if(target){
  db.prepare("UPDATE services SET status='closed',closed=?,merged_into=? WHERE id=?").run(time,target.id,source.id);
  db.prepare('UPDATE orders SET service_id=? WHERE service_id=?').run(target.id,source.id);
  db.prepare("UPDATE services SET status='occupied' WHERE id=?").run(target.id);
 }else db.prepare("UPDATE services SET table_id=?,table_name=?,space_name=?,status='occupied' WHERE id=?").run(table.id,table.name,table.space_name,source.id);
 db.prepare('INSERT INTO table_transfers(kind,source_id,target_id,from_table,to_table,user_id,reason,created) VALUES(?,?,?,?,?,?,?,?)').run(a.type,source.id,destination,source.space_name+' / '+source.table_name,table.space_name+' / '+table.name,user.id,reason,time);
 const jobs=[];
 for(const station of new Set(items.map(i=>i.station)))jobs.push(enqueue(db,{userId:user.id,serviceId:destination,destination:station,payload:{kind:'transfer',table:table.name,space:table.space_name,station,waiter:user.name,created:time,note:`De ${source.space_name} / ${source.table_name} a ${table.space_name} / ${table.name}. Motivo: ${reason}`,items:items.filter(i=>i.station===station).map(i=>({name:i.name,qty:i.qty,note:'Pedido original '+i.reference.slice(0,8)}))}}));
 const blocked=jobs.some(id=>db.prepare('SELECT status FROM print_jobs WHERE id=?').get(id).status==='blocked');
 return {service:destination,table:table.id,message:(target?'Mesas unidas.':'Cuenta trasladada.')+' La mesa de origen queda libre. '+(blocked?'Hay avisos sin impresora: comunica el cambio y revisa Tickets.':'Avisos en cola; revisa Tickets.')+' Reemplaza las precuentas anteriores.'};
}
module.exports={initTransfers,transfer};
