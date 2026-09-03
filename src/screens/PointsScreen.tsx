import { useState } from "react";
import {
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BottomNav, type TabKey } from "../components";
import { colors, typography } from "../theme/designSystem";
import { REWARDS, POINTS_PER_REFERRAL } from "../data/rewards";
import type { Session } from "../auth/session";
import { getReferralCode } from "../auth/session";

type Props = {
	session: Session;
	pointsBalance: number;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onSelectReward: (rewardId: string) => void;
	onShowHistory: () => void;
};

const SORTED_REWARDS = [...REWARDS].sort((a, b) => a.points - b.points);

export function PointsScreen({
	session,
	pointsBalance,
	onBack,
	activeTab,
	onSelectTab,
	onScanPress,
	onSelectReward,
	onShowHistory,
}: Props) {
	const insets = useSafeAreaInsets();
	const [copied, setCopied] = useState(false);
	const referralCode = getReferralCode(session.user);

	const nextReward = SORTED_REWARDS.find((r) => r.points > pointsBalance);
	const progressToNext = nextReward
		? Math.min(100, Math.round((pointsBalance / nextReward.points) * 100))
		: 100;
	const remainingToNext = nextReward ? nextReward.points - pointsBalance : 0;

	// Solo promete lo que pasa de verdad: quien se registra con el código gana
	// puntos. No hay forma de avisarle a quien comparte que alguien lo usó, así
	// que no afirmamos "ganamos los dos" acá (ver PRODUCT.md / HelpCenterScreen).
	const shareMessage = `Te invito a probar OfertAR, la app para ahorrar en el súper. Usá mi código ${referralCode} cuando te registres y arrancás con ${POINTS_PER_REFERRAL} puntos.`;

	const handleShare = () => {
		Share.share({ message: shareMessage }).catch(() => {});
	};

	const handleCopy = async () => {
		await Clipboard.setStringAsync(referralCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Mis puntos</Text>
				<Pressable
					onPress={onShowHistory}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Ver historial de puntos"
				>
					<Ionicons name="time-outline" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.balanceCard}>
					<Text style={styles.balanceLabel}>PUNTOS POR REFERIR</Text>
					<Text style={styles.balanceValue}>
						{pointsBalance.toLocaleString("es-AR")} pts
					</Text>
					{nextReward ? (
						<>
							<View style={styles.progressRow}>
								<Text style={styles.progressLabel}>
									Próxima recompensa: {nextReward.title}
								</Text>
								<Text style={styles.progressValue}>
									Faltan {remainingToNext} pts
								</Text>
							</View>
							<View style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${progressToNext}%` }]} />
							</View>
						</>
					) : (
						<Text style={styles.progressLabel}>
							Ya desbloqueaste todas las recompensas disponibles.
						</Text>
					)}
				</View>

				<View style={styles.referralCard}>
					<View style={styles.referralHeader}>
						<Ionicons name="people" size={20} color={colors.cyan} />
						<Text style={styles.referralTitle}>Referí y ganá</Text>
					</View>
					<Text style={styles.referralBody}>
						Vos y tu amigo ganan {POINTS_PER_REFERRAL} puntos cada uno cuando se
						registra con tu código.
					</Text>
					<Pressable
						style={styles.codeBox}
						onPress={handleCopy}
						accessibilityRole="button"
						accessibilityLabel="Copiar código de referido"
					>
						<Text style={styles.codeText}>{referralCode}</Text>
						<Ionicons
							name={copied ? "checkmark" : "copy-outline"}
							size={16}
							color={copied ? colors.success : colors.navy}
						/>
					</Pressable>
					<Pressable
						style={styles.shareButton}
						onPress={handleShare}
						accessibilityRole="button"
						accessibilityLabel="Compartir código de referido"
					>
						<Ionicons name="share-social-outline" size={16} color={colors.buttonText} />
						<Text style={styles.shareButtonText}>Compartir código</Text>
					</Pressable>
				</View>

				<Pressable style={styles.quickItem} onPress={onShowHistory}>
					<Ionicons name="time-outline" size={20} color={colors.navy} />
					<Text style={styles.quickText}>Ver historial de puntos</Text>
					<Ionicons name="chevron-forward" size={16} color={colors.subtleText} />
				</Pressable>

				<Text style={styles.sectionTitle}>CANJEÁ TUS PUNTOS</Text>

				<View style={styles.rewardsGrid}>
					{SORTED_REWARDS.map((r) => {
						const locked = pointsBalance < r.points;
						return (
							<Pressable
								key={r.id}
								style={[styles.rewardCard, locked && styles.rewardCardLocked]}
								onPress={() => onSelectReward(r.id)}
							>
								<Ionicons
									name={locked ? "lock-closed-outline" : r.icon}
									size={24}
									color={locked ? colors.subtleText : colors.navy}
								/>
								<Text style={[styles.rewardTitle, locked && { color: colors.mutedText2 }]}>
									{r.title}
								</Text>
								<View style={styles.rewardFooter}>
									<View
										style={[
											styles.rewardPointsBadge,
											locked && styles.rewardPointsBadgeLocked,
										]}
									>
										<Text
											style={[
												styles.rewardPointsText,
												locked && { color: colors.mutedText2 },
											]}
										>
											{r.points.toLocaleString("es-AR")} pts
										</Text>
									</View>
									<Ionicons
										name="arrow-forward"
										size={14}
										color={locked ? colors.subtleText : colors.navy}
									/>
								</View>
							</Pressable>
						);
					})}
				</View>
			</ScrollView>

			<View
				style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}
			>
				<BottomNav
					active={activeTab}
					onSelect={onSelectTab}
					onScanPress={onScanPress}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 14 },
	balanceCard: {
		backgroundColor: colors.navy,
		borderRadius: 16,
		padding: 20,
		gap: 8,
		shadowColor: colors.navy,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.35,
		shadowRadius: 24,
		elevation: 6,
	},
	balanceLabel: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	balanceValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 28, lineHeight: 34 },
	progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
	progressLabel: { flex: 1, color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 12 },
	progressValue: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 12 },
	progressTrack: { height: 6, backgroundColor: "#142954", borderRadius: 3, overflow: "hidden", marginTop: 6 },
	progressFill: { height: 6, backgroundColor: colors.cyan, borderRadius: 3 },
	referralCard: {
		backgroundColor: colors.card,
		borderRadius: 16,
		padding: 18,
		gap: 10,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	referralHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
	referralTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 16 },
	referralBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19 },
	codeBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: colors.softNavy,
		borderRadius: 10,
		paddingVertical: 12,
	},
	codeText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 15, letterSpacing: 0.5 },
	shareButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: colors.navy,
		borderRadius: 10,
		height: 46,
	},
	shareButtonText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 14 },
	quickItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.divider },
	quickText: { flex: 1, color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	sectionTitle: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
	rewardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	rewardCard: { flexBasis: "47.5%", flexGrow: 1, backgroundColor: "#E8F6FC", borderRadius: 16, padding: 14, gap: 5, minHeight: 110 },
	rewardCardLocked: { backgroundColor: colors.softWarm },
	rewardTitle: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13, marginTop: 2 },
	rewardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 6 },
	rewardPointsBadge: { backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
	rewardPointsBadgeLocked: { backgroundColor: colors.divider },
	rewardPointsText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 11, letterSpacing: 0.3 },
});
