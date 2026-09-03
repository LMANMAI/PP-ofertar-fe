import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useIsDarkMode, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { ensureLocationPermission } from "../location/permission";

/** `granted` is what the OS answered, not what the user tapped: the screen
 * moves on either way, but the caller needs to know whether the permission
 * was actually obtained. */
type Props = { onAllow: (granted: boolean) => void; onSkip: () => void };

export function LocationPermissionScreen({ onAllow, onSkip }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [asking, setAsking] = useState(false);

	const handleAllow = async () => {
		if (asking) return;
		setAsking(true);
		const { granted } = await ensureLocationPermission();
		setAsking(false);
		onAllow(granted);
	};
	return (
		<View style={[styles.safeArea, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
			<StatusBar style={isDark ? "light" : "dark"} translucent />
			<View style={styles.content}>
				<View style={styles.iconWrap}>
					<Ionicons name="location" size={56} color={colors.cyan} />
				</View>
				<Text style={styles.title}>Activá tu ubicación</Text>
				<Text style={styles.body}>
					Para mostrarte ofertas y tiendas cerca tuyo, necesitamos acceder a tu ubicación.
				</Text>

				<View style={styles.featuresCard}>
					<Feature icon="navigate-outline" text="Tiendas cerca tuyo en tiempo real" />
					<Feature icon="pricetag-outline" text="Ofertas filtradas por zona" />
					<Feature icon="walk-outline" text="Distancias y rutas exactas" />
				</View>
			</View>

			<View style={styles.footer}>
				<Pressable style={styles.primaryBtn} onPress={handleAllow} disabled={asking}>
					{asking ? (
						<ActivityIndicator color={colors.buttonText} />
					) : (
						<Text style={styles.primaryText}>Permitir ubicación</Text>
					)}
				</Pressable>
				<Pressable style={styles.skipBtn} onPress={onSkip}>
					<Text style={styles.skipText}>Más tarde</Text>
				</Pressable>
			</View>
		</View>
	);
}

function Feature({ icon, text }: { icon: any; text: string }) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.featureRow}>
			<Ionicons name={icon} size={18} color={colors.cyan} />
			<Text style={styles.featureText}>{text}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.xxl },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.mdPlus },
	iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 24, textAlign: "center" },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center", lineHeight: 20 },
	featuresCard: { backgroundColor: colors.card, borderRadius: 14, padding: space.lg, gap: space.md, width: "100%", marginTop: 18, borderWidth: 1, borderColor: colors.divider },
	featureRow: { flexDirection: "row", alignItems: "center", gap: space.smPlus },
	featureText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: 13 },
	footer: { gap: space.sm },
	primaryBtn: { backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	primaryText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	skipBtn: { height: 44, alignItems: "center", justifyContent: "center" },
	skipText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
	});
}
