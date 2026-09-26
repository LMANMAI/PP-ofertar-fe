/**
 * URL base del backend, en un solo lugar. Para apuntar a otro entorno sin tocar
 * código: definir EXPO_PUBLIC_API_URL (Expo la incorpora al bundle al compilar).
 */
export const API_BASE_URL: string =
	process.env.EXPO_PUBLIC_API_URL ?? "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";
