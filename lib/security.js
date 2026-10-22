const crypto=require('node:crypto');
function hash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex')}
function verify(password,stored){if(!stored)return false;const [salt,key]=stored.split(':');const found=crypto.scryptSync(password,salt,64);return crypto.timingSafeEqual(found,Buffer.from(key,'hex'))}
const tokenHash=t=>crypto.createHash('sha256').update(t).digest('hex');
module.exports={hash,verify,tokenHash};
