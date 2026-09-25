/** Password recovery needs the backend to send email (SMTP + a verified
 * domain, see PP-ofertar application.properties). Until that exists the
 * screen says so instead of promising a code that never arrives. Set to true
 * once mail is configured in production. */
export const PASSWORD_RECOVERY_ENABLED = false;
