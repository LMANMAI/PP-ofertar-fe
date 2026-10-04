# Prueba manual de la app (smoke test)

La app no tiene tests de interfaz: esta lista es la red de seguridad de los refactors (estado y navegación).
Correrla completa en un Android real antes de cada PR de las fases 2 y 3, y en un simulador de iOS al menos hasta el punto 6.
Anotar fecha, dispositivo y qué falló.

Ejecutar contra un backend con datos: un usuario con tickets procesados, ofertas cargadas y el snapshot de SEPA.

## 1. Sesión
- [ ] Registrarse con una cuenta nueva (con y sin código de invitación) y llegar a Inicio.
- [ ] Cerrar sesión y volver a entrar con email y contraseña.
- [ ] Contraseña incorrecta: mensaje claro, sin cerrar la app.
- [ ] Recuperar contraseña: pedir código, verificarlo, poner una nueva, entrar con ella.

## 2. Biometría
- [ ] Activar el desbloqueo biométrico tras iniciar sesión.
- [ ] Cerrar la app por completo, abrirla y desbloquear con huella o rostro.
- [ ] Cancelar la biometría y entrar con contraseña ("Iniciá sesión con tu contraseña").
- [ ] Sin conexión durante el desbloqueo: mensaje de conexión, sin borrar la sesión.

## 3. Inicio y Ofertas
- [ ] Inicio carga tarjetas de ofertas y el resumen.
- [ ] Ofertas: filtrar por cadena y categoría, paginar hasta el final.
- [ ] Abrir el detalle de una oferta y volver.

## 4. Tickets
- [ ] Escanear un ticket con la cámara (una y varias fotos) y verlo aparecer en el historial.
- [ ] Subir un PDF de un ticket.
- [ ] Ticket procesado: revisar, corregir un ítem y confirmar; queda de solo lectura.
- [ ] Detalle de un ticket viejo; eliminar un ticket.
- [ ] Análisis mensual y productos recurrentes cargan datos.
- [ ] Error de subida (modo avión): pantalla de error y reintento.

## 5. Códigos de barras y precios
- [ ] Escanear un código que está en SEPA: muestra precios y comercios.
- [ ] Escanear uno que no está: dice que no hay precios, sin error.
- [ ] Comparar precios y ver la sucursal más barata cerca (pedir ubicación).
- [ ] Mis tiendas favoritas: cambiar cadenas y radio, y que persista.

## 6. Puntos
- [ ] Ver el saldo y el historial.
- [ ] Canjear una recompensa: confirmación, éxito y saldo actualizado.
- [ ] Canje con saldo insuficiente: mensaje del backend.

## 7. Perfil
- [ ] Cambiar foto de perfil (cámara y galería) y quitarla.
- [ ] Cambiar nombre y correo (pide la contraseña actual).
- [ ] Cambiar contraseña: al terminar la app sigue con la sesión abierta.
- [ ] Activar y desactivar las notificaciones de ofertas.
- [ ] Cerrar sesión: al entrar con otra cuenta no queda nada de la anterior (puntos, ofertas, tickets).

## 8. Navegación
- [ ] Botón físico "atrás" de Android en cada pantalla: vuelve a la anterior y nunca cierra la app salvo en Inicio.
- [ ] Cambiar entre las pestañas de la barra inferior y volver.
- [ ] Rotar o pasar la app a segundo plano y volver: se mantiene la pantalla.

## 9. Notificaciones push (con la app cerrada y abierta)
- [ ] Ticket procesado → abre el detalle del ticket.
- [ ] Puntos → abre el historial de puntos.
- [ ] Recordatorio de historial → abre el historial de tickets.
- [ ] Recordatorio de escaneo → abre la captura.
- [ ] Ofertas → abre Ofertas.
