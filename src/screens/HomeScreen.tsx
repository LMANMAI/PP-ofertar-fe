import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomNav, type TabKey } from "../components";
import { colors, typography } from "../theme/designSystem";
import { type Session, getInitials, getAvatarUri, splitName } from "../auth/session";
import { OFFERS, EXPIRED_IDS } from "../data/offers";
import { TRACKED_PRODUCTS } from "../data/tracked";
import { getSavingsReport } from "../services";
import type { SavingsReportResponse } from "../services";

type Props = {
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onOpenHistory: () => void;
	onOpenAnalysis: () => void;
	onOpenRecurring: () => void;
	onOpenSmartList: () => void;
	onOpenOffer: (offerId: string) => void;
	onActivateOffer: (offerId: string) => void;
};

export function HomeScreen({
	session,
	activeTab,
	onSelectTab,
	onScanPress,
	onOpenHistory,
	onOpenAnalysis,
	onOpenRecurring,
	onOpenSmartList,
	onOpenOffer,
	onActivateOffer,
}: Props) {
	const insets = useSafeAreaInsets();
	const activeOffers = OFFERS.filter((o) => !EXPIRED_IDS.has(o.id)).slice(0, 4);
	const [savings, setSavings] = useState<SavingsReportResponse["summary"] | null>(null);

	function formatCurrencyS(value: number | null | undefined): string {
		if (value == null) return "$0";
		return `$${Math.round(value).toLocaleString("es-AR")}`;
	}

	useEffect(() => {
		getSavingsReport(session.token)
			.then((r) => setSavings(r.summary))
			.catch(() => {});
	}, [session.token]);

	const savingsTickets = savings?.ticketCount ?? 0;
	const savingsAvg = savings ? formatCurrencyS(savings.averageSavings) : "$0";

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Image
					source={require("../../assets/logo_ofertar.png")}
					style={styles.headerLogo}
				/>
				<View style={styles.headerLeft}>
					<Text style={styles.greeting}>
						¡Hola, {splitName(session.user.name).firstName}!{" "}
						<Text style={styles.wave}>👋</Text>
					</Text>
					<Text style={styles.greetingSub}>Qué bueno tenerte de nuevo</Text>
				</View>
				<Pressable
					onPress={() => onSelectTab("profile")}
					style={({ pressed }) => [
						styles.avatar,
						styles.avatarPressable,
						pressed && { opacity: 0.85 },
					]}
					hitSlop={8}
				>
					{session.user.profilePicture ? (
						<Image
							source={{ uri: getAvatarUri(session.user.profilePicture) }}
							style={styles.avatarImage}
						/>
					) : (
						<Text style={styles.avatarText}>{getInitials(session.user.name)}</Text>
					)}
				</Pressable>
			</View>
			<View style={styles.headerBottomCurve} />

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Savings card */}
				<View style={styles.savingsCard}>
					<Text style={styles.savingsOverline}>AHORRO DEL MES</Text>
					{savings ? (
						<Text style={styles.savingsAmount}>
							{formatCurrencyS(savings.totalSavings)}
						</Text>
					) : (
						<View style={{ paddingVertical: 8 }}>
							<ActivityIndicator size="small" color={colors.cyan} />
						</View>
					)}
					<View style={styles.savingsBottomRow}>
						<View style={styles.metricsRow}>
							<View>
								<Text style={styles.metricLabel}>TICKETS</Text>
								<Text style={styles.metricValue}>{savingsTickets}</Text>
							</View>
							<View style={styles.metricDivider} />
							<View>
								<Text style={styles.metricLabel}>PROMEDIO</Text>
								<Text style={[styles.metricValue, { color: colors.cyan }]}>
									{savingsAvg}
								</Text>
							</View>
						</View>
						<Pressable style={styles.savingsCta} onPress={onOpenHistory}>
							<Text style={styles.savingsCtaText}>Ver mis tickets</Text>
						</Pressable>
					</View>
				</View>

				{/* Próximas ofertas */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>TUS PRÓXIMAS OFERTAS</Text>
					<Pressable onPress={() => onSelectTab("offers")}>
						<Text style={styles.sectionLink}>Ver todas</Text>
					</Pressable>
				</View>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.offersRow}
				>
					{activeOffers.map((o) => {
						const dark = o.tone === "dark";
						return (
							<Pressable
								key={o.id}
								onPress={() => onOpenOffer(o.id)}
								style={[
									styles.offerCard,
									dark ? styles.offerCardDark : styles.offerCardLight,
								]}
							>
								<View style={styles.offerTop}>
									<View style={styles.offerStoreRow}>
										<View
											style={[
												styles.storeBadge,
												{ backgroundColor: o.storeBadgeColor },
											]}
										>
											<Text style={styles.storeBadgeText}>{o.storeBadge}</Text>
										</View>
										<Text
											style={[
												styles.storeName,
												{ color: dark ? "#fff" : colors.navy },
											]}
										>
											{o.storeName}
										</Text>
									</View>
									<View
										style={[
											styles.ptsBadge,
											dark
												? { backgroundColor: colors.cyan }
												: { backgroundColor: colors.navy },
										]}
									>
										<Text
											style={[
												styles.ptsBadgeText,
												{ color: dark ? colors.navy : colors.cyan },
											]}
										>
											{o.points}
										</Text>
									</View>
								</View>
								<Text
									style={[
										styles.offerTitle,
										{ color: dark ? "#fff" : colors.navy },
									]}
								>
									{o.title}
								</Text>
								<Text
									style={[
										styles.offerSub,
										{ color: dark ? "#99B2CC" : "#6B7280" },
									]}
								>
									{o.subtitle}
								</Text>
								<Pressable
									onPress={(e) => {
										e.stopPropagation();
										onActivateOffer(o.id);
									}}
									style={[
										styles.activateBtn,
										dark
											? { backgroundColor: colors.orange }
											: { backgroundColor: colors.navy },
									]}
								>
									<Text style={styles.activateText}>Activar oferta</Text>
								</Pressable>
							</Pressable>
						);
					})}
				</ScrollView>

				{/* Productos seguidos — full width grid */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>PRODUCTOS QUE COMPRÁS SEGUIDO</Text>
					<Pressable onPress={onOpenRecurring}>
						<Text style={styles.sectionLink}>Ver todos</Text>
					</Pressable>
				</View>
				<View style={styles.productsGrid}>
					{TRACKED_PRODUCTS.map((p) => (
						<Pressable
							key={p.id}
							style={styles.productCard}
							onPress={onOpenRecurring}
						>
							<View style={styles.productIconWrap}>
								<Ionicons name={p.icon} size={28} color="#9CA3A8" />
							</View>
							<Text style={styles.productName}>{p.name}</Text>
							<View style={styles.productFooter}>
								<Text style={styles.productPrice}>{p.price}</Text>
								<View style={styles.productDeltaBadge}>
									<Text style={styles.productDeltaText}>{p.delta}</Text>
								</View>
							</View>
						</Pressable>
					))}
				</View>

				{/* Quick actions */}
				<View style={styles.quickRow}>
					<Pressable style={styles.quickItem} onPress={onOpenAnalysis}>
						<Ionicons name="bar-chart-outline" size={18} color={colors.navy} />
						<Text style={styles.quickLabel}>Análisis mensual</Text>
					</Pressable>
					<Pressable style={styles.quickItem} onPress={onOpenSmartList}>
						<Ionicons name="bulb-outline" size={18} color={colors.navy} />
						<Text style={styles.quickLabel}>Mi lista</Text>
					</Pressable>
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
		paddingTop: 10,
		paddingBottom: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerBottomCurve: {
		height: 14,
		backgroundColor: colors.navy,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 18,
	},
	headerLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 10 },
	headerLeft: { flex: 1 },
	greeting: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 20,
		lineHeight: 26,
	},
	wave: { fontSize: 18 },
	greetingSub: {
		color: "rgba(255,255,255,0.65)",
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
		marginTop: 2,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.cyan,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	avatarPressable: {},
	avatarImage: { width: "100%", height: "100%" },
	avatarText: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 14,
	},
	scroll: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 24,
		gap: 14,
	},
	savingsCard: {
		backgroundColor: colors.navy,
		borderRadius: 18,
		padding: 20,
		gap: 4,
	},
	savingsOverline: {
		color: "rgba(255,255,255,0.55)",
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 1.5,
	},
	savingsAmount: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 36,
		lineHeight: 42,
		marginTop: 4,
	},
	savingsDeltaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	savingsDeltaText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	savingsBottomRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 14,
		paddingTop: 14,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.1)",
	},
	metricsRow: { flexDirection: "row", alignItems: "center", gap: 18 },
	metricDivider: {
		width: 1,
		height: 28,
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	metricLabel: {
		color: "rgba(255,255,255,0.55)",
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1.2,
	},
	metricValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 18,
		marginTop: 2,
	},
	savingsCta: {
		backgroundColor: colors.orange,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
	},
	savingsCtaText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
	},
	sectionTitle: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 1.4,
	},
	sectionLink: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	offersRow: { gap: 12, paddingRight: 20 },
	offerCard: {
		width: 240,
		borderRadius: 16,
		padding: 14,
		gap: 6,
	},
	offerCardLight: { backgroundColor: "#E8F6FC" },
	offerCardDark: { backgroundColor: colors.navy },
	offerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	offerStoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	storeBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	storeBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 10,
	},
	storeName: { fontFamily: typography.family.medium, fontSize: 13 },
	ptsBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 14,
	},
	ptsBadgeText: { fontFamily: typography.family.medium, fontSize: 10 },
	offerTitle: {
		fontFamily: typography.family.bold,
		fontSize: 16,
		marginTop: 4,
	},
	offerSub: { fontFamily: typography.family.regular, fontSize: 11 },
	activateBtn: {
		marginTop: 8,
		paddingVertical: 9,
		borderRadius: 8,
		alignItems: "center",
	},
	activateText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	productsGrid: {
		flexDirection: "row",
		gap: 10,
	},
	productCard: {
		flex: 1,
		backgroundColor: colors.card,
		borderRadius: 14,
		padding: 12,
		gap: 6,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	productIconWrap: {
		width: "100%",
		aspectRatio: 1,
		borderRadius: 10,
		backgroundColor: "#F8F9FB",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},
	productName: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 17,
	},
	productFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 2,
	},
	productPrice: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	productDeltaBadge: {
		backgroundColor: "#E0F5EF",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	productDeltaText: {
		color: "#1D9E75",
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	quickRow: { flexDirection: "row", gap: 10, marginTop: 4 },
	quickItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: colors.card,
		borderRadius: 10,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	quickLabel: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
});
