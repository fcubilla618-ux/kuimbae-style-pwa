# Kuimba'e Style — transición segura a perfiles (trabajo en rama)
Estado: fase 1 preparada en código; **NO desplegada y NO apta aún para uso real**.

## Qué quedó confirmado
- Administrador Kuimba'e: ingreso a BETA y turno de prueba persistente desde Chrome incógnito.
- Walter: `users/{uid}` con `role=barber`, `active=true`, `barberId=57bb2bf4-4eee-4cc1-8dd6-a2f8a4e0436e`.
- Dani y Junior tienen cuentas existentes; sus `barberId` aún requieren verificación contra `datasets/barbers.data`.
- BETA actual: `/shops/kuimbae-style/datasets/{name}` almacena LISTAS completas (turnos, caja, productos, servicios).
- No conceder NUNCA lectura de `datasets/appointments` o `datasets/cash` a barberos: el filtrado en pantalla no protege datos.
- `beta/firebase-sync.js` actualmente bloquea roles distintos de admin; no habilitar simplemente quitando esa línea.

## Archivos nuevos
- `beta/firestore.phase1.rules`: reglas candidatas V2, que conservan la política V1 del administrador; **requieren emulator y despliegue controlado**.
- `beta/firebase-v2-data.js`: perfil tomado desde Firestore, consultas de turnos/caja/ventas/servicios restringidas por `barberId`, inventario compartido; **todavía no conectado a la interfaz BETA**.

## Diseño V2 (bajo shops/kuimbae-style)
- `v2Appointments/{id}`: un turno por documento; `barberId` obligatorio.
- `v2Services/{id}`: un servicio/precio por barbero, `barberId` obligatorio.
- `v2Products/{id}`: catálogo e inventario comunes sin costo confidencial; lectura del personal, escrituras admin.
- `v2ProductCosts/{id}`: costo sólo admin.
- `v2Sales/{id}`: ventas inmutables con `barberId`, visibles sólo a su dueño y admin.
- `v2Cash/{id}`: movimientos inmutables con `barberId`, visibles sólo a su dueño y admin.

**Ventas**: usar una función del servidor autenticada para transacción atómica:
verifica `users/{uid}.barberId`, precio vigente, stock >= cantidad;
descuenta stock, crea UN registro de venta y UN movimiento de caja; las vistas
individual/general filtran/suman dichos registros, NO duplican dinero.

**Turnos**: antes de permitir escrituras simultáneas, resolver prevención de
solapamientos en el servidor (por barbero, fecha y hora/duración), no sólo en UI.
En la fase actual las reglas V2 para escribir turnos son un BORRADOR y no resuelven
solapamientos; por eso NO publicarlas todavía.

## Migración
1. Exportar respaldo del contenido V1 con admin y conservarlo fuera de la app.
2. Leer snapshots del origen, comprobar que cada registro tiene `id` único y
   `barberId` válido; **no borrar ni alterar las listas originales**.
3. Reescribir a nuevos documentos V2 con script de administración idempotente
   (no usar credenciales ni claves de servidor en GitHub Pages).
4. Comparar totales, fechas, caja, stock y datos de clientes entre V1/V2.
5. Conectar admin y Walter a V2 sólo en rama de desarrollo, nunca de golpe en principal.
6. Preparar pruebas con Dani y Junior; habilitar publicación tras pasar pruebas.

## Pruebas de aceptación (pendientes)
- Admin ve los tres turnos, servicios, precios, cajas y total general.
- Walter ve sus propios turnos/clientes/servicios y caja; no puede leer
  datos de Dani o Junior ni manipulando la consola o alterando solicitudes.
- Walter cambia sólo sus precios/turnos y NO puede cambiar precios ajenos.
- Admin crea turno de Walter => aparece en móvil de Walter casi en tiempo real.
- Walter no puede editar precio ni borrar productos generales.
- Dos barberos venden productos simultáneamente: stock nunca negativo,
  una venta sólo aparece en caja de su autor y una vez en total general.
- Turnos simultáneos en la misma franja se rechazan sin duplicaciones.
- Sin conexión / sesión caducada => no guardar cambios locales fingiendo sincronización.
- Las listas V1 permanecen protegidas y la BETA publicada sigue funcionando.
- Probar desde tablet, Android y Safari iPhone.

## Protección operacional
Mantener la aplicación actual y las reglas de producción sin cambios hasta aprobar
la migración, ejecutar el emulador y probar la rama contra un entorno de ensayo.
