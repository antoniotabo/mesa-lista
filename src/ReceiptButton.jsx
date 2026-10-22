import React,{useState} from 'react';
export function ReceiptButton({paymentId}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){setBusy(true);setMessage('');try{const response=await fetch('/api/receipt?payment='+encodeURIComponent(paymentId));if(!response.ok){const data=await response.json();throw Error(data.error||'No se pudo generar la nota de venta')}const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Nota-de-venta-'+paymentId.slice(0,8)+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('PDF descargado. Puedes adjuntarlo al mensaje para el cliente.')}catch(e){setMessage(e.message||'No se pudo descargar. Revisa la conexión.')}finally{setBusy(false)}}
 return <div className="receipt-action"><button className="receipt-button" disabled={busy} onClick={download}>{busy?'Generando PDF…':'↓ Nota de venta PDF'}</button>{message&&<small role="status">{message}</small>}</div>;
}
