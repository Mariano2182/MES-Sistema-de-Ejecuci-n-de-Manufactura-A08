'use strict';
function requireCondition(ok,message){if(!ok)throw Error(message);}
function text(value,max=1000){requireCondition(typeof value==='string'&&value.length<=max,'Texto inválido.');return value.trim();}
function username(value){const s=text(value,32).toLowerCase();requireCondition(/^[a-z0-9._-]{3,32}$/.test(s),'Usuario inválido.');return s;}
function password(value){requireCondition(typeof value==='string'&&value.length>=10&&value.length<=128,'La contraseña debe tener entre 10 y 128 caracteres.');return value;}
function authorize(profile,authTime){requireCondition(profile?.enabled===true&&['admin','operario'].includes(profile.role)&&authTime>=(profile.validAfter||0),'Usuario deshabilitado o sesión vencida.');}
function transition(order,profile,input,others,now){
 const result=structuredClone(order),pasos=result.pasos;
 requireCondition(Array.isArray(pasos)&&pasos.length>0,'La orden no tiene operaciones.');
 const idx=pasos.findIndex(p=>p.estado!=='Terminado');
 requireCondition(idx>=0&&idx===input.idx,'La operación activa cambió. Actualizá la pantalla.');
 const p=pasos[idx];requireCondition(profile.role==='admin'||p.asignadoA===profile.nombre,'La operación corresponde a otro operario.');
 if(input.accion==='instrumento'){
  requireCondition(p.estado==='En proceso'&&typeof input.checked==='boolean'&&(p.instrumentos||[]).includes(input.instrumento),'Instrumento u operación inválidos.');
  const set=new Set(p.instrumentosVerificadosTaller||[]);input.checked?set.add(input.instrumento):set.delete(input.instrumento);p.instrumentosVerificadosTaller=[...set];return result;
 }
 requireCondition(p.estado===input.esperado,'El estado cambió desde otra computadora.');
 const target=input.nuevoEstado;
 requireCondition((target==='En proceso'&&['Pendiente','Pausado'].includes(p.estado))||(['Pausado','Terminado'].includes(target)&&p.estado==='En proceso'),'Transición no permitida.');
 if(target==='En proceso'){
  requireCondition(p.asignadoA&&p.maquina,'Asigná máquina y operario antes de iniciar.');
  for(const other of others)for(const op of other.pasos||[])if(op.estado==='En proceso')requireCondition(op.asignadoA!==p.asignadoA&&op.maquina!==p.maquina,'Máquina u operario ocupado en otra operación.');
  p.horaInicio=now;
 }else{
  p.tiempoAcumulado=(p.tiempoAcumulado||0)+(p.horaInicio?Math.max(0,now-p.horaInicio):0);p.horaInicio=null;p.notes=text(input.notes||'',2000);
 }
 if(target==='Terminado'){
  p.legajo=text(input.legajo,40);requireCondition(p.legajo.length>0,'Indicá el legajo.');
  p.firmaDigital=profile.nombre;p.fechaFirma=new Date(now).toISOString();p.firmaUid=input.uid;
 }
 p.estado=target;result.estado=pasos.every(p=>p.estado==='Terminado')?'Terminado':'En proceso';
 if(result.estado==='Terminado')result.fechaFin=new Date(now).toISOString().slice(0,10);
 return result;
}
function validateOrder(value,old){
 requireCondition(value&&Array.isArray(value.pasos)&&value.pasos.length>0&&value.pasos.length<=100,'Se requieren entre 1 y 100 operaciones.');
 const out={};
 for(const key of ['ot','pos','nPlano','cliente','proyecto','area','producto','material','fecha','notes'])out[key]=text(value[key]||'',key==='notes'?2000:200);
 requireCondition(out.ot&&out.pos&&out.producto,'Completá OT, POS y producto.');
 requireCondition(Number.isInteger(value.cantidad)&&value.cantidad>0,'Cantidad inválida.');out.cantidad=value.cantidad;
 const seen=new Set();out.pasos=value.pasos.map(p=>{
  requireCondition(Number.isFinite(Number(p.op))&&Number(p.op)>0&&!seen.has(String(p.op)),'Números de operación inválidos o repetidos.');seen.add(String(p.op));
  const prev=old?.pasos?.find(x=>String(x.op)===String(p.op));
  const base={op:p.op,maquina:text(p.maquina,100),tarea:text(p.tarea,100),asignadoA:text(p.asignadoA,80),instrumentos:p.instrumentos||[]};
  requireCondition(base.maquina&&base.tarea&&base.asignadoA&&Array.isArray(base.instrumentos)&&base.instrumentos.length<=30,'Operación incompleta.');
  for(const i of base.instrumentos)requireCondition(typeof i==='string'&&/^[\w -]{1,50}$/.test(i),'Instrumento inválido.');
  if(prev&&prev.estado!=='Pendiente')requireCondition(['maquina','tarea','asignadoA'].every(k=>base[k]===prev[k])&&JSON.stringify(base.instrumentos)===JSON.stringify(prev.instrumentos||[]),'No se puede cambiar una operación ya iniciada.');
  return prev?{...prev,...base}:{...base,estado:'Pendiente',tiempoAcumulado:0,horaInicio:null,notes:'',legajo:'',firmaDigital:'',fechaFirma:''};
 }).sort((a,b)=>Number(a.op)-Number(b.op));
 if(old?.pasos?.some(p=>p.estado!=='Pendiente')){
  requireCondition(JSON.stringify(out.pasos.map(p=>String(p.op)))===JSON.stringify(old.pasos.map(p=>String(p.op))),'No se pueden agregar, quitar o reordenar operaciones de una ruta iniciada.');
 }
 const attachment=value.archivoAdjuntoData;
 if(!attachment)out.archivoAdjuntoData=null;
 else if(old&&JSON.stringify(attachment)===JSON.stringify(old.archivoAdjuntoData))out.archivoAdjuntoData=old.archivoAdjuntoData;
 else{
  requireCondition(attachment.origen==='carpeta-compartida'&&/^[a-f0-9]{64}$/.test(attachment.hash)&&Number.isInteger(attachment.tamano)&&attachment.tamano>0&&attachment.tamano<=200*1024*1024,'Referencia de archivo inválida.');
  const nombre=text(attachment.nombre,255);requireCondition(/\.(pdf|stp|step|stl)$/i.test(nombre),'Formato no compatible.');
  out.archivoAdjuntoData={origen:'carpeta-compartida',nombre,hash:attachment.hash,tamano:attachment.tamano,revision:text(attachment.revision||'',80),fecha:new Date().toISOString()};
 }
 out.estado=old?.estado||'Pendiente';if(old?.fechaFin)out.fechaFin=old.fechaFin;
 return out;
}
const MESLogic={requireCondition,text,username,password,authorize,transition,validateOrder};
if(typeof module!=='undefined')module.exports=MESLogic;
