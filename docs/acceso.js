let perfilMES=null,detenerPerfil=null;
const accionesPendientes=new Set();
const timestamp=()=>firebase.firestore.FieldValue.serverTimestamp();
function correoUsuario(value){return MESLogic.username(value)+'@usuarios.sgi-v01.invalid';}
function resourceKey(prefix,name){return prefix+'_'+encodeURIComponent(name.normalize('NFC').trim());}
function limpiarSesionPantalla(){
 if(desconectarOrdenes){desconectarOrdenes();desconectarOrdenes=null;}
 if(detenerPerfil){detenerPerfil();detenerPerfil=null;}
 perfilMES=null;usuarioLogueado=null;esAdmin=false;todasLasOrdenes=[];archivosSesion.clear();
 document.getElementById('pantallaPrincipal').style.display='none';document.getElementById('pantallaLogin').style.display='block';
 document.getElementById('btnUsuariosClaves').hidden=true;
 for(const d of document.querySelectorAll('dialog[open]'))d.close();
 for(const id of ['tablaDeOrdenes','tablaHistorial','tableroCargas'])document.getElementById(id)?.replaceChildren();
 document.querySelectorAll('input[type=password]').forEach(i=>i.value='');
}
async function confirmarIngreso(event){
 event.preventDefault();const b=event.submitter;b.disabled=true;document.getElementById('estadoAcceso').textContent='Verificando acceso…';
 try{await firebase.auth().signInWithEmailAndPassword(correoUsuario(document.getElementById('usuarioIngreso').value),document.getElementById('claveIngreso').value);}
 catch(e){document.getElementById('estadoAcceso').textContent=e.code==='auth/network-request-failed'?'No hay conexión con Firebase.':'No se pudo ingresar. Revisá usuario, contraseña y habilitación de Email/Password en Firebase.';}
 finally{document.getElementById('claveIngreso').value='';b.disabled=false;}
}
async function cerrarSesion(){await firebase.auth().signOut();limpiarSesionPantalla();}
function abrirUsuariosClaves(){if(esAdmin)document.getElementById('modalUsuariosClaves').showModal();}
async function llamarMES(unused,d){
 if(!perfilMES)throw Error('Ingresá nuevamente.');
 const ref=d.id?db.collection('ordenes_veng').doc(d.id):db.collection('ordenes_veng').doc();
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),old=snap.exists?snap.data():null;
  if(d.accion==='guardar'){
   if(!esAdmin)throw Error('Solo Oficina Técnica puede editar órdenes.');
   if(d.id&&!old)throw Error('La orden ya no existe.');
   const next=MESLogic.validateOrder(d.orden,old);
   if(next.pasos.length>20)throw Error('Máximo 20 operaciones por hoja de ruta en esta versión Spark.');
   next.pasos=next.pasos.map(p=>({...p,machineKey:resourceKey('m',p.maquina),operatorKey:resourceKey('o',p.asignadoA)}));
   if(old?.pasos.some(p=>p.estado!=='Pendiente')){
    if(JSON.stringify(next.pasos)!==JSON.stringify(old.pasos))throw Error('La ruta ya comenzó: se conservan operaciones y tiempos. Para editar la planificación usá una ruta pendiente.');
    const {pasos,estado,...metadata}=next;tx.update(ref,metadata);
   }else tx.set(ref,next);
  }else if(d.accion==='eliminar'){
   if(!esAdmin||!old)throw Error('Orden inexistente o sin permiso.');
   if(old.pasos.some(p=>p.estado==='En proceso'))throw Error('Pausá la operación antes de eliminar.');tx.delete(ref);
  }else{
   if(!old)throw Error('La orden no existe.');
   const p=old.pasos[d.idx];if(!p?.machineKey||!p?.operatorKey)throw Error('Ruta de versión anterior: Oficina Técnica debe guardar la planificación pendiente con esta versión.');
   const machine=db.collection('mes_recursos').doc(p.machineKey),operator=db.collection('mes_recursos').doc(p.operatorKey);
   let slots=[];
   if(d.accion==='estado')slots=await Promise.all([tx.get(machine),tx.get(operator)]);
   if(d.nuevoEstado==='En proceso'&&slots.some(s=>s.exists&&s.data().orden!==null))throw Error('Máquina u operario ocupado en otra operación.');
   const next=MESLogic.transition(old,perfilMES,{...d,uid:firebase.auth().currentUser.uid},[],Date.now());
   next.cambio={idx:d.idx,accion:d.accion,actor:firebase.auth().currentUser.uid,when:timestamp()};
   tx.set(ref,next);
   if(d.accion==='estado'){
    const value=d.nuevoEstado==='En proceso'?{orden:ref.id,idx:d.idx}:{orden:null,idx:null};tx.set(machine,value);tx.set(operator,value);
   }
  }
  return {id:ref.id};
 });
}
async function cambiarEstado(id,nuevoEstado){
 if(accionesPendientes.has(id))return;
 const o=todasLasOrdenes.find(x=>x.id===id),idx=o?.pasos.findIndex(p=>p.estado!=='Terminado');if(idx==null||idx<0)return;
 let notes='',legajo='';
 if(['Pausado','Terminado'].includes(nuevoEstado)){notes=prompt('Observaciones:',o.pasos[idx].notes||'');if(notes===null)return;}
 if(nuevoEstado==='Terminado'){legajo=prompt('Legajo (el cierre registra también tu usuario autenticado):');if(!legajo?.trim())return;}
 accionesPendientes.add(id);
 try{await llamarMES('',{accion:'estado',id,idx,esperado:o.pasos[idx].estado,nuevoEstado,notes,legajo});}
 catch(e){alert(e.code==='permission-denied'?'Operación rechazada por las reglas. Revisá asignación, estado, reloj del equipo y configuración de Firebase.':e.message);}finally{accionesPendientes.delete(id);}
}
async function marcarInstrumentoMesa(id,idx,instrumento,checked){
 try{await llamarMES('',{accion:'instrumento',id,idx,instrumento,checked});}catch(e){alert(e.message);mostrarTablas();}
}
async function catalogoUsuarios(){
 const users=await db.collection('mes_usuarios').get();
 users.forEach(s=>{const p=s.data();if(p.enabled&&!LISTA_OPERARIOS.includes(p.nombre))LISTA_OPERARIOS.push(p.nombre);});
}
if(db&&typeof firebase.auth==='function'){
 firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION).then(()=>firebase.auth().onAuthStateChanged(async user=>{
  limpiarSesionPantalla();if(!user)return;
  try{
   const token=await user.getIdTokenResult();
   detenerPerfil=db.collection('mes_usuarios').doc(user.uid).onSnapshot(async snap=>{
    const p=snap.data();
    if(!p||p.enabled!==true||!['admin','operario'].includes(p.role)||Number(token.claims.auth_time)<(p.validAfter||0)){
     await cerrarSesion();document.getElementById('estadoAcceso').textContent='Perfil no habilitado o sesión vencida. Contactá a Oficina Técnica.';return;
    }
    const changed=!perfilMES||perfilMES.role!==p.role||perfilMES.nombre!==p.nombre;
    perfilMES=p;usuarioLogueado=p.nombre;esAdmin=p.role==='admin';document.getElementById('btnUsuariosClaves').hidden=!esAdmin;
    if(changed){if(esAdmin)try{await catalogoUsuarios();}catch(e){console.warn('No se pudo leer el catálogo de usuarios.',e.code);}conectarEscuchaFirebase();}
   },async()=>{await cerrarSesion();document.getElementById('estadoAcceso').textContent='No se pudo verificar el perfil. Revisá conexión y reglas de Firestore.';});
  }catch(e){await cerrarSesion();document.getElementById('estadoAcceso').textContent='No se pudo validar la sesión.';}
 })).catch(()=>{document.getElementById('estadoAcceso').textContent='No se pudo iniciar Authentication.';});
}else document.getElementById('estadoAcceso').textContent='No se cargó Firebase. Revisá Internet y recargá.';
