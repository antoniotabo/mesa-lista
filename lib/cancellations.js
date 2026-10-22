const {error,integer}=require('./catalog');
const {enqueue}=require('./printing');
function initCancellations(db){
 db.exec(`CREATE TABLE IF NOT EXISTS cancellation_events(id INTEGER PRIMARY KEY,item_id TEXT NOT NULL REFERENCES order_items(id),user_id INTEGER REFERENCES users(id),qty INTEGER NOT NULL,price INTEGER NOT NULL,name TEXT NOT NULL,station TEXT NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL,legacy INTEGER NOT NULL DEFAULT 0);`);

 const columns=db.prepare('PRAGMA table_info(order_items)').all();
 for(const [name,type] of [['original_qty','INTEGER'],['cancelled_at','TEXT'],['cancelled_by','INTEGER REFERENCES users(id)'],['cancel_reason',"TEXT NOT NULL DEFAULT ''"]])if(!columns.some(c=>c.name===name))db.exec(`ALTER TABLE order_items ADD COLUMN ${name} ${type}`);
 db.exec("UPDATE order_items SET original_qty=qty WHERE original_qty IS NULL");
 db.exec(`INSERT INTO cancellation_events(item_id,user_id,qty,price,name,station,reason,created,legacy) SELECT i.id,i.cancelled_by,i.qty,i.price,i.name,i.station,i.cancel_reason,i.cancelled_at,1 FROM order_items i WHERE i.cancelled_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM cancellation_events e WHERE e.item_id=i.id);`);
}
function cancelItem(db,user,a){
 if(!['admin','cashier'].includes(user.role))error('Solo caja o administración puede anular productos',403);
 const i=db.prepare("SELECT i.*,o.service_id,s.table_name,s.space_name,s.status AS service_status FROM order_items i JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=o.service_id WHERE i.id=?").get(a.id);
 if(!i||i.service_status==='closed')error('Solo se pueden anular productos de cuentas abiertas',409);
 const paid=db.prepare(`SELECT ${require('./partial-payments').paidExpression} AS qty FROM order_items i WHERE i.id=?`).get(i.id).qty;
 if(a.expected_qty!==i.qty||a.expected_paid!==paid)error('La cantidad o los pagos cambiaron. Revisa la línea antes de anular.',409);
 const quantity=integer(a.qty,1,i.qty-paid);
 if(i.cancelled_at)error('Este producto ya fue anulado',409);
 if(a.status!==i.status)error('La preparación cambió. Revisa el estado y vuelve a abrir la anulación.',409);
 const reason=String(a.reason||'').trim();if(reason.length<3||reason.length>300)error('Indica un motivo de 3 a 300 caracteres');
 if(a.confirm!==true)error('Confirma la cantidad que se anulará');
 if(db.prepare("SELECT 1 FROM print_jobs WHERE service_id=? AND kind='bill' AND status IN ('sending','uncertain')").get(i.service_id))error('Resuelve primero la precuenta en envío o con resultado incierto desde Tickets.',409);
 const time=new Date().toISOString();
 db.prepare('INSERT INTO cancellation_events(item_id,user_id,qty,price,name,station,reason,created) VALUES(?,?,?,?,?,?,?,?)').run(i.id,user.id,quantity,i.price,i.name,i.station,reason,time);
 if(quantity===i.qty)db.prepare('UPDATE order_items SET cancelled_at=?,cancelled_by=?,cancel_reason=? WHERE id=?').run(time,user.id,reason,i.id);
 else db.prepare('UPDATE order_items SET qty=? WHERE id=?').run(i.qty-quantity,i.id);
 db.prepare("UPDATE print_jobs SET status='cancelled',reason='Precuenta invalidada por anulación de producto',updated=? WHERE service_id=? AND kind='bill' AND status IN ('queued','blocked','failed')").run(time,i.service_id);
 const job=enqueue(db,{userId:user.id,orderId:i.order_id,serviceId:i.service_id,destination:i.station,payload:{kind:'cancellation',reference:i.order_id.slice(0,8),table:i.table_name,space:i.space_name,station:i.station,waiter:user.name,created:time,note:reason,items:[{name:i.name,qty:quantity,note:'Estado al anular: '+i.status}]}});
 const blocked=db.prepare('SELECT status FROM print_jobs WHERE id=?').get(job).status==='blocked';
 return {job,message:blocked?'Producto anulado y total actualizado. Aviso bloqueado: falta impresora para el área. Comunica la anulación y revisa Tickets.':'Producto anulado y total actualizado. Aviso en cola para el área; revisa Tickets. Si ya entregaste una precuenta, reemplázala.'};
}
module.exports={initCancellations,cancelItem};
