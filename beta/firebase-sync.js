import {
  doc, getDoc, onSnapshot, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// Kuimba'e Style BETA. NO reutilizar estas colecciones en el sistema principal.
// La versión BETA funciona conectada a internet y únicamente para administradores.
const SHOP_ID='kuimbae-style';
let unsubscribe=[],writeListener=null,generation=0;
const queued=new Map();
let blocked=false;

const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const status=(message,error=false)=>{
  const el=document.getElementById('kuimbaeBetaCloudStatus');
  if(el){el.textContent='BETA · '+message;el.style.borderColor=error?'#e36c6c':'#83af92';}
};
function block(message){
  blocked=true;
  window.kuimbaeBetaSyncReady=false;
  document.documentElement.classList.add('ku-beta-sync-error');
  status(message,true);
  console.error('Kuimbae BETA Firestore:',message);
}
function changeSet(remote,before,after,id){
  // Se aplican diferencias por ID en una transacción: dos usuarios pueden
  // agregar registros distintos sin sustituir toda la lista del otro.
  if(Array.isArray(remote)&&Array.isArray(before)&&Array.isArray(after)){
    const m=new Map(remote.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
    const old=new Map(before.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
    const next=new Map(after.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
    if(old.size!==before.length||next.size!==after.length)
      throw Error('Registros sin identificador válido: '+id);
    if(old.size>0&&next.size===0&&['appointments','cash','products'].includes(id))
      throw Error('Borrado masivo bloqueado en BETA. Exportá un respaldo y revisá antes de vaciar la nube.');
    for(const oldId of old.keys())if(!next.has(oldId))m.delete(oldId);
    for(const [key,record] of next){
      if(!old.has(key)||!same(old.get(key),record)){
        if(id==='appointments'&&record.status!=='cancelado'){
          const start=minutes(record.time),end=start+(Number(record.duration)||60);
          for(const other of m.values()){
            if(other.id===record.id||other.status==='cancelado'||other.barberId!==record.barberId||other.date!==record.date)continue;
            const os=minutes(other.time),oe=os+(Number(other.duration)||60);
            if(start<oe&&os<end)throw Error('Turno ocupado en Firestore: '+record.date+' '+record.time+'. Actualizá la agenda.');
          }
        }
        m.set(key,record);
      }
    }
    return Array.from(m.values());
  }
  if(remote&&typeof remote==='object'&&!Array.isArray(remote)
    &&before&&typeof before==='object'&&!Array.isArray(before)
    &&after&&typeof after==='object'&&!Array.isArray(after)){
    const result={...remote};
    for(const key of Object.keys(before))if(!(key in after))delete result[key];
    for(const [key,value] of Object.entries(after))
      if(!(key in before)||!same(before[key],value))result[key]=value;
    return result;
  }
  return clone(after);
}
function minutes(value){
  const p=String(value||'').split(':').map(Number);
  return (p[0]||0)*60+(p[1]||0);
}
function checkSize(data){
  if(JSON.stringify(data).length>800000)
    throw Error('Los datos superan el tamaño seguro de un documento Firestore. Reducí fotos incrustadas y exportá respaldo.');
}
export function stopBetaSync(){
  generation++;
  window.kuimbaeBetaSyncReady=false;
  if(writeListener)window.removeEventListener('kuimbae-beta-local-write',writeListener);
  writeListener=null;
  for(const fn of unsubscribe){try{fn()}catch(e){console.warn(e)}}
  unsubscribe=[];
  queued.clear();
  blocked=false;
  document.documentElement.classList.remove('ku-beta-sync-error');
}
export async function startBetaSync({db,user,role}){
  stopBetaSync();
  if(role!=='admin')throw Error('La BETA de sincronización está habilitada solo para administradores. Todavía no habilites cuentas de barberos.');
  if(!navigator.onLine)throw Error('La BETA necesita internet. Conectate e ingresá nuevamente.');
  const token=generation;
  const bridge=window.kuimbaeBetaBridge;
  if(!bridge||!bridge.keys)throw Error('Falta el módulo de almacenamiento BETA.');
  const names=Object.keys(bridge.keys);
  const refs=Object.fromEntries(names.map(name=>[name,doc(db,'shops',SHOP_ID,'datasets',name)]));
  status('Leyendo registros compartidos…');
  let snaps;
  try{
    snaps=await Promise.all(names.map(name=>getDoc(refs[name])));
  }catch(err){
    console.error('Lectura inicial de Firestore',err);
    throw Error('Firestore no permitió leer los datos compartidos. Falta configurar las reglas para shops/kuimbae-style/datasets; no se modificó la app principal.');
  }
  if(token!==generation)throw Error('Sesión interrumpida.');
  for(let i=0;i<names.length;i++){
    const name=names[i],snap=snaps[i];
    const key=bridge.keys[name];
    // No descartar datos BETA que no existan aún en la nube.
    if(!snap.exists()&&localStorage.getItem(key)){
      const local=JSON.parse(localStorage.getItem(key));
      if(!same(local,bridge.defaults[name]))
        throw Error('Hay datos locales BETA que no están en Firestore. Guardá un respaldo antes de iniciar; no se importan automáticamente.');
    }
    const cloud=snap.exists()?snap.data().data:clone(bridge.defaults[name]);
    if(cloud===undefined||cloud===null)throw Error('Documento sin datos: '+name);
    bridge.apply(name,clone(cloud));
  }
  function refreshSnapshot(name,snap){
    if(token!==generation||blocked||queued.has(name))return;
    const data=snap.exists()?snap.data().data:clone(bridge.defaults[name]);
    if(data===undefined||data===null){block('Documento de nube inválido: '+name);return}
    const key=bridge.keys[name];
    const local=JSON.parse(localStorage.getItem(key)||'null');
    if(!same(local,data))bridge.apply(name,clone(data));
    status('Sincronizado con Firestore');
  }
  for(const name of names){
    const unsub=onSnapshot(refs[name],snap=>refreshSnapshot(name,snap),
      error=>block('Conexión interrumpida: '+(error.code||error.message)));
    unsubscribe.push(unsub);
  }
  writeListener=event=>{
    if(token!==generation||blocked||!window.kuimbaeBetaSyncReady)return;
    const d=event.detail||{};
    const name=names.find(n=>bridge.keys[n]===d.key);
    if(!name||same(d.before,d.after))return;
    const prior=queued.get(name)||Promise.resolve();
    const task=prior.then(async()=>{
      if(token!==generation||blocked)throw Error('Sesión no disponible');
      if(!navigator.onLine)throw Error('Sin conexión: los cambios no se enviaron a Firestore.');
      status('Guardando '+name+' en Firestore…');
      await runTransaction(db,async tx=>{
        const snap=await tx.get(refs[name]);
        const current=snap.exists()?snap.data().data:clone(bridge.defaults[name]);
        const merged=clone(changeSet(current,d.before,d.after,name));
        checkSize(merged);
        tx.set(refs[name],{data:merged,version:1,updatedAt:serverTimestamp(),updatedBy:user.uid});
      });
    });
    queued.set(name,task);
    task.then(async()=>{
      if(queued.get(name)!==task||token!==generation)return;
      // Cuando terminan todos los cambios para este conjunto, tomar el servidor
      // como fuente de verdad y evitar que se mantenga una copia local distinta.
      const snap=await getDoc(refs[name]);
      if(queued.get(name)!==task||token!==generation)return;
      queued.delete(name);
      refreshSnapshot(name,snap);
    }).catch(error=>{
      if(token===generation)block('Error al sincronizar '+name+': '+(error.message||'revisá la conexión')+'. No sigas cargando turnos.');
    });
  };
  window.addEventListener('kuimbae-beta-local-write',writeListener);
  window.kuimbaeBetaSyncReady=true;
  status('Sincronizado con Firestore');
}