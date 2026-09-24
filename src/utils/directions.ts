/**
 * El enlace que abre la navegación hasta un punto, según la plataforma.
 *
 * Son https y no esquemas propios (maps://, geo:): abren la app de mapas
 * instalada si existe y si no, el navegador, sin que la app tenga que declarar
 * qué esquemas consulta ni verificar antes si el teléfono los soporta.
 */
export function directionsUrl(platform: string, latitude: number, longitude: number): string {
	const destino = `${latitude},${longitude}`;
	if (platform === "ios") {
		return `https://maps.apple.com/?daddr=${destino}&dirflg=d`;
	}
	return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}
