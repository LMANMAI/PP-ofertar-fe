import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = {
	errorMessage?: string;
	onRetry: () => void;
	onManualEntry: () => void;
	onSeeOffers: () => void;
	onBack: () => void;
};

export function ScanErrorScreen({
	errorMessage,
	onRetry,
	onManualEntry,
	onSeeOffers,
	onBack,
}: Props) {
	const insets = useSafeAreaInsets();

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Ticket procesado</Text>
				<View style={{ width: 32 }} />
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.errorCard}>
					<Ionicons name="close-circle-outline" size={64} color="#E76F51" />
					<Text style={styles.errorTitle}>No pudimos leer el ticket</Text>
					<Text style={styles.errorBody}>
						{errorMessage
							? errorMessage
							: "El ticket puede estar arrugado, muy iluminado o fuera de foco. Intentá de nuevo."}
					</Text>
				</View>

				<View style={styles.tipsCard}>
					<Text style={styles.tipsTitle}>Consejos para un buen escaneo</Text>
					<Tip text="Poné el ticket sobre una superficie plana" />
					<Tip text="Asegurate de tener buena iluminación" />
					<Tip text="Encuadrá el ticket completo en la pantalla" />
					<Tip text="Evitá que el ticket esté doblado o mojado" />
				</View>

				<Pressable style={styles.primaryButton} onPress={onRetry}>
					<Ionicons name="camera-outline" size={18} color={colors.buttonText} />
					<Text style={styles.primaryButtonText}>Volver a escanear</Text>
				</Pressable>

				<Pressable style={styles.secondaryButton} onPress={onManualEntry}>
					<Text style={styles.secondaryButtonText}>
						Ingresar productos manualmente
					</Text>
				</Pressable>

				<Pressable style={styles.supportButton}>
					<Text style={styles.supportText}>
						¿Seguís con problemas? Contactar soporte
					</Text>
				</Pressable>

				<Pressable style={styles.altPrimaryButton} onPress={onSeeOffers}>
					<Text style={styles.altPrimaryText}>Ver dónde ahorrar</Text>
					<Ionicons name="arrow-forward" size={16} color={colors.buttonText} />
				</Pressable>
			</ScrollView>
		</View>
	);
}

function Tip({ text }: { text: string }) {
	return (
		<View style={styles.tipRow}>
			<Ionicons name="checkmark" size={14} color="#9A3412" />
			<Text style={styles.tipText}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	scroll: { flex: 1 },
	scrollContent: { paddingHorizontal: 20, paddingTop: 22, gap: 18 },
	errorCard: {
		backgroundColor: colors.card,
		borderRadius: 16,
		paddingVertical: 28,
		paddingHorizontal: 22,
		alignItems: "center",
		gap: 10,
		borderWidth: 1,
		borderColor: colors.border,
	},
	errorTitle: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 17,
		textAlign: "center",
		marginTop: 6,
	},
	errorBody: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
		textAlign: "center",
	},
	tipsCard: {
		backgroundColor: "#FFF7ED",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#FED7AA",
		padding: 16,
		gap: 8,
	},
	tipsTitle: {
		color: "#9A3412",
		fontFamily: typography.family.bold,
		fontSize: 13,
		marginBottom: 4,
	},
	tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	tipText: {
		flex: 1,
		color: "#9A3412",
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
	},
	primaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
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
		fontSize: 14,
	},
	supportButton: { alignItems: "center", paddingVertical: 8 },
	supportText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
	altPrimaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	altPrimaryText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
});
