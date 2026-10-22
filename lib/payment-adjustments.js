const {randomUUID}=require('node:crypto');
const {error,name,integer}=require('./catalog');
const {enqueue}=require('./printing');
const methods=['Efectivo','Yape / Plin','Tarjeta'];
function initAdjustments(db){db.exec(`
 CREATE TABLE IF NOT EXISTS payment_refunds(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL UNIQUE REFERENCES partial_payments(id),service_id TEXT NOT NULL REFERENCES services(id),user_id INTEGER NOT NULL REFERENCES users(id),shift_id INTEGER NOT NULL REFERENCES cash_shifts(id),total INTEGER NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS refund_items(refund_id TEXT NOT NULL REFERENCES payment_refunds(id),item_id TEXT NOT NULL REFERENCES order_items(id),qty INTEGER NOT NULL,price INTEGER NOT NULL,name TEXT NOT NULL,station TEXT NOT NULL,PRIMARY KEY(refund_id,item_id));
 CREATE INDEX IF NOT EXISTS refund_items_item ON refund_items(item_id);
 CREATE TABLE IF NOT EXISTS refund_tenders(refund_id TEXT NOT NULL REFERENCES payment_refunds(id),method TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(refund_id,method));
 CREATE TABLE IF NOT EXISTS payment_method_changes(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES partial_payments(id),from_method TEXT NOT NULL,to_method TEXT NOT NULL,amount INTEGER NOT NULL,user_id INTEGER NOT NULL REFERENCES users(id),shift_id INTEGER NOT NULL REFERENCES cash_shifts(id),reason TEXT NOT NULL,created TEXT NOT NULL);
 CREATE VIEW IF NOT EXISTS tender_movements AS SELECT payment_id,shift_id,created,method,amount,'payment' AS kind FROM payment_tender_ledger
 UNION ALL SELECT r.payment_id,r.shift_id,r.created,t.method,-t.amount,'refund' FROM payment_refunds r JOIN refund_tenders t ON t.refund_id=r.id
 UNION ALL SELECT payment_id,shift_id,created,from_method,-amount,'correction' FROM payment_method_changes
 UNION ALL SELECT payment_id,shift_id,created,to_method,amount,'correction' FROM payment_method_changes;
 `);}
