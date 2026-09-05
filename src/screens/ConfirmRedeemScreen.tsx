import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { ConfirmSheet } from "../components";
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
			<ConfirmSheet
				icon={reward.icon}
				iconTone="info"
				title="Confirmar"
				subtitle={
					<>
						Vas a usar tus puntos en <Text style={styles.bold}>{reward.title}</Text>.
					</>
				}
				confirmLabel="Confirmar"
				onConfirm={onConfirm}
				confirmDisabled={!canConfirm}
				cancelLabel="Cancelar"
				onCancel={onCancel}
			>
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
			</ConfirmSheet>
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
	bold: { color: colors.defaultText, fontFamily: typography.family.medium },
	statsRow: { flexDirection: "row", gap: space.smPlus, marginTop: space.xsPlus },
	stat: { flex: 1, backgroundColor: colors.navy, borderRadius: 12, padding: space.mdPlus, alignItems: "center" },
	statLabel: { color: colors.navyMutedText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	statValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 18, marginTop: space.xs },
	warningBox: { flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: colors.warningSoft, padding: space.smPlus, borderRadius: 10 },
	warningBoxDanger: { backgroundColor: colors.dangerSoft },
	warningText: { flex: 1, color: colors.warningSoftText, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	});
}
