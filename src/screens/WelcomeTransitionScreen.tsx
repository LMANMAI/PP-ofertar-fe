import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Props = { onDone: () => void; name?: string };

export function WelcomeTransitionScreen({ onDone, name = "Martina" }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	useEffect(() => {
		const t = setTimeout(onDone, 1800);
		return () => clearTimeout(t);
	}, [onDone]);
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.center}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={48} color={colors.cyan} />
				</View>
				<Text style={styles.title}>¡Te damos la bienvenida, {name}!</Text>
				<Text style={styles.subtitle}>Estamos preparando OfertAR para vos</Text>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	statusBarBg: { backgroundColor: colors.navy },
	center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
	checkCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.cyan, alignItems: "center", justifyContent: "center" },
	title: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 24, marginTop: space.md },
	subtitle: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 14 },
	});
}
