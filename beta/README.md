# Kuimba'e Style · BETA Firebase (20-10-2026)

## Estado
BETA aislada bajo `/beta/`. **No reemplaza** `/index.html`, su PWA, sus claves de localStorage ni los datos del negocio. Solo administradores. No se realizaron cambios en el proyecto Firebase ni en sus reglas.

### Preparación imprescindible en Firebase Console
1. Firestore Database → Rules: **conservar las reglas actuales** para `users` y **agregar** el fragmento de `firestore-rules-fragment.txt` dentro del mismo bloque `match /databases/{database}/documents`. Revisar con el simulador y publicar las reglas desde Firebase.
2. Authentication → Settings → Authorized domains: verificar el dominio exacto desde el que se abre la BETA, por ejemplo `fcubilla618-ux.github.io`.
3. Probar con la cuenta administrador cuyo documento `users/{uid}` tenga `role:'admin'` y no tenga `active:false`. La cuenta de barbero aún no está habilitada para modificar datos compartidos.

### Uso de la BETA
- Abrir **/beta/index.html** por HTTPS. Necesita internet y las reglas de Firestore preparadas.
- La aplicación usa documentos `shops/kuimbae-style/datasets/{barbers,appointments,services,cash,clientMeta,settings,products}`.
- **No se copian datos del sitio principal automáticamente.** Para migrar, exportar primero un respaldo desde el sitio principal y guardarlo, luego importar explícitamente desde Ajustes de la BETA. Probar antes con registros ficticios.
- La escritura utiliza transacciones que fusionan cambios por ID y rechazan conflictos de horarios encontrados durante el guardado. Una BETA aún requiere pruebas con dos teléfonos antes de usarla en producción.
- Al perder conexión o permisos, el indicador BETA muestra un error y bloquea nuevas interacciones para evitar continuar con cambios no sincronizados.
- Firestore limita cada documento a 1 MiB: fotos grandes incrustadas o demasiados registros requieren una futura migración por documentos individuales.

### Seguridad y límites
- No hacer públicas fotos privadas, teléfonos de clientes o copias de Firestore en GitHub.
- Este repositorio solo contiene código, configuración web pública de Firebase y un **fragmento** de reglas. Nunca incluir credenciales, contraseñas ni claves de servicio.
- No mezclar la BETA con la PWA actual hasta validar: acceso administrador; permisos denegados sin login; dos dispositivos; simultaneidad de turnos; caja; inventario; importación/restauración; cierre de sesión y uso sin internet.
- Los barberos siguen bloqueados en esta BETA hasta contar con reglas por rol y vistas restringidas de Caja.

### Diagnóstico
Si al ingresar aparece «Firestore no permitió leer», todavía faltan las reglas o la cuenta no tiene el perfil administrador esperado. No abrir permisos con `allow read, write: if true`.
