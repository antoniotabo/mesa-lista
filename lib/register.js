const {error,integer}=require('./catalog');
const now=()=>new Date().toISOString();
function initRegister(db){
 db.exec(`CREATE TABLE IF NOT EXISTS cash_shifts(id INTEGER PRIMARY KEY,opened TEXT NOT NULL,opened_by INTEGER NOT NULL REFERENCES users(id),opening INTEGER NOT NULL,closed TEXT,closed_by INTEGER REFERENCES users(id),counted INTEGER,expected INTEGER,difference INTEGER,note TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1);
 CREATE UNIQUE INDEX IF NOT EXISTS one_open_register ON cash_shifts((1)) WHERE closed IS NULL;
 CREATE TABLE IF NOT EXISTS cash_movements(id INTEGER PRIMARY KEY,shift_id INTEGER NOT NULL REFERENCES cash_shifts(id),user_id INTEGER NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('income','expense')),amount INTEGER NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(payments)').all().some(c=>c.name==='shift_id'))db.exec('ALTER TABLE payments ADD COLUMN shift_id INTEGER REFERENCES cash_shifts(id)');
}
function shiftDetail(db,id){
 const s=db.prepare('SELECT s.*,u.name AS opener,c.name AS closer FROM cash_shifts s JOIN users u ON u.id=s.opened_by LEFT JOIN users c ON c.id=s.closed_by WHERE s.id=?').get(id);if(!s)error('Turno no encontrado',404);
 const payments=db.prepare('SELECT p.*,s.table_name,COALESCE(pc.name,u.name) AS cashier,pc.login AS collector_login,pc.role AS collector_role,pc.table_name AS paid_table,pc.space_name AS paid_space FROM payment_ledger p JOIN services s ON s.id=p.service_id LEFT JOIN users u ON u.id=p.cashier_id LEFT JOIN payment_collectors pc ON pc.payment_id=p.id WHERE shift_id=? ORDER BY p.created').all(id).map(p=>require('./payment-tenders').withTenders(db,p));
 const movements=db.prepare('SELECT m.*,u.name AS author FROM cash_movements m JOIN users u ON u.id=m.user_id WHERE shift_id=? ORDER BY m.id').all(id);
 const totals={};for(const t of db.prepare('SELECT method,sum(amount) AS amount FROM tender_movements WHERE shift_id=? GROUP BY method').all(id))totals[t.method]=t.amount;
 const refunds=db.prepare('SELECT r.*,u.name AS author FROM payment_refunds r JOIN users u ON u.id=r.user_id WHERE shift_id=? ORDER BY created').all(id);const corrections=db.prepare('SELECT c.*,u.name AS author FROM payment_method_changes c JOIN users u ON u.id=c.user_id WHERE shift_id=? ORDER BY created').all(id);
 const income=movements.filter(m=>m.kind==='income').reduce((n,m)=>n+m.amount,0),expense=movements.filter(m=>m.kind==='expense').reduce((n,m)=>n+m.amount,0);
 return {...s,payments,refunds,corrections,movements,totals,income,expense,expected:s.closed?s.expected:s.opening+(totals.Efectivo||0)+income-expense};
}
function registerState(db,user){if(user.role==='waiter'){if(!require('./permissions').canCollect(user))return {};return {register:db.prepare('SELECT id FROM cash_shifts WHERE closed IS NULL').get()||null}};const s=db.prepare('SELECT id FROM cash_shifts WHERE closed IS NULL').get();return {register:s?shiftDetail(db,s.id):null};}
function applyRegister(db,user,a){
 if(user.role==='waiter')error('Solo caja o administración puede gestionar caja',403);
 const s=db.prepare('SELECT * FROM cash_shifts WHERE closed IS NULL').get();
 if(a.type==='cash.open'){if(s)error('Ya hay una caja abierta',409);integer(a.opening,0,100000000);const r=db.prepare('INSERT INTO cash_shifts(opened,opened_by,opening) VALUES(?,?,?)').run(now(),user.id,a.opening);return {message:'Caja abierta',shift:Number(r.lastInsertRowid)};}
 if(!s||s.id!==a.shift)error('El turno de caja cambió. Actualiza la pantalla.',409);
 if(a.type==='cash.move'){
  if(!['income','expense'].includes(a.kind))error('Movimiento inválido');integer(a.amount,1,100000000);const reason=String(a.reason||'').trim();if(reason.length<3||reason.length>300)error('Indica un motivo de 3 a 300 caracteres');
  db.prepare('INSERT INTO cash_movements(shift_id,user_id,kind,amount,reason,created) VALUES(?,?,?,?,?,?)').run(s.id,user.id,a.kind,a.amount,reason,now());db.prepare('UPDATE cash_shifts SET version=version+1 WHERE id=?').run(s.id);return {message:'Movimiento de efectivo registrado'};
 }
 if(a.type==='cash.close'){
  if(s.version!==a.version)error('La caja recibió cambios. Revisa los importes antes de cerrar.',409);integer(a.counted,0,100000000);
  const expected=shiftDetail(db,s.id).expected,note=String(a.note||'').trim();if(note.length>500)error('La observación admite hasta 500 caracteres');if(a.counted!==expected&&note.length<3)error('Explica la diferencia entre el efectivo contado y el esperado');
  db.prepare('UPDATE cash_shifts SET closed=?,closed_by=?,counted=?,expected=?,difference=?,note=?,version=version+1 WHERE id=?').run(now(),user.id,a.counted,expected,a.counted-expected,note,s.id);return {message:'Caja cerrada. El cierre queda conservado en el historial.'};
 }error('Acción de caja desconocida');
}
function history(db,user,q){
 const cashier=user.role!=='waiter';
 if(q.get('shift')){if(!cashier)error('Acceso restringido',403);return {shift:shiftDetail(db,Number(q.get('shift')))};}
 if(q.get('service')){
  const s=db.prepare('SELECT s.*,u.name AS waiter FROM services s JOIN users u ON u.id=s.waiter_id WHERE s.id=?').get(q.get('service'));if(!s)error('Atención no encontrada',404);
  if(!cashier&&!db.prepare('SELECT 1 FROM orders WHERE service_id=? AND waiter_id=? UNION ALL SELECT 1 FROM payment_ledger WHERE service_id=? AND cashier_id=?').get(s.id,user.id,s.id,user.id))error('Acceso restringido',403);
  const items=db.prepare('SELECT i.*,(COALESCE((SELECT sum(pi.qty) FROM payment_items pi WHERE pi.item_id=i.id),0)-COALESCE((SELECT sum(ri.qty) FROM refund_items ri WHERE ri.item_id=i.id),0)) AS paid_qty,(SELECT name FROM users WHERE id=i.cancelled_by) AS canceller,o.origin_table,o.origin_space,o.created,o.note AS order_note,u.name AS waiter FROM order_items i JOIN orders o ON o.id=i.order_id JOIN users u ON u.id=o.waiter_id WHERE o.service_id=? ORDER BY o.created,i.rowid').all(s.id);
  const transfers=db.prepare('SELECT t.*,u.name AS author FROM table_transfers t JOIN users u ON u.id=t.user_id WHERE t.source_id=? OR t.target_id=? ORDER BY t.id').all(s.id,s.id);
  const cancellations=db.prepare('SELECT e.*,u.name AS author FROM cancellation_events e JOIN order_items i ON i.id=e.item_id JOIN orders o ON o.id=i.order_id LEFT JOIN users u ON u.id=e.user_id WHERE o.service_id=? ORDER BY e.id').all(s.id);
  return {service:{...s,items,transfers,cancellations,payments:db.prepare('SELECT p.*,COALESCE(pc.name,u.name) AS cashier,pc.login AS collector_login,pc.role AS collector_role,pc.table_name AS paid_table,pc.space_name AS paid_space FROM payment_ledger p LEFT JOIN users u ON u.id=p.cashier_id LEFT JOIN payment_collectors pc ON pc.payment_id=p.id WHERE service_id=? ORDER BY p.created').all(s.id).map(p=>({...require('./payment-tenders').withTenders(db,p),items:p.id.startsWith('legacy-')?items.filter(i=>!i.cancelled_at).map(i=>({name:i.name,qty:i.qty,price:i.price})):db.prepare('SELECT pi.qty,pi.price,i.name FROM payment_items pi JOIN order_items i ON i.id=pi.item_id WHERE payment_id=? ORDER BY i.rowid').all(p.id)}))}};
 }
 const from=q.get('from'),to=q.get('to');if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||from>to)error('Selecciona un rango válido de fechas');
 const page=Math.max(0,Math.min(100000,Number(q.get('page'))||0))|0;
 if(q.get('kind')==='shifts'){
  if(!cashier)error('Acceso restringido',403);const where="date(opened,'-5 hours') BETWEEN ? AND ?";
  return {rows:db.prepare(`SELECT * FROM cash_shifts WHERE ${where} ORDER BY id DESC LIMIT 30 OFFSET ?`).all(from,to,page*30),count:db.prepare(`SELECT count(*) AS n FROM cash_shifts WHERE ${where}`).get(from,to).n};
 }
 const conditions=['s.merged_into IS NULL',"date(s.opened,'-5 hours') BETWEEN ? AND ?"],args=[from,to];
 if(!cashier){conditions.push('(EXISTS(SELECT 1 FROM orders o WHERE o.service_id=s.id AND o.waiter_id=?) OR EXISTS(SELECT 1 FROM payment_ledger p WHERE p.service_id=s.id AND p.cashier_id=?))');args.push(user.id,user.id);}
 if(q.get('table')){conditions.push('s.table_name LIKE ?');args.push('%'+q.get('table').slice(0,80)+'%');}
 if(['closed','occupied','billing'].includes(q.get('status'))){conditions.push('s.status=?');args.push(q.get('status'));}
 const where=conditions.join(' AND ');
 return {rows:db.prepare(`SELECT s.*,u.name AS waiter,(SELECT COALESCE(sum(CASE WHEN i.cancelled_at IS NULL THEN i.qty*i.price ELSE 0 END),0) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=s.id) AS total,p.method FROM services s JOIN users u ON u.id=s.waiter_id LEFT JOIN (SELECT service_id,group_concat(DISTINCT method) AS method FROM payment_ledger GROUP BY service_id) p ON p.service_id=s.id WHERE ${where} ORDER BY s.opened DESC,s.id LIMIT 30 OFFSET ?`).all(...args,page*30),count:db.prepare(`SELECT count(*) AS n FROM services s WHERE ${where}`).get(...args).n};
}
module.exports={initRegister,registerState,applyRegister,history};
