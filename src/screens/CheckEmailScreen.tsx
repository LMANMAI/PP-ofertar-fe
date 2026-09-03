import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Props = { email?: string; onBack: () => void; onOpenChange: () => void };

export function CheckEmailScreen({ email = "tu correo", onBack, onOpenChange }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<View style={styles.content}>
				<View style={styles.iconCircle}>
					<Ionicons name="mail-outline" size={40} color={colors.cyan} />
				</View>
				<Text style={styles.title}>Revisá tu correo</Text>
				<Text style={styles.body}>
					Te enviamos un enlace a <Text style={styles.bold}>{email}</Text> para cambiar tu contraseña.
				</Text>

				<View style={styles.hint}>
					<Ionicons name="information-circle-outline" size={16} color={colors.warningSoftText} />
					<Text style={styles.hintText}>
						Si no lo ves, revisá la carpeta de spam o correo no deseado.
					</Text>
				</View>

				<Pressable style={styles.cta} onPress={onOpenChange}>
					<Text style={styles.ctaText}>Ya recibí el enlace</Text>
				</Pressable>
				<Pressable style={styles.resend}>
					<Text style={styles.resendText}>Reenviar enlace</Text>
				</Pressable>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: space.md, justifyContent: "center" },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	content: { flex: 1, padding: space.xxl, alignItems: "center", gap: space.sm },
	iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center", marginTop: 32 },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 24, textAlign: "center", marginTop: space.mdPlus },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center", lineHeight: 22 },
	bold: { color: colors.defaultText, fontFamily: typography.family.medium },
	hint: { flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: colors.warningSoft, padding: space.md, borderRadius: 10, marginTop: space.lg },
	hintText: { flex: 1, color: colors.warningSoftText, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	cta: { marginTop: space.xl, backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", width: "100%" },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	resend: { padding: space.md },
	resendText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 14, textDecorationLine: "underline" },
	});
}
