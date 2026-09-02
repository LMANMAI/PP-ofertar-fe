import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import type { Reward } from "../data/rewards";
import { SALDO_PUNTOS } from "../data/rewards";

type Props = { reward: Reward; onCancel: () => void; onConfirm: () => void };

export function ConfirmRedeemScreen({ reward, onCancel, onConfirm }: Props) {
	const insets = useSafeAreaInsets();
	const remaining = SALDO_PUNTOS - reward.points;

	return (
		<View style={[styles.backdrop, { paddingTop: insets.top }]}>
			<StatusBar style="light" translucent />
			<View style={styles.sheet}>
				<View style={styles.iconCircle}>
					<Ionicons name={reward.icon} size={28} color={colors.navy} />
				</View>
				<Text style={styles.title}>Confirmar canje</Text>
				<Text style={styles.subtitle}>
					Vas a canjear <Text style={styles.bold}>{reward.title}</Text> en{" "}
					<Text style={styles.bold}>{reward.brand}</Text>.
				</Text>

				<View style={styles.statsRow}>
					<Stat label="USAS" value={`${reward.points} pts`} tone="navy" />
					<Stat label="QUEDA" value={`${remaining.toLocaleString("es-AR")} pts`} tone="cyan" />
				</View>

				<View style={styles.warningBox}>
					<Ionicons name="information-circle-outline" size={16} color="#B45A14" />
					<Text style={styles.warningText}>
						Una vez canjeado, los puntos no se pueden devolver.
					</Text>
				</View>

				<Pressable style={styles.confirmBtn} onPress={onConfirm}>
					<Text style={styles.confirmText}>Confirmar canje</Text>
				</Pressable>
				<Pressable style={styles.cancelBtn} onPress={onCancel}>
					<Text style={styles.cancelText}>Cancelar</Text>
				</Pressable>
			</View>
		</View>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "navy" | "cyan" }) {
	return (
		<View style={[styles.stat, tone === "cyan" && { backgroundColor: "#E8F6FC" }]}>
			<Text style={[styles.statLabel, tone === "cyan" && { color: colors.navy }]}>{label}</Text>
			<Text style={[styles.statValue, tone === "cyan" && { color: colors.navy }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(10,31,68,0.7)", justifyContent: "center", paddingHorizontal: 20 },
	sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 22, gap: 12, alignItems: "stretch" },
	iconCircle: { alignSelf: "center", width: 60, height: 60, borderRadius: 30, backgroundColor: "#E8F6FC", alignItems: "center", justifyContent: "center" },
	title: { textAlign: "center", color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, marginTop: 4 },
	subtitle: { textAlign: "center", color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20 },
	bold: { color: colors.navy, fontFamily: typography.family.medium },
	statsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
	stat: { flex: 1, backgroundColor: colors.navy, borderRadius: 12, padding: 14, alignItems: "center" },
	statLabel: { color: "#99B2CC", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	statValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 18, marginTop: 4 },
	warningBox: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FFF7ED", padding: 10, borderRadius: 10 },
	warningText: { flex: 1, color: "#B45A14", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	confirmBtn: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 8 },
	confirmText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
	cancelText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
});
