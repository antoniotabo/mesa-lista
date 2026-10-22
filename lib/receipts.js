const {ticketText}=require('./escpos');
const {business}=require('./business');
const {error}=require('./catalog');
function saleReceipt(db,user,paymentId){
 const payment=db.prepare('SELECT * FROM payment_ledger WHERE id=?').get(paymentId);
 if(!payment)error('Cobro no encontrado',404);
 if(user.role==='waiter'&&payment.cashier_id!==user.id)error('Solo puedes descargar tus propios cobros',403);
 const job=db.prepare("SELECT * FROM print_jobs WHERE kind='sale' AND json_extract(payload,'$.payment_id')=? AND copy_of IS NULL ORDER BY id LIMIT 1").get(paymentId);
 if(job)return {payload:JSON.parse(job.payload),job};
 const service=db.prepare('SELECT * FROM services WHERE id=?').get(payment.service_id);
 const collector=db.prepare('SELECT * FROM payment_collectors WHERE payment_id=?').get(paymentId);
 const items=paymentId.startsWith('legacy-')?db.prepare('SELECT i.name,i.qty,i.price FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.service_id=? AND i.cancelled_at IS NULL').all(payment.service_id):db.prepare('SELECT i.name,pi.qty,pi.price FROM payment_items pi JOIN order_items i ON i.id=pi.item_id WHERE pi.payment_id=?').all(paymentId);
 const tenders=require('./payment-tenders').withTenders(db,payment).tenders;
 return {job:{},payload:{...payment,kind:'sale',payment_id:paymentId,reference:paymentId.slice(0,8),business:business(db),table:collector?.table_name||service.table_name,space:collector?.space_name||service.space_name,waiter:collector?.name||'Responsable registrado',items,tenders}};
}
// PDF autocontenido: texto seleccionable, varias páginas y logo del ticket guardado.
function receiptPdf(payload,job={}){
 const objects=[null],add=value=>(objects.push(Buffer.isBuffer(value)?value:Buffer.from(value,'latin1')),objects.length-1);
 const catalog=add(''),pages=add(''),font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
 const stream=(dict,bytes)=>Buffer.concat([Buffer.from('<< '+dict+' /Length '+bytes.length+' >>\nstream\n','ascii'),bytes,Buffer.from('\nendstream','ascii')]);
 const b=payload.business||{},r=b.raster;let logo=null,logoWidth=0,logoHeight=0;
 if(b.printLogo!==false&&r&&r.width>0&&r.height>0){
  const jpeg=/^data:image\/jpeg;base64,(.+)$/.exec(b.logo||'');
  logo=jpeg?add(stream(`/Type /XObject /Subtype /Image /Width ${r.width} /Height ${r.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,Buffer.from(jpeg[1],'base64'))):add(stream(`/Type /XObject /Subtype /Image /Width ${r.width} /Height ${r.height} /ColorSpace /DeviceGray /BitsPerComponent 1 /Decode [1 0]`,Buffer.from(r.data,'base64')));
  logoWidth=Math.min(125,r.width);logoHeight=r.height*logoWidth/r.width;
 }
 const lines=ticketText(payload,42,job).split('\n'),pageIds=[],width=226.77,lineHeight=11,margin=16;
 const hex=s=>Buffer.from([...s].map(c=>c.charCodeAt(0)<=255?c:c==='−'?'-':'?').join(''),'latin1').toString('hex');
 while(lines.length){const first=pageIds.length===0,top=margin+(first&&logo?logoHeight+12:0),limit=Math.max(1,Math.floor((800-top-margin)/lineHeight)),chunk=lines.splice(0,limit),height=Math.max(180,top+chunk.length*lineHeight+margin);let commands='';
  if(first&&logo)commands+=`q ${logoWidth} 0 0 ${logoHeight} ${(width-logoWidth)/2} ${height-margin-logoHeight} cm /Logo Do Q\n`;
  commands+=`BT /F1 7.7 Tf ${lineHeight} TL ${margin} ${height-top-8} Td\n`;
  chunk.forEach((line,i)=>{if(i)commands+='T*\n';commands+=`<${hex(line)}> Tj\n`});commands+='ET';
  const content=add(stream('',Buffer.from(commands,'ascii')));
  pageIds.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${font} 0 R >> ${logo?`/XObject << /Logo ${logo} 0 R >>`:''} >> /Contents ${content} 0 R >>`));
 }
 objects[catalog]=Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`);objects[pages]=Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] >>`);
 const chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0];let size=chunks[0].length;
 for(let i=1;i<objects.length;i++){offsets.push(size);const part=Buffer.concat([Buffer.from(i+' 0 obj\n'),objects[i],Buffer.from('\nendobj\n')]);chunks.push(part);size+=part.length}
 chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${size}\n%%EOF\n`));
 return Buffer.concat(chunks);
}
module.exports={saleReceipt,receiptPdf};
