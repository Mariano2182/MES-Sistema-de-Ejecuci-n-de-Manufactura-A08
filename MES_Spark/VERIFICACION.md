# Verificación · 13/10/2026

Se realizaron pruebas locales con Firebase Emulator Suite, usando el proyecto ficticio `demo-mes-spark`. No se leyó ni escribió el proyecto productivo `sgi-v01` durante estas pruebas.

## Comprobado

- Sintaxis JavaScript de los scripts del HTML, acceso.js y logic.js.
- Compilación y ejecución de firestore.rules en el emulador de Firestore.
- Lectura rechazada para usuarios sin sesión o deshabilitados.
- Un operario no puede cambiar su rol, editar metadatos de órdenes ni ejecutar una operación de otra persona.
- Dos intentos concurrentes con el mismo recurso: uno inicia y el otro es rechazado.
- Inicio manipulado sin reserva de recursos rechazado por las reglas.
- Verificación de instrumentos, pausa, reanudación, cierre y UID autenticado de quien cierra.
- Creación de una ruta de 20 operaciones y ejecución de la operación 20 con las anteriores terminadas.
- Deshabilitación del perfil impide consultar órdenes con una sesión previa.
- En Chromium sin interfaz, conectado a los emuladores: ingreso con usuario/contraseña, creación de OT, inicio, actualización de Kanban y cierre de sesión. Sin errores JavaScript de página.
- Renderizado de un STL sencillo y de un STP de referencia en el visor. El importador STEP generó 18 mallas. Referencia pública de prueba: https://github.com/kovacsv/Online3DViewer/blob/master/website/assets/models/as1_pe_203.stp (no incluida en el ZIP).
- Apertura del iframe PDF mediante URL blob; no se comprobó fidelidad de planos técnicos PDF reales.
- No hay endpoints /api de Python ni llamadas a Cloud Functions en el código de esta versión. Los SDK necesarios están incluidos localmente.

## Pendiente de configuración y prueba real

- Habilitar Authentication, crear cuentas/perfiles y aplicar las reglas en sgi-v01.
- Subir el paquete y activar GitHub Pages, con su dominio autorizado en Firebase.
- Probar los documentos reales del taller, en especial modelos grandes de hasta 200 MiB y tablets. Un modelo de referencia no garantiza rendimiento con ensamblajes industriales.
- Revisar si hace falta migrar la colección histórica `ordenes` o rutas antiguas ya iniciadas. Este paquete no las convierte ni borra.
- Comprobar las cuotas de Spark según la cantidad de usuarios y órdenes. Las consultas en tiempo real y la lectura de perfiles/reglas consumen cuota.

La aprobación de las pruebas locales no significa que el sitio esté publicado ni que Firebase productivo ya tenga las reglas instaladas.
