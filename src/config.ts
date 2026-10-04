/**
 * URL base del backend, en un solo lugar. Para apuntar a otro entorno sin tocar
 * código: definir EXPO_PUBLIC_API_URL (Expo la incorpora al bundle al compilar).
 */
export const API_BASE_URL: string =
	process.env.EXPO_PUBLIC_API_URL ?? "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

/**
 * Qué hacer cuando una respuesta del backend no cumple el contrato (src/api/schemas.ts):
 *  - "report": se deja constancia en el log y se usan los datos tal cual llegaron (el valor por defecto
 *    mientras se confirma en uso real que no hay falsos positivos).
 *  - "strict": se rechaza con ApiContractError, con el endpoint y el campo que no coincide.
 * Se cambia con EXPO_PUBLIC_CONTRACT_MODE=strict.
 */
export const CONTRACT_MODE: "report" | "strict" =
	process.env.EXPO_PUBLIC_CONTRACT_MODE === "strict" ? "strict" : "report";
