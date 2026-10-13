# MES Fabricaciones · GitHub + Firebase Spark

Versión del 13/10/2026. Proyecto: **sgi-v01**. Sin Cloud Functions, sin Firebase Storage, sin Python y sin habilitar facturación. No se publicó el sitio ni se modificó tu Firebase: completá la configuración que sigue antes de usarlo.

## Incluido

- Ingreso por usuario y contraseña con Firebase Authentication; no hay contraseña predeterminada ni correos corporativos.
- Roles de administrador y operario protegidos por reglas de Firestore. El rol no depende de un botón o dato del navegador.
- Hoja de ruta OT/POS/OP, impresión, historial, Kanban por máquina con estados y tiempos registrados. Conserva el diseño y el logo anteriores. No es un Gantt ni calcula capacidad futura en horas.
- Operario asignado o administrador pueden ejecutar la operación activa. Reserva atómica de máquina y operario: una máquina automática también requiere que su operario permanezca asignado, sin otra operación simultánea. Pausar libera ambos recursos.
- Se conservan tiempos y firmas al editar metadatos. Una ruta iniciada no admite cambiar su secuencia. Esta versión admite hasta **20 operaciones por hoja de ruta**, límite verificado para las reglas de Spark.
- Adjuntar archivos junto a las operaciones: PDF/STP/STEP/STL, un archivo principal por OT/POS, hasta 200 MiB. Se conserva el original en la carpeta compartida; se envían a Firestore solamente sus metadatos y hash. No se suben los planos a GitHub ni a Firebase Storage.
- Después de recargar o abrir desde otra PC hay que seleccionar el mismo original; se verifica su contenido. La selección de archivo no da acceso automático a su carpeta ni sincroniza permisos entre equipos.
- Se conservan las herramientas de copias locales antiguas y respaldos como opción separada. Las nuevas referencias no generan una copia persistente en el navegador.

## 1. Crear los administradores

En Firebase, seleccioná SGI-V01 → Authentication → Método de acceso y habilitá **Correo electrónico/contraseña**. La pantalla del sistema muestra solo usuario y contraseña; internamente se usa un identificador con formato de email que no es un buzón.

En Authentication → Usuarios → Agregar usuario, creá:

| Usuario visible | Identificador que debés escribir en Firebase | Nombre |
|---|---|---|
| mramirez | mramirez@usuarios.sgi-v01.invalid | Mariano Ramírez |
| eficarra | eficarra@usuarios.sgi-v01.invalid | Enzo Ficarra |

Asigná contraseñas únicas de al menos 10 caracteres. No las envíes ni las guardes en GitHub. Firebase asignará un UID a cada cuenta; copialo.

En Cloud Firestore → Datos, creá la colección `mes_usuarios`. Para cada administrador, creá un documento cuyo ID sea **exactamente su UID**, con estos campos:

| Campo | Tipo | Mariano | Enzo |
|---|---|---|---|
| usuario | string | mramirez | eficarra |
| nombre | string | Mariano Ramírez | Enzo Ficarra |
| role | string | admin | admin |
| enabled | boolean | true | true |
| validAfter | number | 0 | 0 |

No uses el nombre del usuario como ID del documento: tiene que ser el UID de Authentication. No guardes contraseñas en Firestore.

## 2. Agregar operarios

Repetí el procedimiento con cada usuario. Ejemplo: `fmorano@usuarios.sgi-v01.invalid`; perfil con `usuario: fmorano`, `nombre: Fernando Morano`, `role: operario`, `enabled: true`, `validAfter: 0`.

El nombre del perfil debe coincidir exactamente con el asignado a las operaciones. Una cuenta por persona, sin nombres duplicados. Usá minúsculas sin espacios para los usuarios (3–32 caracteres: letras, números, punto, guion o guion bajo). Los nombres pueden tener espacios y acentos. Los administradores cargarán el catálogo de perfiles al ingresar; volvé a ingresar después de crear nuevos operarios para actualizar las opciones.

El botón **Accesos de usuarios** de Oficina Técnica abre la orientación y un enlace a Firebase. En Spark, esta versión no crea ni restablece contraseñas de otras cuentas desde el navegador. Ser administrador del MES no otorga acceso a la consola de Firebase: solo el propietario o responsables autorizados del proyecto pueden administrar esas cuentas.

## 3. Aplicar las reglas

1. Guardá una copia de las reglas actuales y respaldá tus datos antes del cambio.
2. Abrí `firestore.rules` de este ZIP con Bloc de notas.
3. Copiá todo en **Cloud Firestore → Reglas**, reemplazando el contenido anterior, y pulsá Publicar.

No uses la pantalla Realtime Database para estas reglas. No mantengas `allow read, write: if true`. Estas reglas protegen perfiles, órdenes y reservas. Las otras colecciones quedan bloqueadas para clientes: si otra aplicación usa el mismo proyecto, hay que revisar su acceso antes de aplicar las reglas.

