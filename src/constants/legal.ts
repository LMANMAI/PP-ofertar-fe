import { API_BASE_URL } from "../config";

/** One PDF covers both the terms and the privacy policy. It lives in the
 * backend's static resources (src/main/resources/static/legal), so replacing
 * it means redeploying the backend, not shipping a new app version. */
export const TERMS_URL = `${API_BASE_URL}/legal/terminos-y-condiciones.pdf`;
