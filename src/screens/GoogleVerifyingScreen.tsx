import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Props = { onDone: () => void };

export function GoogleVerifyingScreen({ onDone }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	useEffect(() => {
		const t = setTimeout(onDone, 1800);
		return () => clearTimeout(t);
	}, [onDone]);

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
			<StatusBar style="dark" translucent />
			<View style={styles.content}>
				<Ionicons name="logo-google" size={56} color="#4285F4" />
				<ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 24 }} />
				<Text style={styles.title}>Verificando…</Text>
				<Text style={styles.subtitle}>Estamos validando tu cuenta de Google</Text>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, marginTop: 18 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13 },
	});
}
