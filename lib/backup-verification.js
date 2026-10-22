const {DatabaseSync}=require('node:sqlite'),{createHash}=require('node:crypto'),{createReadStream,constants}=require('node:fs'),fs=require('node:fs/promises'),path=require('node:path');
function verifyDatabase(file){const db=new DatabaseSync(file,{readOnly:true});try{const result=db.prepare('PRAGMA quick_check').all();if(result.length!==1||Object.values(result[0])[0]!=='ok')throw Error('La copia no superó la comprobación de integridad SQLite')}finally{db.close()}}
async function digest(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex')}
async function copyVerified(source,folder,name){
 await fs.mkdir(folder,{recursive:true});const destination=path.join(folder,name);
 if(path.resolve(source)===path.resolve(destination))throw Error('La copia adicional debe guardarse en una carpeta distinta');
 await fs.copyFile(source,destination,constants.COPYFILE_EXCL);
 if(await digest(source)!==await digest(destination))throw Error('La copia adicional no coincide con la copia original');
 return destination;
}
module.exports={verifyDatabase,copyVerified};
