import { useState } from "react";
import {
	Image,
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
import { CATEGORIES, EXPIRED_IDS, OFFERS, type Offer } from "../data/offers";

type Props = {
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	activatedIds: Set<string>;
	onOpenOffer: (offerId: string) => void;
	onActivateOffer: (offerId: string) => void;
	onShowCode: (offerId: string) => void;
};

export function OffersScreen({
	activeTab,
	onSelectTab,
	onScanPress,
	activatedIds,
	onOpenOffer,
	onActivateOffer,
	onShowCode,
}: Props) {
	const insets = useSafeAreaInsets();
	const [category, setCategory] = useState<string>("Todas");

	const visibleOffers =
		category === "Todas"
			? OFFERS
			: OFFERS.filter((o) => o.category === category);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<View style={styles.headerTitleRow}>
					<Image
						source={require("../../assets/logo_ofertar.png")}
						style={styles.headerLogo}
					/>
					<Text style={styles.headerTitle}>Ofertas para vos</Text>
				</View>
				<View style={styles.bellWrap}>
					<Ionicons name="notifications-outline" size={22} color={colors.buttonText} />
					<View style={styles.bellDot} />
				</View>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.chipsRow}
				>
					{CATEGORIES.map((c) => {
						const active = c === category;
						return (
							<Pressable
								key={c}
								onPress={() => setCategory(c)}
								style={[styles.chip, active && styles.chipActive]}
							>
								<Text style={[styles.chipText, active && styles.chipTextActive]}>
									{c}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>

				{visibleOffers.map((o) => {
					const isExpired = EXPIRED_IDS.has(o.id);
					const isActivated = activatedIds.has(o.id);
					return (
						<OfferCard
							key={o.id}
							offer={o}
							expired={isExpired}
							activated={isActivated}
							onOpen={() => onOpenOffer(o.id)}
							onActivate={() => onActivateOffer(o.id)}
							onShowCode={() => onShowCode(o.id)}
						/>
					);
				})}
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav
					active={activeTab}
					onSelect={onSelectTab}
					onScanPress={onScanPress}
				/>
			</View>
		</View>
	);
}

function OfferCard({
	offer,
	expired,
	activated,
	onOpen,
	onActivate,
	onShowCode,
}: {
	offer: Offer;
	expired: boolean;
	activated: boolean;
	onOpen: () => void;
	onActivate: () => void;
	onShowCode: () => void;
}) {
	if (expired) {
		return (
			<View style={[styles.offerCard, styles.offerCardExpired]}>
				<View style={styles.offerHeader}>
					<View style={styles.offerStoreRow}>
						<View style={[styles.storeBadge, { backgroundColor: "#B4B4B4" }]}>
							<Text style={styles.storeBadgeText}>{offer.storeBadge}</Text>
						</View>
						<Text style={[styles.storeName, { color: "#8C8C94" }]}>
							{offer.storeName}
						</Text>
					</View>
					<View style={styles.expiredBadge}>
						<Ionicons name="close" size={11} color="#EF4444" />
						<Text style={styles.expiredBadgeText}>Vencida</Text>
					</View>
				</View>
				<Text style={[styles.offerTitle, { color: "#A0A0A5" }]}>{offer.title}</Text>
				<Text style={[styles.offerSubtitle, { color: "#BEBEC3" }]}>
					{offer.subtitle}
				</Text>
				<View style={styles.actionButtonExpired}>
					<Text style={styles.actionButtonExpiredText}>Oferta vencida</Text>
				</View>
			</View>
		);
	}

	const isDark = offer.tone === "dark";

	return (
		<Pressable
			onPress={onOpen}
			style={[styles.offerCard, isDark ? styles.offerCardDark : styles.offerCardLight]}
		>
			<View style={styles.offerHeader}>
				<View style={styles.offerStoreRow}>
					<View style={[styles.storeBadge, { backgroundColor: offer.storeBadgeColor }]}>
						<Text style={styles.storeBadgeText}>{offer.storeBadge}</Text>
					</View>
					<Text style={[styles.storeName, { color: isDark ? colors.buttonText : colors.navy }]}>
						{offer.storeName}
					</Text>
				</View>
				<View
					style={[
						styles.pointsBadge,
						isDark ? styles.pointsBadgeCyan : styles.pointsBadgeNavy,
					]}
				>
					<Text
						style={[
							styles.pointsBadgeText,
							{ color: isDark ? colors.navy : colors.cyan },
						]}
					>
						{offer.points}
					</Text>
				</View>
			</View>
			<Text
				style={[
					styles.offerTitle,
					{ color: isDark ? colors.buttonText : colors.navy },
				]}
			>
				{offer.title}
			</Text>
			<Text
				style={[
					styles.offerSubtitle,
					{ color: isDark ? "#99B2CC" : "#6B7280" },
				]}
			>
				{offer.subtitle}
			</Text>

			<Pressable
				onPress={(e) => {
					e.stopPropagation();
					if (activated) onShowCode();
					else onActivate();
				}}
				style={[
					styles.actionButton,
					activated
						? styles.actionButtonActivated
						: isDark
							? { backgroundColor: colors.cyan }
							: { backgroundColor: colors.navy },
				]}
			>
				{activated && (
					<Ionicons name="checkmark" size={14} color={colors.navy} />
				)}
				<Text
					style={[
						styles.actionButtonText,
						{
							color: activated
								? colors.navy
								: isDark
									? colors.navy
									: colors.buttonText,
						},
					]}
				>
					{activated ? "Ver código" : "Activar oferta"}
				</Text>
			</Pressable>
		</Pressable>
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
	headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	headerLogo: { width: 24, height: 24, borderRadius: 6 },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	bellWrap: { position: "relative" },
	bellDot: {
		position: "absolute",
		top: -2,
		right: -2,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#EF4444",
	},
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 16 },
	chipsRow: { gap: 8, paddingRight: 16 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	chipText: {
		fontFamily: typography.family.medium,
		fontSize: 11,
		color: "#6B7280",
		letterSpacing: 0.3,
	},
	chipTextActive: { color: colors.buttonText },
	offerCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 7 },
	offerCardLight: { backgroundColor: "#E8F6FC" },
	offerCardDark: { backgroundColor: colors.navy },
	offerCardExpired: { backgroundColor: "#F5F5F7" },
	offerHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
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
	storeName: { fontFamily: typography.family.medium, fontSize: 14 },
	pointsBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
	pointsBadgeNavy: { backgroundColor: colors.navy },
	pointsBadgeCyan: { backgroundColor: colors.cyan },
	pointsBadgeText: {
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.3,
	},
	expiredBadge: {
		backgroundColor: "#FEE2E2",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	expiredBadgeText: {
		color: "#EF4444",
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.3,
	},
	offerTitle: { fontFamily: typography.family.bold, fontSize: 17, marginTop: 2 },
	offerSubtitle: { fontFamily: typography.family.regular, fontSize: 12 },
	actionButton: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 4,
		flexDirection: "row",
		gap: 6,
	},
	actionButtonActivated: { backgroundColor: colors.cyan },
	actionButtonText: { fontFamily: typography.family.medium, fontSize: 12 },
	actionButtonExpired: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 4,
		backgroundColor: "#D2D2D6",
	},
	actionButtonExpiredText: {
		color: "#96969B",
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
});
