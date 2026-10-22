// ESC/POS: ESC t selects a character page; GS V 66 0 feeds and cuts.
// Epson reference: https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/
const cp850='ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
const safe=s=>String(s??'').normalize('NFC').replace(/[\x00-\x1f\x7f-\x9f]/g,' ').replace(/\s+/g,' ').trim();
function encode(text,encoding='cp850'){
 const out=[];for(const c of text){const n=c.codePointAt(0);if(c==='\n'){out.push(10);continue}if(n>=32&&n<127){out.push(n);continue}if(encoding==='cp850'&&cp850.includes(c)){out.push(128+cp850.indexOf(c));continue}if(encoding==='cp1252'&&n>=160&&n<=255){out.push(n);continue}const fallback=c.normalize('NFD').replace(/[\u0300-\u036f]/g,'');out.push(fallback.length===1&&fallback.charCodeAt(0)>=32&&fallback.charCodeAt(0)<127?fallback.charCodeAt(0):63)}return Buffer.from(out);
}
function wrap(text,cols){const words=safe(text).split(' '),lines=[];let line='';for(let word of words){while(word.length>cols){if(line){lines.push(line);line=''}lines.push(word.slice(0,cols));word=word.slice(cols)}if(line&&line.length+1+word.length>cols){lines.push(line);line=''}line+=(line?' ':'')+word}if(line)lines.push(line);return lines}
function ticketText(payload,cols=48,job={}){
 const lines=[],add=t=>lines.push(...wrap(t,cols)),center=t=>lines.push(...wrap(t,cols).map(line=>' '.repeat(Math.max(0,Math.floor((cols-line.length)/2)))+line)),rule=()=>lines.push('-'.repeat(cols));
 const amountLine=(label,value)=>{const amount='S/ '+(value/100).toFixed(2);if(label.length+amount.length+1<=cols)lines.push(label+' '.repeat(cols-label.length-amount.length)+amount);else{add(label);lines.push(amount.padStart(cols,' '))}};
 const b=payload.business||{};center(b.name||'Mesa Lista');
 if(['bill','sale','refund','payment-correction'].includes(payload.kind)){if(b.ruc)center('RUC: '+b.ruc);if(b.address)center(b.address);if(b.phone)center('Teléfono: '+b.phone)}
 center(payload.kind==='refund'?'DEVOLUCIÓN DE PAGO':payload.kind==='payment-correction'?'CORRECCIÓN DE PAGO':payload.kind==='transfer'?'*** CAMBIO DE MESA ***':payload.kind==='cancellation'?'*** ANULACIÓN ***':payload.kind==='sale'?'NOTA DE VENTA':payload.kind==='bill'?'PRECUENTA':payload.kind==='test'?'PRUEBA DE IMPRESORA':'COMANDA');
 if(job.copy_of)add(`*** REIMPRESIÓN DEL TICKET #${job.copy_of} ***`);
 if(job.id)add('Ticket #'+job.id);if(payload.reference)add((payload.kind==='sale'?'Venta: ':'Pedido: ')+payload.reference);rule();
 if(payload.table)add('Mesa: '+payload.table);if(payload.space)add('Espacio: '+payload.space);if(payload.waiter)add((['sale','refund','payment-correction'].includes(payload.kind)?'Registrado por: ':'Atiende: ')+payload.waiter);if(payload.station)add('Área: '+payload.station);
 add(new Date(payload.created).toLocaleString('es-PE',{timeZone:'America/Lima'}));rule();
 if(payload.kind==='transfer')add('NO PREPARAR: PEDIDOS YA REGISTRADOS');
 for(const i of payload.items||[]){add(`${i.qty} x ${i.name}`);if(i.note)add('  NOTA: '+i.note);if(['bill','sale'].includes(payload.kind)){const amount='S/ '+(i.price*i.qty/100).toFixed(2);lines.push(amount.padStart(cols,' '))}}
 if(payload.note){rule();add('NOTA GENERAL: '+payload.note)}
 if(payload.kind==='transfer'){add('SOLO CAMBIO DE UBICACIÓN');add('NO VOLVER A PREPARAR ESTOS PRODUCTOS');}
 if(payload.kind==='cancellation'){add('NO PREPARAR / DETENER ESTOS PRODUCTOS');add('Motivo y responsable registrados en el sistema.');}
 if(payload.kind==='test'){add('Español: á é í ó ú ü ñ Ñ ¿ ¡');add('0123456789 - S/ 25.50');add('Comprueba acentos, márgenes y corte.');}
 rule();if(['bill','sale'].includes(payload.kind)){amountLine(payload.kind==='refund'?'TOTAL DEVUELTO:':payload.kind==='payment-correction'?'IMPORTE CORREGIDO:':'TOTAL:',['refund','payment-correction'].includes(payload.kind)?payload.total:(payload.items||[]).reduce((n,i)=>n+i.price*i.qty,0));if(payload.kind==='refund')for(const t of payload.tenders||[])amountLine('Devuelto '+t.method+':',t.amount);if(payload.kind==='sale'){if(payload.payer)add('Cliente / referencia: '+payload.payer);add('Pago: '+payload.method);if(payload.method==='Mixto')for(const t of payload.tenders||[])amountLine(t.method+':',t.amount);if(payload.method==='Mixto'){const cash=(payload.tenders||[]).find(t=>t.method==='Efectivo');if(cash)amountLine('Efectivo recibido:',cash.received)}else amountLine('Recibido:',payload.received);amountLine('Vuelto:',payload.received-payload.total)}if(['bill','sale'].includes(payload.kind)&&b.footer)for(const line of b.footer.split(/\r?\n/))center(line);}else if(payload.kind==='order')add('Preparar solo los productos de esta comanda.');
 return lines.join('\n')+'\n';
}
// Raster format: https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html
function logoBytes(payload){const b=payload.business,r=b?.raster;if(!['bill','sale'].includes(payload.kind)||!r||b.printLogo===false)return Buffer.alloc(0);const data=Buffer.from(r.data,'base64'),width=r.width/8;if(!Number.isInteger(width)||width<1||width>32||r.height<1||r.height>128||data.length!==width*r.height)return Buffer.alloc(0);return Buffer.concat([Buffer.from([27,97,1,29,118,48,0,width,0,r.height,0]),data,Buffer.from([10,27,97,0])])}
function renderTicket(payload,printer,job={}){const text=ticketText(payload,printer.columns,job);return {text,bytes:Buffer.concat([Buffer.from([27,64,27,77,0,27,82,0,27,116,printer.code_page,27,97,0]),logoBytes(payload),encode(text,printer.encoding),Buffer.from([10,10,10]),printer.cut?Buffer.from([29,86,66,0]):Buffer.alloc(0)])}}
module.exports={safe,encode,wrap,ticketText,renderTicket};
