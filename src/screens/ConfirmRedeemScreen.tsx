import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Reward } from "../data/rewards";

type Props = {
	reward: Reward;
	pointsBalance: number;
	onCancel: () => void;
	onConfirm: () => void;
};

export function ConfirmRedeemScreen({ reward, pointsBalance, onCancel, onConfirm }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const remaining = pointsBalance - reward.points;
	const canConfirm = remaining >= 0;

	return (
		<View style={[styles.backdrop, { paddingTop: insets.top }]}>
			<StatusBar style="light" translucent />
			<View style={styles.sheet}>
				<View style={styles.iconCircle}>
					<Ionicons name={reward.icon} size={28} color={colors.infoSoftText} />
				</View>
				<Text style={styles.title}>Confirmar</Text>
				<Text style={styles.subtitle}>
					Vas a usar tus puntos en <Text style={styles.bold}>{reward.title}</Text>.
				</Text>

				<View style={styles.statsRow}>
					<Stat label="USAS" value={`${reward.points.toLocaleString("es-AR")} pts`} tone="navy" colors={colors} styles={styles} />
					<Stat label="QUEDA" value={`${remaining.toLocaleString("es-AR")} pts`} tone="cyan" colors={colors} styles={styles} />
				</View>

				{canConfirm ? (
					<View style={styles.warningBox}>
						<Ionicons name="information-circle-outline" size={16} color={colors.warningSoftText} />
						<Text style={styles.warningText}>
							Una vez confirmado, los puntos no se pueden devolver.
						</Text>
					</View>
				) : (
					<View style={[styles.warningBox, styles.warningBoxDanger]}>
						<Ionicons name="alert-circle-outline" size={16} color={colors.dangerSoftText} />
						<Text style={[styles.warningText, { color: colors.dangerSoftText }]}>
							No te alcanzan los puntos todavía.
						</Text>
					</View>
				)}

				<Pressable
					style={[styles.confirmBtn, !canConfirm && { opacity: 0.5 }]}
					onPress={canConfirm ? onConfirm : undefined}
					accessibilityRole="button"
					accessibilityState={{ disabled: !canConfirm }}
				>
					<Text style={styles.confirmText}>Confirmar</Text>
				</Pressable>
				<Pressable style={styles.cancelBtn} onPress={onCancel}>
					<Text style={styles.cancelText}>Cancelar</Text>
				</Pressable>
			</View>
		</View>
	);
}

function Stat({
	label,
	value,
	tone,
	colors,
	styles,
}: {
	label: string;
	value: string;
	tone: "navy" | "cyan";
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<View style={[styles.stat, tone === "cyan" && { backgroundColor: colors.infoSoft }]}>
			<Text style={[styles.statLabel, tone === "cyan" && { color: colors.infoSoftText }]}>{label}</Text>
			<Text style={[styles.statValue, tone === "cyan" && { color: colors.infoSoftText }]}>{value}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(10,31,68,0.7)", justifyContent: "center", paddingHorizontal: space.xl },
	sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 22, gap: space.md, alignItems: "stretch" },
	iconCircle: { alignSelf: "center", width: 60, height: 60, borderRadius: 30, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
	title: { textAlign: "center", color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 20, marginTop: space.xs },
	subtitle: { textAlign: "center", color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20 },
	bold: { color: colors.defaultText, fontFamily: typography.family.medium },
	statsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
	stat: { flex: 1, backgroundColor: colors.navy, borderRadius: 12, padding: 14, alignItems: "center" },
	statLabel: { color: "#99B2CC", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	statValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 18, marginTop: space.xs },
	warningBox: { flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: colors.warningSoft, padding: 10, borderRadius: 10 },
	warningBoxDanger: { backgroundColor: colors.dangerSoft },
	warningText: { flex: 1, color: colors.warningSoftText, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	confirmBtn: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: space.sm },
	confirmText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
	cancelText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
	});
}
