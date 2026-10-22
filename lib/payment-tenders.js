const {error,integer}=require('./catalog');
const methods=['Efectivo','Yape / Plin','Tarjeta'];
function initTenders(db){db.exec(`CREATE TABLE IF NOT EXISTS payment_tenders(payment_id TEXT NOT NULL REFERENCES partial_payments(id),method TEXT NOT NULL CHECK(method IN ('Efectivo','Yape / Plin','Tarjeta')),amount INTEGER NOT NULL CHECK(amount>=0),received INTEGER NOT NULL CHECK(received>=amount),PRIMARY KEY(payment_id,method));
 CREATE VIEW IF NOT EXISTS payment_tender_ledger AS SELECT p.id AS payment_id,p.service_id,p.shift_id,p.created,t.method,t.amount,t.received FROM partial_payments p JOIN payment_tenders t ON t.payment_id=p.id UNION ALL SELECT p.id,p.service_id,p.shift_id,p.created,p.method,p.total,p.received FROM payment_ledger p WHERE NOT EXISTS(SELECT 1 FROM payment_tenders t WHERE t.payment_id=p.id);`);}
function textMatches(text,amount){if(text===undefined)return;const m=typeof text==='string'&&text.match(/^(\d{1,7})(?:[.,](\d{1,2}))?$/);if(!m||Number(m[1])*100+Number((m[2]||'').padEnd(2,'0'))!==amount)error('El efectivo recibido no coincide con lo escrito. Revisa el importe.',409);}
function validateTenders(a,total){
 if(![...methods,'Mixto'].includes(a.method))error('Medio de pago inválido');
 const mixed=a.method==='Mixto',raw=mixed?a.tenders:[{method:a.method,amount:total,received:a.received,receivedInput:a.receivedInput}];
 if(!Array.isArray(raw)||raw.length<(mixed?2:1)||raw.length>3)error('El pago mixto necesita al menos dos medios de pago');
 const seen=new Set(),tenders=raw.map(t=>{if(!t||!methods.includes(t.method)||seen.has(t.method))error('Revisa los medios de pago del cobro mixto');seen.add(t.method);const amount=integer(t.amount,mixed?1:0,100000000),received=t.method==='Efectivo'?integer(t.received,amount,100000000):amount;if(t.method==='Efectivo')textMatches(t.receivedInput,received);return {method:t.method,amount,received}});
 if(tenders.reduce((n,t)=>n+t.amount,0)!==total)error('La suma de los medios de pago debe coincidir exactamente con el importe a cobrar');
 const change=tenders.filter(t=>t.method==='Efectivo').reduce((n,t)=>n+t.received-t.amount,0);
 return {tenders,received:total+change};
}
function withTenders(db,p){return {...require('./payment-adjustments').details(db,p),tenders:db.prepare('SELECT method,amount,received FROM payment_tender_ledger WHERE payment_id=? ORDER BY method').all(p.id)};}
module.exports={initTenders,validateTenders,withTenders};
