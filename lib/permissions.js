function initPermissions(db){const columns=db.prepare('PRAGMA table_info(users)').all();for(const [name,value] of [['can_collect',0],['can_prepare',0],['can_deliver',1]])if(!columns.some(c=>c.name===name))db.exec(`ALTER TABLE users ADD COLUMN ${name} INTEGER NOT NULL DEFAULT ${value} CHECK(${name} IN (0,1))`);}
const manager=u=>['admin','cashier'].includes(u.role);
const canCollect=u=>manager(u)||(u.role==='waiter'&&!!u.can_collect);
const canPrepare=u=>manager(u)||(u.role==='waiter'&&!!u.can_prepare);
const canDeliver=u=>manager(u)||(u.role==='waiter'&&!!u.can_deliver);
function publicUser(u){return {id:u.id,name:u.name,role:u.role,can_collect:canCollect(u),can_prepare:canPrepare(u),can_deliver:canDeliver(u)};}
module.exports={initPermissions,canCollect,canPrepare,canDeliver,publicUser};
