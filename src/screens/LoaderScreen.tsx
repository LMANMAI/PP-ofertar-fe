import { useEffect } from "react";
import {
	ActivityIndicator,
	Image,
	StyleSheet,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme/designSystem";

type Props = {
	onDone: () => void;
	durationMs?: number;
};

export function LoaderScreen({ onDone, durationMs = 1500 }: Props) {
	const insets = useSafeAreaInsets();

	useEffect(() => {
		const t = setTimeout(onDone, durationMs);
		return () => clearTimeout(t);
	}, [onDone, durationMs]);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="dark" translucent />
			<View style={[styles.center, { paddingBottom: insets.bottom }]}>
				<Image
					source={require("../../assets/logo_ofertar.png")}
					style={styles.logo}
				/>
				<ActivityIndicator size="large" color={colors.cyan} style={styles.spinner} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.card },
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.card,
	},
	logo: { width: 72, height: 72, borderRadius: 12 },
	spinner: { marginTop: 24 },
});