function effectiveTenders(db,payment){return db.prepare("SELECT method,sum(amount) AS amount FROM tender_movements WHERE payment_id=? AND kind!='refund' GROUP BY method HAVING sum(amount)>0 ORDER BY method").all(payment);}
function details(db,p){return {...p,effectiveTenders:effectiveTenders(db,p.id),refund:db.prepare('SELECT r.*,u.name AS author FROM payment_refunds r JOIN users u ON u.id=r.user_id WHERE r.payment_id=?').get(p.id)||null,corrections:db.prepare('SELECT c.*,u.name AS author FROM payment_method_changes c JOIN users u ON u.id=c.user_id WHERE payment_id=? ORDER BY created').all(p.id)};}
function applyAdjustment(db,user,a){
 if(!['admin','cashier'].includes(user.role))error('Solo caja o administración puede corregir o devolver cobros',403);
 if(a.confirm!==true)error('Confirma que realizaste el ajuste del dinero');
 const reason=name(a.reason,300);if(reason.length<3)error('Indica un motivo de al menos tres caracteres');const p=db.prepare('SELECT p.*,s.table_name,s.space_name FROM partial_payments p JOIN services s ON s.id=p.service_id WHERE p.id=?').get(a.payment);
 if(!p||p.total<=0)error('Este pago no admite ajustes');
 if(db.prepare('SELECT 1 FROM payment_refunds WHERE payment_id=?').get(p.id))error('Este pago ya fue devuelto',409);
 const shift=db.prepare('SELECT id FROM cash_shifts WHERE closed IS NULL').get();if(!shift)error('Abre un turno de caja antes de registrar el ajuste',409);
 const current=effectiveTenders(db,p.id),signature=JSON.stringify(current);
 if(a.signature!==signature)error('Otro ajuste cambió el pago. Actualiza el detalle antes de continuar.',409);
 const id=randomUUID(),created=new Date().toISOString(),payload={created,table:p.table_name,space:p.space_name,waiter:user.name,reference:p.id.slice(0,8),note:reason,items:[]};
 if(a.type==='payment.refund'){
  const cash=current.find(t=>t.method==='Efectivo')?.amount||0;if(cash>require('./register').shiftDetail(db,shift.id).expected)error('La caja no tiene suficiente efectivo registrado para esta devolución');
  const items=db.prepare('SELECT pi.*,i.name,i.station,i.qty AS current_qty,i.status FROM payment_items pi JOIN order_items i ON i.id=pi.item_id WHERE payment_id=?').all(p.id);
  if(!items.length||items.reduce((n,i)=>n+i.qty*i.price,0)!==p.total)error('No se pudo reconstruir el detalle del pago');
  db.prepare('INSERT INTO payment_refunds VALUES(?,?,?,?,?,?,?,?)').run(id,p.id,p.service_id,user.id,shift.id,p.total,reason,created);
  for(const t of current)db.prepare('INSERT INTO refund_tenders VALUES(?,?,?)').run(id,t.method,t.amount);
  for(const i of items){
   if(i.qty>i.current_qty)error('La cantidad del producto cambió. Revisa la devolución.',409);
   db.prepare('INSERT INTO refund_items VALUES(?,?,?,?,?,?)').run(id,i.item_id,i.qty,i.price,i.name,i.station);
   db.prepare('INSERT INTO cancellation_events(item_id,user_id,qty,price,name,station,reason,created) VALUES(?,?,?,?,?,?,?,?)').run(i.item_id,user.id,i.qty,i.price,i.name,i.station,'Devolución: '+reason,created);
   if(i.qty===i.current_qty)db.prepare('UPDATE order_items SET cancelled_at=?,cancelled_by=?,cancel_reason=? WHERE id=?').run(created,user.id,'Devolución: '+reason,i.item_id);
   else db.prepare('UPDATE order_items SET qty=qty-? WHERE id=?').run(i.qty,i.item_id);
  }
  for(const station of new Set(items.map(i=>i.station)))enqueue(db,{userId:user.id,serviceId:p.service_id,destination:station,payload:{...payload,kind:'cancellation',station,note:'Pago devuelto. Detener las unidades indicadas. '+reason,items:items.filter(i=>i.station===station).map(i=>({name:i.name,qty:i.qty}))}});
  Object.assign(payload,{kind:'refund',total:p.total,tenders:current});
 }else if(a.type==='payment.correct-method'){
  if(!methods.includes(a.from_method)||!methods.includes(a.to_method)||a.from_method===a.to_method)error('Selecciona dos medios distintos');
  const amount=integer(a.amount,1,current.find(t=>t.method===a.from_method)?.amount||0);
  if(a.from_method==='Efectivo'&&amount>require('./register').shiftDetail(db,shift.id).expected)error('El ajuste dejaría la caja con efectivo negativo. Revisa el turno.');
  db.prepare('INSERT INTO payment_method_changes VALUES(?,?,?,?,?,?,?,?,?)').run(id,p.id,a.from_method,a.to_method,amount,user.id,shift.id,reason,created);
  Object.assign(payload,{kind:'payment-correction',total:amount,note:`${a.from_method} → ${a.to_method}. ${reason}`});
 }else error('Ajuste desconocido');
 db.prepare('UPDATE cash_shifts SET version=version+1 WHERE id=?').run(shift.id);
 const job=enqueue(db,{userId:user.id,serviceId:p.service_id,destination:'Caja',payload});
 return {job,payment:p.id,adjustment:id,message:a.type==='payment.refund'?'Devolución total registrada. Se conservó el pago original y se generaron avisos para Caja y preparación.':'Medio de pago corregido con registro del ajuste en el turno actual.'};
}
module.exports={initAdjustments,effectiveTenders,details,applyAdjustment};
