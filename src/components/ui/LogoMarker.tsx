import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import type { MapMarker } from "react-native-maps";
import { Marker } from "./AppMapView";

type Props = Omit<ComponentProps<typeof Marker>, "children"> & {
	/** El pin; recibe el callback que hay que llamar cuando termina de cargar el logo. */
	children: (onLogoLoad: () => void) => ReactNode;
};

/**
 * Un `Marker` cuyo pin lleva una imagen (el logo de la cadena).
 *
 * En Android el pin no es una vista viva: react-native-maps le saca una foto al
 * hacer el layout y dibuja ese bitmap. El logo carga después (Fresco es
 * asíncrono), y como cargar una imagen no cambia el tamaño de nada, la foto no
 * se repite: el pin quedaba con el aro de color y el centro vacío. Por eso, cuando
 * el logo avisa que cargó, se pide `redraw()` y la foto se vuelve a sacar con la
 * imagen ya pintada. En iOS y web `redraw` no hace falta, pero no molesta.
 */
export function LogoMarker({ children, ...markerProps }: Props) {
	const ref = useRef<MapMarker>(null);
	// Cuántas veces avisó el logo que cargó; el efecto de abajo redibuja en cada aviso.
	const [logoLoads, setLogoLoads] = useState(0);
	const onLogoLoad = useCallback(() => setLogoLoads((n) => n + 1), []);

	useEffect(() => {
		if (logoLoads === 0) return;
		// Dos intentos: el primero apenas se pinta el frame siguiente; el segundo
		// por si el decode terminó un poco más tarde en un teléfono lento.
		const ids = [50, 400].map((delay) => setTimeout(() => ref.current?.redraw?.(), delay));
		return () => ids.forEach(clearTimeout);
	}, [logoLoads]);

	return (
		<Marker ref={ref} {...markerProps}>
			{children(onLogoLoad)}
		</Marker>
	);
}
