import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";
import type { Reward } from "../data/rewards";
import { BottomNav, type TabKey, InlineNotice, PrimaryButton } from "../components";

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
			<StatusBar style="light" />
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Interés guardado</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 24, alignItems: "center", gap: space.mdPlus }}>
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

				<InlineNotice
					variant="success"
					icon="megaphone-outline"
					style={styles.tip}
					message="OfertAR todavía no tiene suscripción paga. En cuanto esté disponible, te avisamos y este beneficio se aplica solo."
				/>

				<PrimaryButton label="Ver mi historial" onPress={onSeeMy} size="medium" style={styles.primaryBtn} />
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
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: typography.sizes.bodyL },
	checkCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.success, alignItems: "center", justifyContent: "center", marginTop: space.xxl },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.h2 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.label, textAlign: "center" },
	saldoBadge: { borderWidth: 1, borderColor: colors.success, paddingHorizontal: space.mdPlus, paddingVertical: space.sm, borderRadius: 18 },
	saldoText: { color: colors.success, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	rewardCard: { width: "100%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, padding: space.lg, gap: space.sm, marginTop: space.xsPlus },
	rewardRow: { flexDirection: "row", alignItems: "center", gap: space.md },
	rewardIconWrap: { width: 40, height: 40, borderRadius: radii.xl, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
	rewardTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.subtitle },
	rewardBrand: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, marginTop: 2 },
	divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.xsPlus },
	validityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs },
	validity: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, textAlign: "center", flexShrink: 1 },
	tip: { width: "100%" },
	primaryBtn: { width: "100%", marginTop: space.sm },
	linkText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: typography.sizes.label, marginTop: space.xs },
	});
}
