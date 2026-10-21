// FASE 1: adaptador Firestore V2 (NO importado por la BETA publicada).
// Mantiene las consultas de cada barbero filtradas por barberId. Requiere
// probar beta/firestore.phase1.rules en Emulator antes de habilitar usuarios.
import {
  collection, doc, getDoc, onSnapshot, query, where
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const ROOT=['shops','kuimbae-style'];
const SCOPED_COLLECTIONS=new Set(['v2Appointments','v2Services','v2Sales','v2Cash']);
const ALL_COLLECTIONS=new Set([...SCOPED_COLLECTIONS,'v2Products']);
const invalid=(message)=>{throw new Error(message);};

/**
 * Lee el perfil REAL del usuario; no confía en roles/barberId escritos en el
 * almacenamiento local o parámetros de URL.
 */
export async function getVerifiedProfile(db,user) {
  if(!user?.uid) invalid('Tenés que iniciar sesión.');
  const snap=await getDoc(doc(db,'users',user.uid));
  if(!snap.exists()) invalid('No existe un perfil en users para esta cuenta.');
  const data=snap.data();
  if(data.active===false) invalid('Tu cuenta está desactivada.');
  if(data.role==='admin') return Object.freeze({uid:user.uid,role:'admin',name:data.name||'Kuimbae'});
  if(data.role!=='barber') invalid('Rol no autorizado.');
  if(data.active!==true || typeof data.barberId!=='string' || !data.barberId.trim())
    invalid('Falta vincular barberId en users. Consultá al administrador.');
  return Object.freeze({uid:user.uid,role:'barber',name:data.name||'Barbero',barberId:data.barberId.trim()});
}

export function buildScopedQuery(db,profile,collectionName) {
  if(!ALL_COLLECTIONS.has(collectionName)) invalid('Colección V2 no permitida.');
  if(!profile || !['admin','barber'].includes(profile.role)) invalid('Sesión no autorizada.');
  const ref=collection(db,...ROOT,collectionName);
  if(profile.role==='admin'||collectionName==='v2Products') return query(ref);
  if(!SCOPED_COLLECTIONS.has(collectionName)) invalid('Consulta sin restricción.');
  if(!profile.barberId) invalid('No existe barberId.');
  // Las reglas Firestore evalúan esta condición; NO son filtros posteriores.
  return query(ref,where('barberId','==',profile.barberId));
}

export function watchScopedCollection(db,profile,collectionName,onData,onError) {
  const q=buildScopedQuery(db,profile,collectionName);
  return onSnapshot(q,snapshot=>{
    onData(snapshot.docs.map(docSnap=>({id:docSnap.id,...docSnap.data()})));
  },error=>{
    if(onError) onError(error);
  });
}

/**
 * Componente de lectura: caja personal = ventas de servicios + productos
 * registradas con barberId. La caja general la suma una sola vez por registro,
 * sin duplicar documentos para admin.
 */
export function watchBarberDashboard(db,profile,handlers={}) {
  const stops=[];
  const subscribe=(name,callback)=>{
    if(typeof callback!=='function') return;
    stops.push(watchScopedCollection(db,profile,name,callback,handlers.onError));
  };
  try {
    subscribe('v2Appointments',handlers.onAppointments);
    subscribe('v2Services',handlers.onServices);
    subscribe('v2Sales',handlers.onSales);
    subscribe('v2Cash',handlers.onCash);
    subscribe('v2Products',handlers.onProducts);
  }catch(error){
    for(const stop of stops)stop();
    throw error;
  }
  return ()=>{for(const stop of stops)stop()};
}

/**
 * No activar escrituras de V2 todavía: antes se necesita migración verificada,
 * prevención de choques de turnos y función de servidor para vender productos.
 * NUNCA permitir que el cliente descuente stock o genere caja directamente.
 */
