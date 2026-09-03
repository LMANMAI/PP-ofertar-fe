import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useThemeColors } from "../../theme/designSystem";

/** The centered small spinner every data-fetching screen shows while its
 * first request is in flight. Fills the available space by default — pass
 * `fill={false}` for the rare case it sits inside a fixed-height area. */
export function LoadingState({ fill = true }: { fill?: boolean }) {
	const colors = useThemeColors();
	return (
		<View style={[styles.wrap, fill && styles.fill]}>
			<ActivityIndicator size="small" color={colors.cyan} />
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { alignItems: "center", justifyContent: "center" },
	fill: { flex: 1 },
});
