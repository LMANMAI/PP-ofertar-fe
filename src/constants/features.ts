/** Password recovery needs the backend to send email (SMTP, see PP-ofertar
 * application.properties). Without it the screen says so instead of promising a
 * code that never arrives, so turn this off if mail stops being configured. */
export const PASSWORD_RECOVERY_ENABLED = true;

/** Promos bancarias y Mis tarjetas contra datos de prueba en memoria
 * (`services/bankPromosMock.ts`) en vez del backend, mientras los endpoints del
 * SPEC §4 no estén desplegados. Se prende con EXPO_PUBLIC_BANK_PROMOS_MOCK=1; sin
 * la variable la app usa el backend real. */
export const BANK_PROMOS_MOCK = process.env.EXPO_PUBLIC_BANK_PROMOS_MOCK === "1";
