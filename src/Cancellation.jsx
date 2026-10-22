import React,{useState,useRef,useEffect} from 'react';
export function CancelItem({item,state,action,busy}){
 const [open,setOpen]=useState(false);
 if(item.cancelled_at)return <small className="form-error">Anulado · {item.cancel_reason}</small>;
 if((item.paid_qty||0)>=item.qty)return <small>Esta línea tiene unidades pagadas.</small>;
 if(state.user.role==='waiter')return null;
 return <><button className="text-danger" disabled={busy} onClick={()=>setOpen(true)}>Anular</button>{open&&<CancelDialog item={item} action={action} busy={busy} close={()=>setOpen(false)}/>}</>;
}
function CancelDialog({item,action,busy,close}){
 const ref=useRef(),[reason,setReason]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(null),[status]=useState(item.status),[snapshot]=useState({qty:item.qty,paid:item.paid_qty||0}),[qty,setQty]=useState(item.qty-(item.paid_qty||0));
 useEffect(()=>{ref.current.showModal()},[]);
 async function submit(e){e.preventDefault();setError('');const payload=pending||{type:'item.cancel',id:item.id,status,reason,qty:Number(qty),expected_qty:snapshot.qty,expected_paid:snapshot.paid,confirm:true,requestId:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')};setPending(payload);try{if(await action(payload))close()}catch(e){setError(e.message);if(!e.network)setPending(null)}}
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();if(!pending&&!busy)close()}}><div className="modal-heading"><h2>Anular producto</h2><button disabled={!!pending||busy} onClick={close} aria-label="Cerrar ventana">×</button></div><p><b>{item.qty} × {item.name}</b></p><p>Estado al abrir: {status}. Se descontará solamente la cantidad elegida. Las unidades ya pagadas se conservan. Se conservarán el producto, el motivo y el responsable.</p><p>Se generará un aviso para {item.station}. Si ya está preparado o entregado, coordina también con el personal. Una precuenta entregada anteriormente deberá reemplazarse.</p><form onSubmit={submit}><label>Cantidad a anular<input type="number" min="1" max={snapshot.qty-snapshot.paid} step="1" required disabled={!!pending||busy} value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Motivo<textarea required minLength="3" maxLength="300" disabled={!!pending||busy} value={reason} onChange={e=>setReason(e.target.value)}/></label><label className="checkbox"><input type="checkbox" required disabled={!!pending||busy}/>Confirmo anular {qty} unidades de esta línea.</label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}>{pending?'Reintentar la misma anulación':'Confirmar anulación'}</button></form></dialog>;
}
