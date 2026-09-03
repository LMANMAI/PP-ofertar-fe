import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, typography } from "../theme/designSystem";
import type { Reward } from "../data/rewards";
import { BottomNav, type TabKey } from "../components";

type Props = {
	reward: Reward;
	code: string;
	remainingPoints: number;
	onSeeMy: () => void;
	onKeepRedeeming: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function RedeemSuccessScreen({ reward, code, remainingPoints, onSeeMy, onKeepRedeeming, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [copied, setCopied] = useState(false);
	const remaining = remainingPoints;

	const handleCopy = async () => {
		await Clipboard.setStringAsync(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Canje realizado</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, alignItems: "center", gap: 14 }}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={36} color={colors.success} />
				</View>
				<Text style={styles.title}>¡Canje exitoso!</Text>
				<Text style={styles.subtitle}>Tu recompensa está lista para usar</Text>
				<View style={styles.saldoBadge}>
					<Text style={styles.saldoText}>Saldo: {remaining.toLocaleString("es-AR")} pts</Text>
				</View>

				<View style={styles.rewardCard}>
					<View style={styles.rewardRow}>
						<View style={styles.rewardIconWrap}>
							<Ionicons name={reward.icon} size={22} color={colors.navy} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.rewardTitle}>{reward.title}</Text>
							<Text style={styles.rewardBrand}>{reward.points} pts canjeados</Text>
						</View>
					</View>
					<View style={styles.divider} />
					<Text style={styles.codeLabel}>TU CÓDIGO</Text>
					<Pressable
						style={styles.codeBox}
						onPress={handleCopy}
						accessibilityRole="button"
						accessibilityLabel="Copiar código"
					>
						<Text style={styles.codeText}>{code}</Text>
						<Ionicons
							name={copied ? "checkmark" : "copy-outline"}
							size={18}
							color={copied ? colors.success : colors.cyan}
						/>
					</Pressable>
					<View style={styles.validityRow}>
						<Ionicons name="time-outline" size={12} color={colors.subtleText} />
						<Text style={styles.validity}>{reward.validity}</Text>
					</View>
				</View>

				<View style={styles.tip}>
					<Ionicons name="card-outline" size={16} color="#15803D" />
					<Text style={styles.tipText}>
						El descuento se aplica solo en tu próxima suscripción. Guardá el código por si necesitás soporte.
					</Text>
				</View>

				<Pressable style={styles.primaryBtn} onPress={onSeeMy}>
					<Text style={styles.primaryText}>Ver mis canjes</Text>
				</Pressable>
				<Pressable onPress={onKeepRedeeming}>
					<Text style={styles.linkText}>Seguir canjeando</Text>
				</Pressable>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: 20, justifyContent: "center" },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	checkCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.success, alignItems: "center", justifyContent: "center", marginTop: 24 },
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 22 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14 },
	saldoBadge: { borderWidth: 1, borderColor: colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
	saldoText: { color: colors.success, fontFamily: typography.family.medium, fontSize: 13 },
	rewardCard: { width: "100%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: 16, padding: 16, gap: 8, marginTop: 6 },
	rewardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	rewardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F6FC", alignItems: "center", justifyContent: "center" },
	rewardTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 16 },
	rewardBrand: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	divider: { height: 1, backgroundColor: colors.divider, marginVertical: 6 },
	codeLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	codeBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: colors.divider, borderRadius: 8, paddingVertical: 12 },
	codeText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18, letterSpacing: 1 },
	validityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
	validity: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 12 },
	tip: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: colors.success, borderRadius: 10, padding: 12 },
	tipText: { flex: 1, color: "#15803D", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	primaryBtn: { width: "100%", backgroundColor: colors.navy, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
	primaryText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	linkText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14, marginTop: 4 },
});
