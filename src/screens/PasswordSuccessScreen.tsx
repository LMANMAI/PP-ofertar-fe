import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Props = { onGoToLogin: () => void };

export function PasswordSuccessScreen({ onGoToLogin }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={[styles.safeArea, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
			<StatusBar style="dark" translucent />
			<View style={styles.content}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={48} color={colors.success} />
				</View>
				<Text style={styles.title}>¡Contraseña actualizada!</Text>
				<Text style={styles.body}>
					Ya podés ingresar a OfertAR con tu nueva contraseña.
				</Text>
			</View>
			<Pressable style={styles.cta} onPress={onGoToLogin}>
				<Text style={styles.ctaText}>Ir a iniciar sesión</Text>
			</Pressable>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
	checkCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.success, alignItems: "center", justifyContent: "center" },
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 24, textAlign: "center", marginTop: 12 },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center", lineHeight: 20 },
	cta: { backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	});
}
