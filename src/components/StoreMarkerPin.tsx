import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChainMarkerPin } from "./ui/ChainMarkerPin";
import { useIsDarkMode } from "../theme/designSystem";
import { CLOSED_BADGE, CLOSED_MARKER_SIZE, OPEN_MARKER_SIZE, markerHaloColorFor } from "./storeMarkerStatus";

type Props = {
	chainSlug: string;
	chainName?: string;
	/** Cerrada con certeza. Una sucursal sin horario se dibuja como abierta: no se sabe. */
	closed: boolean;
};

/** El pin de cadena de siempre; si la sucursal está cerrada, más chico y con una luna. */
export function StoreMarkerPin({ chainSlug, chainName, closed }: Props) {
	const isDark = useIsDarkMode();
	if (!closed) return <ChainMarkerPin chainSlug={chainSlug} chainName={chainName} size={OPEN_MARKER_SIZE} withPointer />;
	return (
		<View style={styles.wrap} pointerEvents="none">
			<ChainMarkerPin chainSlug={chainSlug} chainName={chainName} size={CLOSED_MARKER_SIZE} withPointer />
			<View
				style={[
					styles.badge,
					{ backgroundColor: CLOSED_BADGE.fill, borderColor: markerHaloColorFor(isDark) },
				]}
			>
				<Ionicons name="moon" size={CLOSED_BADGE.size - 6} color={CLOSED_BADGE.glyph} accessible={false} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	// Lugar para que la marca asome sin que el mapa la recorte.
	wrap: { paddingTop: 4, paddingRight: 6 },
	badge: {
		position: "absolute",
		top: 0,
		right: 0,
		width: CLOSED_BADGE.size,
		height: CLOSED_BADGE.size,
		borderRadius: CLOSED_BADGE.size / 2,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
});
