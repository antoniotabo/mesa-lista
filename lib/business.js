const {error,name}=require('./catalog');
const defaults={name:'Mesa Lista',ruc:'',address:'',phone:'',footer:'Gracias por tu visita. ¡Te esperamos pronto!',logo:'',raster:null,printLogo:true,version:0};
function business(db){const row=db.prepare("SELECT value FROM meta WHERE key='business'").get();return row?{...defaults,...JSON.parse(row.value)}:{...defaults};}
function branding(db){const b=business(db);return {name:b.name,logo:b.logo};}
function saveBusiness(db,user,a){
 if(user.role!=='admin')error('Solo administración configura el restaurante',403);
 const current=business(db);if(a.version!==current.version)error('Los datos cambiaron. Vuelve a abrir la configuración.',409);
 const ruc=String(a.ruc||'').trim();if(ruc&&!/^\d{11}$/.test(ruc))error('El RUC debe tener 11 dígitos');
 const text=(v,max)=>{if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b-\x1f\x7f]/.test(v))error('Revisa los textos del restaurante');return v.trim()};
 const logo=String(a.logo||'');if(logo.length>60000||(logo&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)))error('El logo es demasiado grande o no tiene un formato válido');
 let raster=null;
 if(logo){const r=a.raster;if(!r||!Number.isInteger(r.width)||r.width<8||r.width>256||r.width%8||!Number.isInteger(r.height)||r.height<1||r.height>128||typeof r.data!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)||Buffer.from(r.data,'base64').length!==r.width/8*r.height)error('Vuelve a seleccionar el logo para preparar su impresión');raster={width:r.width,height:r.height,data:r.data};}
 if(typeof a.printLogo!=='boolean')error('Revisa la configuración del logo');
 const value={printLogo:a.printLogo,name:name(a.name),ruc,address:text(a.address,160),phone:text(a.phone,80),footer:text(a.footer,180),logo,raster,version:current.version+1};
 db.prepare("INSERT INTO meta VALUES('business',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));return {message:'Datos del restaurante y presentación de tickets guardados.'};
}
module.exports={business,branding,saveBusiness};
