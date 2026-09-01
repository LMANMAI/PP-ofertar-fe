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

/**
 * Datos de un producto a partir del código de barras escaneado.
 *
 * El endpoint responde 200 aunque SEPA no conozca el EAN: en ese caso viene
 * `encontrado: false` con nombre e imagen resueltos desde proveedores
 * externos. Por eso acá solo se tira error ante fallas reales de red o del
 * servidor — el "no hay precios" es un estado normal que renderiza la pantalla.
 */
export async function getProductoPorEan(
	ean: string,
): Promise<ProductoDetalleResponse> {
	const response = await fetch(
		`${BACKEND_URL}/sepa/productos/${encodeURIComponent(ean)}`,
		{ headers: { Accept: "application/json" } },
	);

	if (!response.ok) {
		if (response.status === 400) {
			throw new Error("El código escaneado no es un código de barras válido.");
		}
		throw new Error("No pudimos consultar el producto. Probá de nuevo.");
	}

	return response.json();
}
