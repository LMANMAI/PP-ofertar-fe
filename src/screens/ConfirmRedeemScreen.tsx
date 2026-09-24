import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";
import { ConfirmSheet, InlineNotice } from "../components";
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
			<StatusBar style="light" />
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
					<InlineNotice variant="warning" icon="information-circle-outline" message="Una vez confirmado, los puntos no se pueden devolver." />
				) : (
					<InlineNotice icon="alert-circle-outline" live={false} message="No te alcanzan los puntos todavía." />
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
	stat: { flex: 1, backgroundColor: colors.navy, borderRadius: radii.md, padding: space.mdPlus, alignItems: "center" },
	statLabel: { color: colors.navyMutedText, fontFamily: typography.family.medium, fontSize: typography.sizes.tiny, letterSpacing: 1 },
	statValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 18, marginTop: space.xs },
	});
}
