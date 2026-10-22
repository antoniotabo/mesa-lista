const {randomUUID}=require('node:crypto');
const {error,integer}=require('./catalog');
function initPartialPayments(db){db.exec(`
 CREATE TABLE IF NOT EXISTS partial_payments(id TEXT PRIMARY KEY,service_id TEXT NOT NULL REFERENCES services(id),cashier_id INTEGER NOT NULL REFERENCES users(id),total INTEGER NOT NULL,received INTEGER NOT NULL,method TEXT NOT NULL,created TEXT NOT NULL,shift_id INTEGER NOT NULL REFERENCES cash_shifts(id),payer TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS payment_items(payment_id TEXT NOT NULL REFERENCES partial_payments(id),item_id TEXT NOT NULL REFERENCES order_items(id),qty INTEGER NOT NULL CHECK(qty>0),price INTEGER NOT NULL,PRIMARY KEY(payment_id,item_id));
 CREATE INDEX IF NOT EXISTS payment_items_item ON payment_items(item_id);
 CREATE INDEX IF NOT EXISTS partial_payments_service ON partial_payments(service_id);
 CREATE VIEW IF NOT EXISTS payment_ledger AS SELECT 'legacy-'||id AS id,service_id,cashier_id,total,received,method,created,shift_id,'' AS payer FROM payments UNION ALL SELECT id,service_id,cashier_id,total,received,method,created,shift_id,payer FROM partial_payments;
 `);
 db.exec(`CREATE TABLE IF NOT EXISTS payment_collectors(payment_id TEXT PRIMARY KEY,name TEXT NOT NULL,login TEXT NOT NULL,role TEXT NOT NULL,table_name TEXT NOT NULL,space_name TEXT NOT NULL);
 INSERT OR IGNORE INTO payment_collectors SELECT p.id,u.name,u.login,u.role,s.table_name,s.space_name FROM payment_ledger p JOIN users u ON u.id=p.cashier_id JOIN services s ON s.id=p.service_id;`);
}
const paidExpression="(COALESCE((SELECT sum(pi.qty) FROM payment_items pi WHERE pi.item_id=i.id),0)-COALESCE((SELECT sum(ri.qty) FROM refund_items ri WHERE ri.item_id=i.id),0))";
function pay(db,user,a){
 if(!require('./permissions').canCollect(user))error('No tienes permiso para registrar cobros. Solicítalo a administración.',403);
 const s=db.prepare("SELECT * FROM services WHERE id=? AND status!='closed'").get(a.id);if(!s)error('Cuenta ya cerrada',409);
 const shift=db.prepare('SELECT id FROM cash_shifts WHERE closed IS NULL').get();if(!shift)error('Abre la caja antes de cobrar',409);
 const items=db.prepare(`SELECT i.*,${paidExpression} AS paid_qty FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=? AND i.cancelled_at IS NULL`).all(s.id);
 if(!Array.isArray(a.items)||a.items.length>1000)error('Selecciona los productos que se pagan');
 const seen=new Set(),selected=[];let total=0;
 for(const row of a.items){if(seen.has(row.id))error('Producto repetido');seen.add(row.id);const i=items.find(i=>i.id===row.id);if(!i)error('Un producto ya no está disponible',409);const qty=integer(row.qty,1,i.qty-i.paid_qty);if(row.paid_qty!==i.paid_qty)error('Otro cobro cambió las cantidades. Revisa la cuenta.',409);selected.push({...i,paying:qty});total+=qty*i.price;}
 const remaining=items.reduce((n,i)=>n+(i.qty-i.paid_qty)*i.price,0);
 if((!selected.length&&remaining!==0)||total!==a.total)error('Revisa los productos y el total del pago',409);
 const {tenders,received}=require('./payment-tenders').validateTenders(a,total),payer=String(a.payer||'').trim();if(payer.length>80)error('El nombre admite hasta 80 caracteres');
 if(db.prepare("SELECT 1 FROM print_jobs WHERE service_id=? AND kind='bill' AND status IN ('sending','uncertain')").get(s.id))error('Resuelve la precuenta en envío o incierta antes de cobrar.',409);
 const id=randomUUID(),time=new Date().toISOString();
 db.prepare('INSERT INTO partial_payments VALUES(?,?,?,?,?,?,?,?,?)').run(id,s.id,user.id,total,received,a.method,time,shift.id,payer);
 for(const t of tenders)db.prepare('INSERT INTO payment_tenders VALUES(?,?,?,?)').run(id,t.method,t.amount,t.received);
 db.prepare('INSERT INTO payment_collectors VALUES(?,?,?,?,?,?)').run(id,user.name,user.login,user.role,s.table_name,s.space_name);
 for(const i of selected)db.prepare('INSERT INTO payment_items VALUES(?,?,?,?)').run(id,i.id,i.paying,i.price);
 db.prepare('UPDATE cash_shifts SET version=version+1 WHERE id=?').run(shift.id);
 db.prepare("UPDATE print_jobs SET status='cancelled',reason='Precuenta reemplazada por un pago registrado',updated=? WHERE service_id=? AND kind='bill' AND status IN ('queued','blocked','failed')").run(time,s.id);
 const closed=remaining===total;
 db.prepare('UPDATE services SET status=?,closed=? WHERE id=?').run(closed?'closed':'billing',closed?time:null,s.id);
 const job=require('./printing').enqueue(db,{userId:user.id,serviceId:s.id,destination:'Caja',payload:{kind:'sale',payment_id:id,created:time,reference:id.slice(0,8),table:s.table_name,space:s.space_name,waiter:user.name,payer,method:a.method,received,total,tenders,items:selected.map(i=>({name:i.name,qty:i.paying,price:i.price}))}});
 return {payment:id,job,message:closed?'Pago registrado. Mesa pagada y liberada. Nota de venta en Tickets.':'Pago parcial registrado. Queda pendiente S/ '+((remaining-total)/100).toFixed(2)+'. Nota de venta en Tickets.'};
}
module.exports={initPartialPayments,paidExpression,pay};
