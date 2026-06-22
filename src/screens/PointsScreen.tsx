import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomNav, type TabKey } from "../components";
import { colors, typography } from "../theme/designSystem";
import { REWARDS, SALDO_PUNTOS } from "../data/rewards";

type Props = {
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onSelectReward: (rewardId: string) => void;
	onShowHistory: () => void;
	onShowLevels: () => void;
};

export function PointsScreen({
	activeTab,
	onSelectTab,
	onScanPress,
	onSelectReward,
	onShowHistory,
	onShowLevels,
}: Props) {
	const insets = useSafeAreaInsets();
	const progressToOro = Math.min(100, Math.round((SALDO_PUNTOS / 3000) * 100));
	const remainingToOro = 3000 - SALDO_PUNTOS;

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Text style={styles.headerTitle}>Mis puntos</Text>
				<Pressable onPress={onShowHistory} hitSlop={8}>
					<Ionicons name="time-outline" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<Pressable onPress={onShowLevels} style={styles.balanceCard}>
					<Text style={styles.balanceLabel}>SALDO DISPONIBLE</Text>
					<Text style={styles.balanceValue}>
						{SALDO_PUNTOS.toLocaleString("es-AR")} pts
					</Text>
					<View style={styles.levelChip}>
						<Ionicons name="star" size={11} color={colors.navy} />
						<Text style={styles.levelChipText}>Nivel Plata</Text>
					</View>
					<View style={styles.progressRow}>
						<Text style={styles.progressLabel}>Progreso a Oro</Text>
						<Text style={styles.progressValue}>
							{remainingToOro.toLocaleString("es-AR")} pts
						</Text>
					</View>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, { width: `${progressToOro}%` }]} />
					</View>
					<View style={styles.tapHint}>
						<Text style={styles.tapHintText}>Ver niveles</Text>
						<Ionicons name="chevron-forward" size={12} color={colors.cyan} />
					</View>
				</Pressable>

				<View style={styles.quickActions}>
					<Pressable style={styles.quickItem} onPress={onShowHistory}>
						<Ionicons name="time-outline" size={20} color={colors.navy} />
						<Text style={styles.quickText}>Historial</Text>
					</Pressable>
					<Pressable style={styles.quickItem} onPress={onShowLevels}>
						<Ionicons name="trophy-outline" size={20} color={colors.navy} />
						<Text style={styles.quickText}>Niveles</Text>
					</Pressable>
				</View>

				<Text style={styles.sectionTitle}>CANJEÁ TUS PUNTOS</Text>

				<View style={styles.rewardsGrid}>
					{REWARDS.map((r) => (
						<Pressable
							key={r.id}
							style={styles.rewardCard}
							onPress={() => onSelectReward(r.id)}
						>
							<Ionicons name={r.icon} size={24} color={colors.navy} />
							<Text style={styles.rewardTitle}>{r.title}</Text>
							<Text style={styles.rewardBrand}>{r.brand}</Text>
							<View style={styles.rewardFooter}>
								<View style={styles.rewardPointsBadge}>
									<Text style={styles.rewardPointsText}>
										{r.points.toLocaleString("es-AR")} pts
									</Text>
								</View>
								<Ionicons name="arrow-forward" size={14} color={colors.navy} />
							</View>
						</Pressable>
					))}
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
		paddingHorizontal: 20,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTitle: {
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
	levelChip: { alignSelf: "flex-start", backgroundColor: colors.cyan, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 },
	levelChipText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 11, letterSpacing: 0.3 },
	progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
	progressLabel: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 12 },
	progressValue: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 12 },
	progressTrack: { height: 6, backgroundColor: "#142954", borderRadius: 3, overflow: "hidden" },
	progressFill: { height: 6, backgroundColor: colors.cyan, borderRadius: 3 },
	tapHint: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
	tapHintText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 11 },
	quickActions: { flexDirection: "row", gap: 10 },
	quickItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: "#E5E7EB" },
	quickText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	sectionTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
	rewardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
	rewardCard: { flexBasis: "47.5%", flexGrow: 1, backgroundColor: "#E8F6FC", borderRadius: 16, padding: 14, gap: 5, minHeight: 117 },
	rewardTitle: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13, marginTop: 2 },
	rewardBrand: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 11 },
	rewardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 6 },
	rewardPointsBadge: { backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
	rewardPointsText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 11, letterSpacing: 0.3 },
});
