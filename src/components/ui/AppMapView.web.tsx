import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const PROVIDER_DEFAULT = undefined;

type MapViewProps = {
	style?: StyleProp<ViewStyle>;
	children?: ReactNode;
};

/** Same handle the native map exposes for the calls the screens make, so a
 * `ref` on it does not warn on web. */
type MapViewHandle = { animateToRegion: (...args: unknown[]) => void };

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ style }, ref) {
	useImperativeHandle(ref, () => ({ animateToRegion: () => {} }), []);
	return (
		<View style={[styles.placeholder, style]}>
			<Ionicons name="map-outline" size={28} color="#8A97A8" />
			<Text style={styles.text}>El mapa está disponible en la app móvil</Text>
		</View>
	);
});

export default MapView;

export function Marker(_props: Record<string, unknown>) {
	return null;
}

export function Circle(_props: Record<string, unknown>) {
	return null;
}

const styles = StyleSheet.create({
	placeholder: {
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#E7EBF0",
	},
	text: {
		fontSize: 12,
		color: "#8A97A8",
		textAlign: "center",
		paddingHorizontal: 24,
	},
});
