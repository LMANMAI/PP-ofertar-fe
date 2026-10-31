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
- [ ] Tras escanear un producto, "Seguir": pasa a "Siguiendo" (la primera vez pide el permiso de notificaciones) y aparece en Productos que seguís; tocar "Siguiendo" lo deja de seguir.
- [ ] Productos que seguís (desde Inicio y desde Perfil): muestra cuáles están en promo y dónde; dejar de seguir uno lo saca de la lista; "Ver precios" y volver deja de nuevo en Productos que seguís; "atrás" vuelve a Inicio o a Perfil, según de dónde se vino. Con las notificaciones de ofertas apagadas en Perfil, lo avisa arriba.
- [ ] Un producto sin nombre (código que no está en SEPA ni en los proveedores) no ofrece "Seguir".
- [ ] Leer con la cámara un código corto (UPC-E de 6 dígitos): muestra lo que haya del producto pero no ofrece "Seguir"; uno de 8 a 14 dígitos sí.
- [ ] Productos que seguís vacío → "Escanear un producto" → "atrás" en el escáner vuelve a Productos que seguís (no a Inicio). Seguir uno en el escáner y volver: ya aparece en la lista, sin deslizar para recargar.
- [ ] Comparar → escanear un código → "atrás" vuelve a Comparar; desde el escáner, Mis tiendas favoritas → "atrás" vuelve al escáner y su "atrás" sigue llevando a donde se lo abrió.
- [ ] Seguir un producto que también aparece en un ticket escaneado (antes o después): en Productos recurrentes y en "Para tu próxima compra" de Inicio sale una sola vez, con la marca "Lo seguís"; dejar de seguirlo saca la marca al volver a esas pantallas.
- [ ] El mismo producto leído como GTIN-14 (con un 0 adelante) y como EAN-13: el escáner muestra "Siguiendo" en los dos casos y no se duplica en Productos que seguís.
- [ ] En Productos que seguís, uno que está en algún ticket muestra "Lo compraste el 12 de octubre" (con el año si no es el actual); uno que nunca se compró no muestra esa línea.
- [ ] Sin red al abrir la app (los seguidos no cargan), recuperar la red y seguir un producto: los que ya se seguían siguen apareciendo como "Siguiendo" en el escáner.

## 6. Puntos
- [ ] Ver el saldo y el historial.
- [ ] Canjear una recompensa: confirmación, éxito y saldo actualizado.
- [ ] Canje con saldo insuficiente: mensaje del backend.

## 7. Perfil
- [ ] Cambiar foto de perfil (cámara y galería) y quitarla.
- [ ] Cambiar nombre y correo (pide la contraseña actual).
- [ ] Cambiar contraseña: al terminar la app sigue con la sesión abierta.
- [ ] Activar y desactivar las notificaciones de ofertas.
- [ ] Cerrar sesión: al entrar con otra cuenta no queda nada de la anterior (puntos, ofertas, tickets, productos seguidos).

## 8. Navegación
- [ ] Botón físico "atrás" de Android en cada pantalla: vuelve a la pantalla anterior (la de la que se vino) y solo en Inicio cierra la app.
- [ ] Los botones "Volver" de la pantalla llevan a donde corresponde: detalle de oferta a donde se abrió, detalle de ticket al historial, canje a Puntos, Comparar a la revisión del ticket.
- [ ] Cambiar entre las pestañas de la barra inferior (Inicio, Ofertas, Tickets, Perfil y el botón de escaneo) y volver; la pestaña marcada es la correcta, también después de subir un ticket.
- [ ] En web/tablet o con el tema oscuro, el cambio de pantalla no muestra destellos blancos.
- [ ] Rotar o pasar la app a segundo plano y volver: se mantiene la pantalla.

## 9. Notificaciones push (con la app cerrada y abierta)
- [ ] Ticket procesado → abre el detalle del ticket.
- [ ] Puntos → abre el historial de puntos.
- [ ] Recordatorio de historial → abre el historial de tickets.
- [ ] Recordatorio de escaneo → abre la captura.
- [ ] Ofertas → abre Ofertas.
- [ ] Producto seguido en promo → abre Productos que seguís, con la promo a la vista.
- [ ] Tocar una notificación con la sesión cerrada no rompe nada (se ignora).
