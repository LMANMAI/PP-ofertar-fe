import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
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
import { ALL_CATEGORIES, getOffers, offerBadge, offerCategories } from "../services";
import type { Offer } from "../services";
import type { Session } from "../auth/session";

type Props = {
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onOpenOffer: (offerId: string) => void;
};

function formatUntil(iso: string | null): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export function OffersScreen({ session, activeTab, onSelectTab, onScanPress, onOpenOffer }: Props) {
	const insets = useSafeAreaInsets();
	const [offers, setOffers] = useState<Offer[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [category, setCategory] = useState<string>(ALL_CATEGORIES);

	useEffect(() => {
		setLoading(true);
		getOffers(session.token, 1, 50)
			.then((data) => {
				setOffers(data.items);
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al cargar las ofertas");
			})
			.finally(() => setLoading(false));
	}, [session.token]);

	// Built from the offers on screen rather than a fixed list, so the filter
	// never shows a chip that matches nothing.
	const categories = useMemo(() => offerCategories(offers), [offers]);
	const visibleOffers =
		category === ALL_CATEGORIES ? offers : offers.filter((o) => o.category === category);

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
			</View>

			{loading && (
				<View style={styles.loaderWrap}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			)}

			{error && !loading && (
				<View style={styles.errorBanner}>
					<Ionicons name="warning-outline" size={18} color="#E76F51" />
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{!loading && !error && offers.length === 0 && (
				<View style={styles.emptyWrap}>
					<Ionicons name="pricetags-outline" size={56} color={colors.border} />
					<Text style={styles.emptyTitle}>No hay ofertas vigentes</Text>
					<Text style={styles.emptyHint}>
						No encontramos ofertas en los súper que elegiste como favoritos. Probá sumando cadenas
						desde tu perfil.
					</Text>
				</View>
			)}

			{!loading && !error && offers.length > 0 && (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text style={styles.intro}>
						Todo lo que está en oferta en los súper que elegiste como favoritos.
					</Text>

					{categories.length > 1 && (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chipsRow}
						>
							{categories.map((c) => {
								const active = c === category;
								return (
									<Pressable
										key={c}
										onPress={() => setCategory(c)}
										style={[styles.chip, active && styles.chipActive]}
									>
										<Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
									</Pressable>
								);
							})}
						</ScrollView>
					)}

					{visibleOffers.map((o) => (
						<OfferCard key={o.id} offer={o} onOpen={() => onOpenOffer(o.id)} />
					))}
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function OfferCard({ offer, onOpen }: { offer: Offer; onOpen: () => void }) {
	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatUntil(offer.activeTo);

	return (
		<Pressable onPress={onOpen} style={styles.offerCard}>
			<View style={styles.offerHeader}>
				<View style={styles.offerStoreRow}>
					<View style={[styles.storeBadge, { backgroundColor: color }]}>
						<Text style={styles.storeBadgeText}>{badge}</Text>
					</View>
					<Text style={styles.storeName} numberOfLines={1}>
						{offer.retailerName}
						{offer.province ? ` · ${offer.province}` : ""}
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={16} color="#9CA3A8" />
			</View>

			<Text style={styles.offerTitle}>{offer.headline}</Text>

			{offer.kind === "catalog" && offer.productName && (
				<Text style={styles.offerSubtitle}>
					{offer.productName}
					{offer.price != null ? ` · $${Math.round(offer.price).toLocaleString("es-AR")}` : ""}
				</Text>
			)}

			{until && <Text style={styles.offerValidity}>Vigente hasta el {until}</Text>}

			{offer.brand && (
				<Text style={styles.offerApplies} numberOfLines={1}>
					{offer.brand}
					{offer.category ? ` · ${offer.category}` : ""}
				</Text>
			)}

			{offer.percentagesUnverified && (
				<Text style={styles.offerCaveat}>
					El porcentaje se leyó de la imagen de la promoción y puede no ser exacto.
				</Text>
			)}
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
	loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	errorBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		margin: 16,
		backgroundColor: "#FEF2F2",
		borderRadius: 10,
		padding: 12,
	},
	errorText: { flex: 1, color: "#991B1B", fontFamily: typography.family.medium, fontSize: 13 },
	emptyWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingBottom: 60,
		paddingHorizontal: 40,
	},
	emptyTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 16, textAlign: "center" },
	emptyHint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		textAlign: "center",
		lineHeight: 18,
	},
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 12 },
	intro: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
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
	offerCard: {
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 7,
		backgroundColor: "#E8F6FC",
	},
	offerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	offerStoreRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
	storeBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
	storeBadgeText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 10 },
	storeName: { flex: 1, color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	offerTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 17 },
	offerSubtitle: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	offerValidity: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	offerApplies: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	offerCaveat: {
		color: "#9CA3A8",
		fontFamily: typography.family.regular,
		fontSize: 11,
		lineHeight: 15,
		fontStyle: "italic",
	},
});
