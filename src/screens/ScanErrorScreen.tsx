import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";

type Props = {
	errorMessage?: string;
	onRetry: () => void;
	onSeeOffers: () => void;
	onBack: () => void;
};

export function ScanErrorScreen({
	errorMessage,
	onRetry,
	onSeeOffers,
	onBack,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Ticket de compra" onBack={onBack} />

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.errorCard}>
					<Ionicons name="close-circle-outline" size={64} color={colors.orange} />
					<Text style={styles.errorTitle}>No pudimos leer el ticket</Text>
					<Text style={styles.errorBody}>
						{errorMessage
							? errorMessage
							: "El ticket puede estar arrugado, muy iluminado o fuera de foco. Intentá de nuevo."}
					</Text>
				</View>

				<View style={styles.tipsCard}>
					<Text style={styles.tipsTitle}>Consejos para un buen escaneo</Text>
					<Tip text="Poné el ticket sobre una superficie plana" colors={colors} styles={styles} />
					<Tip text="Asegurate de tener buena iluminación" colors={colors} styles={styles} />
					<Tip text="Encuadrá el ticket completo en la pantalla" colors={colors} styles={styles} />
					<Tip text="Evitá que el ticket esté doblado o mojado" colors={colors} styles={styles} />
				</View>

				<Pressable style={styles.primaryButton} onPress={onRetry}>
					<Ionicons name="camera-outline" size={18} color={colors.buttonText} />
					<Text style={styles.primaryButtonText}>Volver a escanear</Text>
				</Pressable>

				<Pressable style={styles.secondaryButton} onPress={onSeeOffers}>
					<Text style={styles.secondaryButtonText}>Ver dónde ahorrar mientras tanto</Text>
				</Pressable>

				<Pressable
					style={styles.supportButton}
					onPress={() =>
						Linking.openURL(
							"mailto:soporte@ofertar.app?subject=Ayuda%20con%20escaneo%20de%20ticket",
						)
					}
				>
					<Text style={styles.supportText}>
						¿Seguís con problemas? Contactar soporte
					</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

function Tip({ text, colors, styles }: { text: string; colors: ColorTokens; styles: ReturnType<typeof createStyles> }) {
	return (
		<View style={styles.tipRow}>
			<Ionicons name="ellipse" size={6} color={colors.warningSoftText} />
			<Text style={styles.tipText}>{text}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	scrollContent: { paddingHorizontal: space.xl, paddingTop: 22, gap: 18 },
	errorCard: {
		backgroundColor: colors.card,
		borderRadius: radii.lg,
		paddingVertical: 28,
		paddingHorizontal: 22,
		alignItems: "center",
		gap: space.smPlus,
		borderWidth: 1,
		borderColor: colors.border,
	},
	errorTitle: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.bodyL,
		textAlign: "center",
		marginTop: space.xsPlus,
	},
	errorBody: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: 18,
		textAlign: "center",
	},
	tipsCard: {
		backgroundColor: colors.warningSoft,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#FED7AA",
		padding: space.lg,
		gap: space.sm,
	},
	tipsTitle: {
		color: colors.warningSoftText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.caption,
		marginBottom: space.xs,
	},
	tipRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
	tipText: {
		flex: 1,
		color: colors.warningSoftText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: 18,
	},
	primaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: space.sm,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
	},
	supportButton: { alignItems: "center", paddingVertical: space.sm },
	supportText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
	},
	});
}