La colección de la aplicación es **`ordenes_veng`**, igual que en el ZIP local. La captura mostraba otra colección llamada **`ordenes`**: no se borró ni se migró. No se mezclan automáticamente porque podría tener otro formato. Las órdenes y contraseñas del servidor Python tampoco se migran automáticamente.

Las rutas antiguas pendientes de `ordenes_veng` deben abrirse como administrador y guardarse con esta versión para agregar las claves de reserva. Las rutas antiguas ya iniciadas sin esas claves quedan para consulta; hay que revisar su migración antes de continuarlas. No edites reservas manualmente ni mantengas simultáneamente una versión antigua escribiendo en la base.

## 4. Subir a GitHub Pages

1. Descomprimí el ZIP. En tu repositorio usá **Add file → Upload files** y subí el contenido de `MES_Spark`, manteniendo la carpeta `docs` y sus subcarpetas. No subas el ZIP como único archivo.
2. En **Settings → Pages**, elegí **Deploy from a branch**, rama **main**, carpeta **/docs**, y guardá.
3. Firebase → Authentication → Settings → Authorized domains: agregá `TU-USUARIO.github.io`, sin https ni ruta. Si usás dominio propio, agregalo también.
4. Abrí la URL HTTPS que informa GitHub Pages. Ingresá con `mramirez` y la contraseña creada en Firebase.

El programa se usa desde el navegador: no hay que instalar Python, Node ni npm en las computadoras del taller. Internet es necesario para ingresar, consultar y guardar órdenes. No admite ejecutar operaciones sin conexión. La página puede cargar desde caché pero eso no implica conexión a Firebase.

Solo se publica `docs`. El ZIP no modifica la visibilidad del repositorio ni publica nada. Verificá qué opciones de GitHub Pages permite tu plan si el repositorio debe ser privado; no lo vuelvas público sin autorización. El login protege la base de datos, no oculta el HTML y JavaScript que sirve GitHub Pages. No subas documentos de VENG, `datos_privados`, SQLite ni credenciales de administrador.

## 5. Contraseñas olvidadas y bajas

Como los identificadores `.invalid` no son buzones, **no uses el envío de un enlace de recuperación por correo**. La consola de Firebase puede ofrecer solo esa opción, no una casilla para asignar otra contraseña. Para recuperar un usuario sin código administrativo adicional:

1. El responsable autorizado pone `enabled: false` en el perfil viejo `mes_usuarios/UID`. Esto corta el acceso a órdenes de las sesiones anteriores mediante las reglas.
2. Desde Authentication, elimina **solo esa cuenta de acceso** y la vuelve a crear con el mismo identificador interno y la nueva contraseña. Conservá el perfil viejo deshabilitado para trazabilidad; no borres órdenes.
3. Copia el nuevo UID y crea el nuevo perfil con el mismo `usuario`, `nombre` y `role`, más `enabled: true` y `validAfter: 0`.
4. Prueba el nuevo ingreso. Las asignaciones por nombre se conservan; las firmas históricas mantienen su UID original.

Para dar de baja un usuario sin recrearlo: `enabled: false` en su perfil y deshabilitar también la cuenta en Authentication. Deshabilitar solo Authentication puede dejar tokens ya emitidos válidos temporalmente; el perfil evita que sigan consultando órdenes. Para recuperar un administrador se necesita acceso autorizado a la consola; no hay contraseña maestra.

## 6. Prueba en el taller

Crear una OT de prueba, asignarla a un operario y entrar desde otra PC. Comprobar inicio/pausa/reanudación/cierre, el Kanban y que dos operaciones no ocupen simultáneamente el mismo recurso. Mantener la fecha y hora de Windows sincronizadas: las reglas rechazan inicios con una diferencia de más de un minuto respecto de Firebase.

Adjuntar un PDF, STL y STP/STEP real. Recargar, volver a elegir el original y probar otra revisión: debe rechazarla. Para actualizar una revisión, Oficina Técnica vuelve a adjuntarla y guarda la hoja de ruta. Si OneDrive muestra un archivo solo en la nube, descargalo o marcá Siempre conservar en este dispositivo.

200 MiB es el límite de selección, no una garantía de renderizado: STEP puede consumir mucha más memoria al convertir la geometría. Tablets y modelos industriales grandes requieren una prueba real. Otros formatos CAD propietarios no tienen compatibilidad garantizada. El visor muestra estado de carga/procesamiento; no inventa un porcentaje de conversión.

El cierre registra usuario autenticado y legajo: es trazabilidad de operación, no firma digital certificada. Spark tiene cuotas de uso; si se agotan, el servicio puede bloquear operaciones hasta su recuperación. No se habilita facturación automáticamente con este paquete.

## Verificación y referencias

Consultá `VERIFICACION.md` para las pruebas realizadas. Ninguna prueba escribió en el proyecto real sgi-v01.

- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/rules/rules-and-auth
- https://firebase.google.com/docs/auth/web/password-auth

`firebase.json` se incluye para pruebas y despliegue opcional de reglas con CLI; no contiene funciones ni exige Blaze. No es necesario usar CLI para seguir los pasos de consola anteriores.
