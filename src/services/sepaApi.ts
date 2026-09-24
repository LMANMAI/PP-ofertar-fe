const BACKEND_URL = "https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host";

export interface ComercioPrecioResponse {
	comercioId: string | null;
	bandera: string | null;
	razonSocial: string | null;
	precioMinimo: number | null;
	precioMaximo: number | null;
	cantidadSucursales: number;
}

export interface ProductoDetalleResponse {
	ean: string;
	/** El EAN está en el snapshot de SEPA. */
	encontrado: boolean;
	/** No hay ningún dato de precio para mostrar. */
	sinPrecios: boolean;
	/** "sepa" | "externo" | "ninguna" */
	fuenteDatos: string;
	descripcion: string | null;
	marca: string | null;
	imagenUrl: string | null;
	precioMinimo: number | null;
	precioPromedio: number | null;
	precioMaximo: number | null;
	cantidadOfertas: number;
	fechaDataset: string | null;
	comercios: ComercioPrecioResponse[];
}

/** Por qué falló la consulta, para que la pantalla diga algo distinto en cada caso. */
export type SepaErrorKind = "invalid" | "network" | "timeout" | "server";

export class SepaError extends Error {
	readonly kind: SepaErrorKind;
	constructor(kind: SepaErrorKind, message: string) {
		super(message);
		this.name = "SepaError";
		this.kind = kind;
	}
}

/** Sin esto, un servidor frío dejaba el spinner girando para siempre. */
const TIMEOUT_MS = 10_000;

async function getJson<T>(path: string): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	let response: Response;
	try {
		response = await fetch(`${BACKEND_URL}${path}`, {
			headers: { Accept: "application/json" },
			signal: controller.signal,
		});
	} catch {
		if (controller.signal.aborted) {
			throw new SepaError("timeout", "La búsqueda tardó demasiado. Probá de nuevo.");
		}
		throw new SepaError("network", "No hay conexión. Revisá tu internet e intentá de nuevo.");
	} finally {
		clearTimeout(timer);
	}

	if (!response.ok) {
		if (response.status === 400) {
			throw new SepaError("invalid", "Ese no es un código de barras válido.");
		}
		throw new SepaError("server", "No pudimos consultar el producto. Probá de nuevo.");
	}

	return response.json();
}

/**
 * Datos de un producto a partir del código de barras escaneado.
 *
 * El endpoint responde 200 aunque SEPA no conozca el EAN: en ese caso viene
 * `encontrado: false` con nombre e imagen resueltos desde proveedores
 * externos. Por eso acá solo se tira error ante fallas reales de red o del
 * servidor — el "no hay precios" es un estado normal que renderiza la pantalla.
 */
export function getProductoPorEan(ean: string): Promise<ProductoDetalleResponse> {
	return getJson<ProductoDetalleResponse>(`/sepa/productos/${encodeURIComponent(ean)}`);
}

/** Una sucursal con su precio de lista, y lo necesario para llegar. */
export interface SucursalPrecio {
	comercioId: string | null;
	banderaId: string | null;
	/** Nombre comercial de esa sucursal ("Jumbo"), no el del comercio dueño. */
	bandera: string | null;
	sucursalId: number;
	nombre: string | null;
	tipo: string | null;
	direccion: string | null;
	localidad: string | null;
	/** Código ISO de SEPA ("AR-C"). */
	provincia: string | null;
	latitud: number;
	longitud: number;
	distanciaKm: number;
	/** Precio de lista en ESA sucursal, no el mínimo de la cadena. */
	precio: number;
}

export interface SucursalesCercanas {
	ean: string;
	radioKm: number;
	/** Día al que corresponden los precios, "2026-09-18"; null si no hay dato. */
	fechaDataset: string | null;
	/** Una por cadena —la más barata dentro del radio—, de menor a mayor precio. */
	sucursales: SucursalPrecio[];
}

/**
 * De cada cadena, la sucursal más barata dentro de `radiusKm` del punto dado.
 * Lista vacía (no error) cuando no hay ninguna con precio en el radio, o cuando el
 * backend todavía no cargó las sucursales de SEPA.
 */
export function getSucursalesCercanas(
	ean: string,
	latitude: number,
	longitude: number,
	radiusKm: number,
): Promise<SucursalesCercanas> {
	const params = new URLSearchParams({
		lat: String(latitude),
		lng: String(longitude),
		radiusKm: String(radiusKm),
	});
	return getJson<SucursalesCercanas>(`/sepa/productos/${encodeURIComponent(ean)}/sucursales?${params}`);
}
