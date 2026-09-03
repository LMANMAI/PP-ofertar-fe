import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Reward } from "../data/rewards";
import { BottomNav, type TabKey } from "../components";

type Props = {
	reward: Reward;
	pointsBalance: number;
	onBack: () => void;
	onRedeem: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function RewardDetailScreen({ reward, pointsBalance, onBack, onRedeem, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const remaining = pointsBalance - reward.points;
	const canRedeem = remaining >= 0;

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Detalle</Text>
			</View>
			<ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
				<View style={styles.heroWrap}>
					<View style={styles.hero}>
						<Ionicons name={reward.icon} size={28} color={colors.cyan} />
						<Text style={styles.heroTitle}>{reward.title}</Text>
						<Text style={styles.heroSub}>Beneficio de tu suscripción</Text>
						<View style={styles.heroBadge}>
							<Text style={styles.heroBadgeText}>{reward.points} pts</Text>
						</View>
					</View>
				</View>

				<View style={styles.infoCard}>
					<InfoRow icon="cash-outline" label="Costo" value={`${reward.points} puntos`} colors={colors} styles={styles} />
					<InfoRow icon="calendar-outline" label="Validez" value={reward.validity} colors={colors} styles={styles} />
					<InfoRow icon="checkmark-done-outline" label="Cómo se aplica" value={reward.where} last colors={colors} styles={styles} />
				</View>

				<Text style={styles.sectionLabel}>CONDICIONES</Text>
				<View style={styles.condCard}>
					{reward.conditions.map((c) => (
						<Text key={c} style={styles.condText}>• {c}</Text>
					))}
				</View>
			</ScrollView>

			<View style={styles.footer}>
				<View style={{ flex: 1 }}>
					<Text style={styles.balText}>Tu saldo: {pointsBalance.toLocaleString("es-AR")} pts</Text>
					<Text style={[styles.balRemaining, !canRedeem && { color: colors.danger }]}>
						{canRedeem ? `Quedará: ${remaining.toLocaleString("es-AR")} pts` : "Saldo insuficiente"}
					</Text>
				</View>
				<Pressable
					onPress={canRedeem ? onRedeem : undefined}
					style={[styles.cta, !canRedeem && { opacity: 0.5 }]}
				>
					<Text style={styles.ctaText}>Canjear {reward.points} pts</Text>
				</Pressable>
			</View>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function InfoRow({
	icon, label, value, last, colors, styles,
}: { icon: any; label: string; value: string; last?: boolean; colors: ColorTokens; styles: ReturnType<typeof createStyles> }) {
	return (
		<View>
			<View style={styles.infoRow}>
				<Ionicons name={icon} size={18} color={colors.subtleText} />
				<View style={{ flex: 1 }}>
					<Text style={styles.infoLabel}>{label}</Text>
					<Text style={styles.infoValue}>{value}</Text>
				</View>
			</View>
			{!last && <View style={styles.infoDivider} />}
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	heroWrap: { padding: 16 },
	hero: { backgroundColor: colors.navy, borderRadius: 16, padding: 20, gap: 8 },
	heroTitle: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 22, marginTop: 8 },
	heroSub: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 13 },
	heroBadge: { alignSelf: "flex-start", backgroundColor: colors.cyan, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
	heroBadgeText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 12 },
	infoCard: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14 },
	infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
	infoLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 13 },
	infoValue: { color: colors.defaultText, fontFamily: typography.family.regular, fontSize: 14, marginTop: 2 },
	infoDivider: { height: 1, backgroundColor: colors.divider },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 18, marginHorizontal: 16, marginBottom: 8 },
	condCard: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 4 },
	condText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 18 },
	footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: "row", alignItems: "center", gap: 12 },
	balText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13 },
	balRemaining: { color: colors.success, fontFamily: typography.family.regular, fontSize: 13 },
	cta: { backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 14 },
	});
}
