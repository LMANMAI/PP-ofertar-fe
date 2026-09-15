import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const PROVIDER_DEFAULT = undefined;

type MapViewProps = {
	style?: StyleProp<ViewStyle>;
	children?: ReactNode;
};

export default function MapView({ style }: MapViewProps) {
	return (
		<View style={[styles.placeholder, style]}>
			<Ionicons name="map-outline" size={28} color="#8A97A8" />
			<Text style={styles.text}>El mapa está disponible en la app móvil</Text>
		</View>
	);
}

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
