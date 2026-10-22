const crypto=require('node:crypto');
const {error,name,integer}=require('./catalog');
const {queueOrder}=require('./printing');
const uid=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
function snapshot(db,user){
 const services=db.prepare("SELECT s.*,u.name AS waiter FROM services s JOIN users u ON u.id=s.waiter_id WHERE s.status!='closed' ORDER BY s.opened").all();
 const items=db.prepare("SELECT i.*,(COALESCE((SELECT sum(pi.qty) FROM payment_items pi WHERE pi.item_id=i.id),0)-COALESCE((SELECT sum(ri.qty) FROM refund_items ri WHERE ri.item_id=i.id),0)) AS paid_qty,o.origin_table,o.origin_space,o.service_id,o.waiter_id,o.note AS order_note,o.created,u.name AS waiter FROM order_items i JOIN orders o ON i.order_id=o.id JOIN services s ON s.id=o.service_id JOIN users u ON u.id=o.waiter_id WHERE s.status!='closed'").all();
 const active=services.map(s=>({...s,items:items.filter(i=>i.service_id===s.id)}));
 const history=db.prepare(`SELECT o.id,o.created,o.note,o.waiter_id,u.name AS waiter,s.table_name,s.space_name,s.status,sum(CASE WHEN i.cancelled_at IS NULL THEN i.price*i.qty ELSE 0 END) AS total FROM orders o JOIN users u ON u.id=o.waiter_id JOIN services s ON s.id=o.service_id JOIN order_items i ON i.order_id=o.id ${user.role==='waiter'?'WHERE o.waiter_id=?':''} GROUP BY o.id ORDER BY o.created DESC LIMIT 100`).all(...(user.role==='waiter'?[user.id]:[]));
 const preparation=db.prepare("SELECT i.*,o.id AS order_id,o.service_id,o.created,o.note AS order_note,u.name AS waiter,s.table_name,s.space_name,s.status AS account_status FROM order_items i JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=o.service_id JOIN users u ON u.id=o.waiter_id WHERE i.cancelled_at IS NULL AND i.status!='Entregado' ORDER BY o.created,i.rowid").all();
 return {preparation,menuEntries:db.prepare('SELECT * FROM menu_entries WHERE active=1 ORDER BY id').all(),business:require('./business').business(db),user:require('./permissions').publicUser(user),spaces:db.prepare('SELECT * FROM spaces WHERE active=1 ORDER BY id').all(),tables:db.prepare('SELECT * FROM dining_tables WHERE active=1 ORDER BY id').all(),categories:db.prepare('SELECT * FROM categories ORDER BY id').all(),stations:db.prepare('SELECT * FROM stations ORDER BY id').all(),products:db.prepare('SELECT p.*,c.name AS category,s.name AS station FROM products p JOIN categories c ON c.id=p.category_id JOIN stations s ON s.id=p.station_id WHERE p.active=1 ORDER BY p.id').all(),services:active,history,users:user.role==='admin'?db.prepare('SELECT id,name,login,role,active,version,can_collect,can_prepare,can_deliver FROM users WHERE active=1 ORDER BY id').all():[],payments:user.role!=='waiter'?db.prepare('SELECT p.*,s.table_name,COALESCE(pc.name,u.name) AS cashier,pc.login AS collector_login,pc.role AS collector_role,pc.table_name AS paid_table FROM payment_ledger p JOIN services s ON s.id=p.service_id LEFT JOIN users u ON u.id=p.cashier_id LEFT JOIN payment_collectors pc ON pc.payment_id=p.id ORDER BY p.created DESC LIMIT 100').all().map(p=>require('./payment-tenders').withTenders(db,p)):[]};
}
function changeService(db,user,a){
 if(['table.move','table.merge'].includes(a.type))return require('./table-transfers').transfer(db,user,a);
 if(a.type==='item.cancel')return require('./cancellations').cancelItem(db,user,a);
 if(a.type==='send'){
  const table=db.prepare('SELECT t.*,s.name AS space_name FROM dining_tables t JOIN spaces s ON s.id=t.space_id WHERE t.id=? AND t.active=1 AND s.active=1').get(a.table);if(!table)error('Mesa no disponible');
  if(!Array.isArray(a.items)||a.items.length<1||a.items.length>100)error('Agrega de 1 a 100 productos');
  const products=a.items.map(i=>{const p=db.prepare('SELECT p.*,s.name AS station,c.name AS category FROM products p JOIN stations s ON s.id=p.station_id JOIN categories c ON c.id=p.category_id WHERE p.id=? AND p.active=1 AND p.available=1').get(i.id);if(!p)error('Un producto ya no está disponible. Revisa tu comanda.',409);if(i.price!==p.price)error('El precio de un producto cambió. Actualiza la carta.',409);return {...p,name:require('./menu-entries').entryForOrder(db,p,i),qty:integer(i.qty,1,99),note:String(i.note||'').slice(0,200)}});
  let s=db.prepare("SELECT * FROM services WHERE table_id=? AND status!='closed'").get(a.table);if((s?.id||null)!==a.expectedService)error('La atención de esta mesa cambió. Revisa la mesa antes de enviar.',409);if(s?.status==='billing')error('Esta mesa está por cobrar. Caja debe reabrirla antes de añadir pedidos.',409);
  if(!s){s={id:uid()};db.prepare('INSERT INTO services(id,table_id,waiter_id,table_name,space_name,status,opened) VALUES(?,?,?,?,?,?,?)').run(s.id,table.id,user.id,table.name,table.space_name,'occupied',now())}
  const order=uid();db.prepare('INSERT INTO orders(id,service_id,waiter_id,note,created,origin_table,origin_space) VALUES(?,?,?,?,?,?,?)').run(order,s.id,user.id,String(a.note||'').slice(0,300),now(),table.name,table.space_name);
  for(const p of products)db.prepare('INSERT INTO order_items(id,order_id,product_id,name,price,qty,station,note,original_qty) VALUES(?,?,?,?,?,?,?,?,?)').run(uid(),order,p.id,p.name,p.price,p.qty,p.station,p.note,p.qty);
  const jobs=queueOrder(db,order,user);
  const blocked=jobs.some(id=>db.prepare('SELECT status FROM print_jobs WHERE id=?').get(id).status==='blocked');
  return {message:blocked?'Comanda guardada. Hay áreas sin impresora: avisa a caja para resolver sus tickets.':'Comanda guardada en la mesa y visible en preparación. Se imprime solo en las áreas habilitadas.',service:s.id,jobs};
 }
 if(a.type==='bill'||a.type==='reopen'){
  const s=db.prepare("SELECT * FROM services WHERE id=? AND status!='closed'").get(a.id);if(!s)error('La cuenta ya no está abierta',409);
  if(a.type==='reopen'&&user.role==='waiter')error('Solo caja o administración puede reabrir la cuenta',403);
  db.prepare('UPDATE services SET status=? WHERE id=?').run(a.type==='bill'?'billing':'occupied',s.id);return {message:a.type==='bill'?'Precuenta lista':'Mesa reabierta'};
 }
 if(a.type==='status.batch'){
  if(!Array.isArray(a.items)||!a.items.length||a.items.length>1000)error('Selecciona los productos de la mesa');
  const permissions=require('./permissions'),next={Pendiente:'Preparando',Preparando:'Listo',Listo:'Entregado'};
  if(a.status==='Entregado'?!permissions.canDeliver(user):!permissions.canPrepare(user))error('No tienes permiso para cambiar esta etapa',403);
  const seen=new Set();
  for(const row of a.items){if(seen.has(row.id))error('Producto repetido');seen.add(row.id);const item=db.prepare('SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=? AND o.service_id=?').get(row.id,a.service);if(!item||item.cancelled_at||item.status!==row.status||next[item.status]!==a.status)error('Un producto cambió. Revisa los pendientes de la mesa.',409)}
  for(const row of a.items)db.prepare('UPDATE order_items SET status=? WHERE id=?').run(a.status,row.id);
  return {message:a.status==='Entregado'?'Entrega de la mesa registrada.':'Estado de los productos de la mesa actualizado.'};
 }
 if(a.type==='status'){
  const i=db.prepare("SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=o.service_id WHERE i.id=?").get(a.id);if(!i||i.cancelled_at)error('Ítem no disponible');
  const permissions=require('./permissions');if(a.status==='Entregado'?!permissions.canDeliver(user):!permissions.canPrepare(user))error('No tienes permiso para cambiar esta etapa del pedido',403);
  const next={Pendiente:'Preparando',Preparando:'Listo',Listo:'Entregado'};if(next[i.status]!==a.status)error('El estado ya cambió',409);db.prepare('UPDATE order_items SET status=? WHERE id=?').run(a.status,i.id);return {message:a.status==='Entregado'?'Entrega registrada. El estado del cobro se conserva.':'Preparación actualizada. El estado del cobro se conserva.'};
 }
 if(a.type==='pay')return require('./partial-payments').pay(db,user,a);

 error('Acción desconocida');
}
module.exports={snapshot,changeService};
