const {error}=require('./catalog');
const {paidExpression}=require('./partial-payments');
const datasets={
 daily:{title:'Resumen diario',columns:[['day','Fecha'],['consumed','Consumo vigente','money'],['collected','Cobrado bruto','money'],['refunded','Devuelto','money'],['net','Cobrado neto','money'],['payments','Cantidad de cobros']]},
 methods:{title:'Medios de pago',columns:[['method','Medio de pago'],['payments','Participaciones de cobros'],['total','Importe neto','money']]},
 products:{title:'Productos cobrados',columns:[['name','Producto'],['station','Área'],['qty','Unidades netas'],['total','Importe neto','money']]},
 payments:{title:'Detalle de cobros',columns:[['created','Fecha y hora','date'],['table_name','Mesa actual'],['cashier','Cobrado por'],['collector_login','Usuario'],['collector_role','Rol al cobrar'],['paid_table','Mesa al cobrar'],['payer','Persona o referencia'],['method','Medio original'],['cash_amount','Efectivo vigente','money'],['digital_amount','Yape/Plin vigente','money'],['card_amount','Tarjeta vigente','money'],['total','Cobrado bruto','money'],['refunded','Devuelto','money'],['received','Recibido total','money'],['change','Vuelto','money'],['shift_id','Turno']]},
 consumption:{title:'Consumo registrado',columns:[['created','Fecha del pedido','date'],['table_name','Mesa actual'],['origin_table','Mesa de origen'],['waiter','Mozo'],['name','Producto'],['qty','Cantidad'],['total','Consumo vigente','money']]},
 cancellations:{title:'Anulaciones',columns:[['cancelled_at','Fecha de anulación','date'],['table_name','Mesa actual'],['name','Producto'],['qty','Cantidad'],['total','Importe anulado','money'],['author','Responsable'],['cancel_reason','Motivo']]},
 pending:{title:'Pendientes actuales',columns:[['table_name','Mesa'],['space_name','Espacio'],['opened','Apertura','date'],['waiter','Responsable'],['total','Consumo vigente','money'],['paid','Pagado','money'],['balance','Saldo pendiente','money']]}
};
function range(q){
 const from=q.get('from')||'',to=q.get('to')||'';
 const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(from)||!valid(to)||from>to)error('Selecciona fechas válidas, desde y hasta');
 if((Date.parse(to)-Date.parse(from))/86400000>365)error('Consulta un máximo de 366 días por reporte');
 return {from,to,start:from+'T05:00:00.000Z',end:new Date(Date.parse(to+'T05:00:00.000Z')+86400000).toISOString()};
}
function report(db,user,q){
 if(!['admin','cashier'].includes(user.role))error('Solo caja o administración puede consultar reportes',403);
 const dates=range(q),kind=q.get('kind')||'daily',config=Object.hasOwn(datasets,kind)?datasets[kind]:null;if(!config)error('Reporte desconocido');
 const args=[dates.start,dates.end],period=field=>`${field}>=? AND ${field}<?`;
 const consumed=db.prepare(`SELECT COALESCE(sum(i.qty*i.price),0) AS total FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.cancelled_at IS NULL AND ${period('o.created')}`).get(...args).total;
 const collected=db.prepare(`SELECT COALESCE(sum(total),0) AS total,count(*) AS count FROM payment_ledger WHERE ${period('created')}`).get(...args);
 const refunded=db.prepare(`SELECT COALESCE(sum(total),0) AS total FROM payment_refunds WHERE ${period('created')}`).get(...args).total;
 const cancelled=db.prepare(`SELECT COALESCE(sum(qty*price),0) AS total,count(*) AS count FROM cancellation_events WHERE ${period('created')}`).get(...args);
 const pending=db.prepare(`SELECT s.id,s.table_name,s.space_name,s.opened,u.name AS waiter,COALESCE(sum(CASE WHEN i.cancelled_at IS NULL THEN i.qty*i.price ELSE 0 END),0) AS total,COALESCE(sum(CASE WHEN i.cancelled_at IS NULL THEN ${paidExpression}*i.price ELSE 0 END),0) AS paid FROM services s JOIN users u ON u.id=s.waiter_id LEFT JOIN orders o ON o.service_id=s.id LEFT JOIN order_items i ON i.order_id=o.id WHERE s.status!='closed' GROUP BY s.id ORDER BY s.opened`).all().map(s=>({...s,balance:s.total-s.paid}));
 let rows;
 if(kind==='daily'){
  const days=new Map();const ensure=day=>{if(!days.has(day))days.set(day,{day,consumed:0,collected:0,refunded:0,net:0,payments:0});return days.get(day)};
  for(const r of db.prepare(`SELECT date(o.created,'-5 hours') AS day,sum(i.qty*i.price) AS total FROM orders o JOIN order_items i ON i.order_id=o.id WHERE i.cancelled_at IS NULL AND ${period('o.created')} GROUP BY day`).all(...args))ensure(r.day).consumed=r.total;
  for(const r of db.prepare(`SELECT date(created,'-5 hours') AS day,sum(total) AS total,count(*) AS count FROM payment_ledger WHERE ${period('created')} GROUP BY day`).all(...args)){const d=ensure(r.day);d.collected=r.total;d.payments=r.count}
  for(const r of db.prepare(`SELECT date(created,'-5 hours') AS day,sum(total) AS total FROM payment_refunds WHERE ${period('created')} GROUP BY day`).all(...args))ensure(r.day).refunded=r.total;
  for(const d of days.values())d.net=d.collected-d.refunded;
  rows=[...days.values()].sort((a,b)=>b.day.localeCompare(a.day));
 }else if(kind==='methods')rows=db.prepare(`SELECT method,sum(CASE WHEN kind='payment' THEN 1 ELSE 0 END) AS payments,sum(amount) AS total FROM tender_movements WHERE ${period('created')} GROUP BY method ORDER BY total DESC`).all(...args);
 else if(kind==='products')rows=db.prepare(`SELECT product_id,name,station,sum(qty) AS qty,sum(amount) AS total FROM (
 SELECT i.product_id,i.name,i.station,pi.qty,pi.qty*pi.price AS amount FROM payment_items pi JOIN partial_payments p ON p.id=pi.payment_id JOIN order_items i ON i.id=pi.item_id WHERE ${period('p.created')}
 UNION ALL SELECT i.product_id,i.name,i.station,i.qty,i.qty*i.price AS amount FROM payments p JOIN orders o ON o.service_id=p.service_id JOIN order_items i ON i.order_id=o.id WHERE i.cancelled_at IS NULL AND ${period('p.created')}
 UNION ALL SELECT i.product_id,ri.name,ri.station,-ri.qty,-ri.qty*ri.price AS amount FROM refund_items ri JOIN payment_refunds r ON r.id=ri.refund_id JOIN order_items i ON i.id=ri.item_id WHERE ${period('r.created')}
 ) GROUP BY product_id,name,station ORDER BY total DESC,name`).all(...args,...args,...args);
 else if(kind==='payments')rows=db.prepare(`SELECT p.*,s.table_name,COALESCE(pc.name,u.name) AS cashier,pc.login AS collector_login,CASE pc.role WHEN 'waiter' THEN 'Mozo' WHEN 'cashier' THEN 'Caja' WHEN 'admin' THEN 'Administración' ELSE '' END AS collector_role,pc.table_name AS paid_table,pc.space_name AS paid_space,p.received-p.total AS change,COALESCE((SELECT sum(r.total) FROM payment_refunds r WHERE r.payment_id=p.id),0) AS refunded,COALESCE((SELECT sum(t.amount) FROM tender_movements t WHERE t.payment_id=p.id AND t.kind!='refund' AND t.method='Efectivo'),0) AS cash_amount,COALESCE((SELECT sum(t.amount) FROM tender_movements t WHERE t.payment_id=p.id AND t.kind!='refund' AND t.method='Yape / Plin'),0) AS digital_amount,COALESCE((SELECT sum(t.amount) FROM tender_movements t WHERE t.payment_id=p.id AND t.kind!='refund' AND t.method='Tarjeta'),0) AS card_amount FROM payment_ledger p JOIN services s ON s.id=p.service_id LEFT JOIN users u ON u.id=p.cashier_id LEFT JOIN payment_collectors pc ON pc.payment_id=p.id WHERE ${period('p.created')} ORDER BY p.created DESC,p.id`).all(...args);
 else if(kind==='consumption')rows=db.prepare(`SELECT i.name,i.qty,i.qty*i.price AS total,o.created,o.origin_table,s.table_name,u.name AS waiter FROM order_items i JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=o.service_id JOIN users u ON u.id=o.waiter_id WHERE i.cancelled_at IS NULL AND ${period('o.created')} ORDER BY o.created DESC,i.id`).all(...args);
 else if(kind==='cancellations')rows=db.prepare(`SELECT e.*,e.created AS cancelled_at,e.reason AS cancel_reason,e.qty*e.price AS total,s.table_name,u.name AS author FROM cancellation_events e JOIN order_items i ON i.id=e.item_id JOIN orders o ON o.id=i.order_id JOIN services s ON s.id=o.service_id LEFT JOIN users u ON u.id=e.user_id WHERE ${period('e.created')} ORDER BY e.created DESC,e.id`).all(...args);
 else rows=pending;
 return {kind,title:config.title,columns:config.columns,from:dates.from,to:dates.to,generated:new Date().toISOString(),summary:{consumed,collected:collected.total,refunded,net:collected.total-refunded,payments:collected.count,cancelled:cancelled.total,pending:pending.reduce((n,s)=>n+s.balance,0),openTables:pending.length},rows};
}
function csv(data){
 const date=value=>value?new Date(value).toLocaleString('es-PE',{timeZone:'America/Lima'}):'';
 const cell=(value,type)=>{
  let s=type==='money'?(Number(value||0)/100).toFixed(2).replace('.',','):type==='date'?date(value):String(value??'');
  if(type!=='money'&&typeof value!=='number'&&/^[\s\x00-\x1f]*[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 return '\uFEFF'+[data.columns.map(c=>cell(c[1])).join(';'),...data.rows.map(r=>data.columns.map(c=>cell(r[c[0]],c[2])).join(';'))].join('\r\n')+'\r\n';
}
module.exports={report,csv};
