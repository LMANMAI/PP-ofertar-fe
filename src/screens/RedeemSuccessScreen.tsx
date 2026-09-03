import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Reward } from "../data/rewards";
import { BottomNav, type TabKey } from "../components";

type Props = {
	reward: Reward;
	remainingPoints: number;
	onSeeMy: () => void;
	onKeepRedeeming: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function RedeemSuccessScreen({ reward, remainingPoints, onSeeMy, onKeepRedeeming, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Interés guardado</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 24, alignItems: "center", gap: 14 }}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={36} color={colors.success} />
				</View>
				<Text style={styles.title}>¡Listo!</Text>
				<Text style={styles.subtitle}>
					Guardamos tu interés en esta recompensa
				</Text>
				<View style={styles.saldoBadge}>
					<Text style={styles.saldoText}>Saldo: {remainingPoints.toLocaleString("es-AR")} pts</Text>
				</View>

				<View style={styles.rewardCard}>
					<View style={styles.rewardRow}>
						<View style={styles.rewardIconWrap}>
							<Ionicons name={reward.icon} size={22} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.rewardTitle}>{reward.title}</Text>
							<Text style={styles.rewardBrand}>{reward.points} pts usados</Text>
						</View>
					</View>
					<View style={styles.divider} />
					<View style={styles.validityRow}>
						<Ionicons name="information-circle-outline" size={14} color={colors.subtleText} />
						<Text style={styles.validity}>{reward.validity}</Text>
					</View>
				</View>

				<View style={styles.tip}>
					<Ionicons name="megaphone-outline" size={16} color={colors.successSoftText} />
					<Text style={styles.tipText}>
						OfertAR todavía no tiene suscripción paga. En cuanto esté
						disponible, te avisamos y este beneficio se aplica solo.
					</Text>
				</View>

				<Pressable style={styles.primaryBtn} onPress={onSeeMy}>
					<Text style={styles.primaryText}>Ver mi historial</Text>
				</Pressable>
				<Pressable onPress={onKeepRedeeming}>
					<Text style={styles.linkText}>Volver a puntos</Text>
				</Pressable>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: space.xl, justifyContent: "center" },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	checkCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.success, alignItems: "center", justifyContent: "center", marginTop: space.xxl },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 22 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center" },
	saldoBadge: { borderWidth: 1, borderColor: colors.success, paddingHorizontal: 14, paddingVertical: space.sm, borderRadius: 18 },
	saldoText: { color: colors.success, fontFamily: typography.family.medium, fontSize: 13 },
	rewardCard: { width: "100%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: 16, padding: space.lg, gap: space.sm, marginTop: 6 },
	rewardRow: { flexDirection: "row", alignItems: "center", gap: space.md },
	rewardIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
	rewardTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 16 },
	rewardBrand: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	divider: { height: 1, backgroundColor: colors.divider, marginVertical: 6 },
	validityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs },
	validity: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 12, textAlign: "center", flexShrink: 1 },
	tip: { width: "100%", flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success, borderRadius: 10, padding: space.md },
	tipText: { flex: 1, color: colors.successSoftText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	primaryBtn: { width: "100%", backgroundColor: colors.navy, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: space.sm },
	primaryText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	linkText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14, marginTop: space.xs },
	});
}
