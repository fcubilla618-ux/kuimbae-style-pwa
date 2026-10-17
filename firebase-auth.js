import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore, doc, getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
// Configuración pública de la aplicación web creada en Firebase.
const firebaseConfig = {
  apiKey: 'AIzaSyD55RWdPgKn4ApXes2jjWV9Uniw9U3Z5Jw',
  authDomain: 'kuimba-e-style.firebaseapp.com',
  projectId: 'kuimba-e-style',
  storageBucket: 'kuimba-e-style.firebasestorage.app',
  messagingSenderId: '536720236558',
  appId: '1:536720236558:web:98a7b3cd123dc721581c5f'
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const login=document.getElementById('firebaseLogin');
const status=document.getElementById('firebaseLoginStatus');
const btn=document.getElementById('firebaseLoginButton');
const form=document.getElementById('firebaseLoginForm');
function lockUI(message='Ingresá con tu cuenta de Firebase.'){
  document.documentElement.classList.remove('ku-authenticated','ku-barber');
  login.hidden=false;status.textContent=message;
  document.getElementById('firebaseLoginPassword').value='';
}
async function showSession(user){
  document.documentElement.classList.remove('ku-authenticated','ku-barber');
  login.hidden=false; status.textContent='Comprobando permisos de tu cuenta…';
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    if(!snap.exists())throw Error('Tu cuenta no tiene un perfil en Firestore. Consultá al administrador.');
    const profile=snap.data(),role=profile.role;
    if(role!=='admin'&&role!=='barber')throw Error('El perfil no tiene un rol autorizado.');
    if(profile.active===false)throw Error('La cuenta está desactivada.');
    const name=profile.name|| (role==='admin'?'Administrador':'Barbero');
    document.getElementById('kuimbaeUserLabel').textContent=name;
    document.getElementById('kuimbaeBarberName').textContent='Cuenta de '+name+' verificada';
    login.hidden=true;
    document.documentElement.classList.add('ku-authenticated');
    if(role==='barber')document.documentElement.classList.add('ku-barber');
    // ETAPA 1: los datos de trabajo continúan locales; esta interfaz no pretende sincronizarlos.
    window.kuimbaeFirebaseSession={uid:user.uid,role,name};
  }catch(e){
    console.error('Validar perfil',e);
    window.kuimbaeFirebaseSession=null;
    lockUI(e.message||'No fue posible leer tu perfil. Revisá internet y las reglas.');
  }
}
form.addEventListener('submit',async e=>{
  e.preventDefault();btn.disabled=true;status.textContent='Verificando correo y contraseña…';
  try{await signInWithEmailAndPassword(auth,document.getElementById('firebaseLoginEmail').value.trim(),document.getElementById('firebaseLoginPassword').value)}
  catch(e){console.error('Login',e);status.textContent='No se pudo iniciar sesión. Revisá correo, contraseña y conexión a internet.'}
  finally{btn.disabled=false}
});
async function logout(){try{await signOut(auth)}catch(e){lockUI('No se pudo cerrar sesión. Volvé a intentarlo.')}}
document.getElementById('kuimbaeSignoutButton').addEventListener('click',logout);
document.getElementById('kuimbaeBarberLogout').addEventListener('click',logout);
onAuthStateChanged(auth,user=>{if(user)showSession(user);else{window.kuimbaeFirebaseSession=null;lockUI()}},()=>lockUI('No se pudo contactar Firebase. Verificá la conexión a internet.'));
