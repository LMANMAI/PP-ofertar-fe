/** Password recovery needs the backend to send email (SMTP + a verified
 * domain, see PP-ofertar application.properties). Until that exists the
 * screen says so instead of promising a code that never arrives. Set to true
 * once mail is configured in production. */
export const PASSWORD_RECOVERY_ENABLED = false;

/** Promos bancarias y Mis tarjetas contra datos de prueba en memoria
 * (`services/bankPromosMock.ts`) en vez del backend, mientras los endpoints del
 * SPEC §4 no estén desplegados. Se prende con EXPO_PUBLIC_BANK_PROMOS_MOCK=1; sin
 * la variable la app usa el backend real. */
export const BANK_PROMOS_MOCK = process.env.EXPO_PUBLIC_BANK_PROMOS_MOCK === "1";
