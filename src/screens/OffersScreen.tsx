import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
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
import { typography, useIsTablet, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { ALL_CATEGORIES, getOffers, offerBadge, offerCategories, offerPromo } from "../services";
import type { Offer, PromoIcon } from "../services";
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
	const isTablet = useIsTablet();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
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
					<Ionicons name="warning-outline" size={18} color={colors.orange} />
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
				<FlatList
					// A restructure, not a stretch: on a tablet-width viewport the same
					// cards lay out two to a row instead of one full-width column.
					key={isTablet ? "grid" : "list"}
					numColumns={isTablet ? 2 : 1}
					columnWrapperStyle={isTablet ? styles.offerRow : undefined}
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					data={visibleOffers}
					keyExtractor={(o) => o.id}
					ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
					ListHeaderComponent={
						<>
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
						</>
					}
					ListHeaderComponentStyle={styles.listHeader}
					renderItem={({ item: o }) => (
						<View style={isTablet ? styles.offerCol : undefined}>
							<OfferCard offer={o} onOpen={() => onOpenOffer(o.id)} colors={colors} styles={styles} />
						</View>
					)}
				/>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

/** Same anatomy as the home carousel card, one size up: the number in its own
 * tile with an icon, and right beside it the thing the list never used to say —
 * whether the percentage comes off the price or off a second unit. */
function OfferCard({
	offer,
	onOpen,
	colors,
	styles,
}: {
	offer: Offer;
	onOpen: () => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatUntil(offer.activeTo);
	const promo = offerPromo(offer);
	const catalogPct =
		offer.kind === "catalog" && offer.discountPct != null && offer.discountPct >= 1
			? `${Math.round(offer.discountPct)}%`
			: null;

	const amount = promo ? promo.amount : catalogPct;
	const capped = promo?.capped ?? false;
	const conditional = promo?.conditional ?? false;
	const icon: PromoIcon = promo ? promo.icon : "pricetag-outline";
	// The percentages we collapsed into "hasta". Named in full here, where
	// there is room for it, so the ceiling is never mistaken for the only
	// number the promotion advertises. Same filter as describePromo, so the
	// list can never contradict the tile.
	const everyPct = [
		...new Set((offer.discountPercentages ?? []).filter((n) => n > 0 && n <= 100)),
	];

	return (
		<Pressable
			onPress={onOpen}
			style={({ pressed }) => [styles.offerCard, pressed && styles.offerCardPressed]}
		>
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
				<Ionicons name="chevron-forward" size={16} color={colors.subtleText} />
			</View>

			<View style={styles.offerBody}>
				{amount ? (
					<View style={styles.amountTile}>
						<View style={styles.amountKickerRow}>
							<Ionicons name={icon} size={12} color={colors.cyan} />
							{capped && <Text style={styles.amountKicker}>HASTA</Text>}
						</View>
						<Text
							style={styles.amountValue}
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.6}
						>
							{amount}
						</Text>
					</View>
				) : (
					<View style={[styles.amountTile, styles.amountTileFlat]}>
						<Ionicons name={icon} size={26} color={colors.cyan} />
					</View>
				)}

				<View style={styles.offerBodyRight}>
					{offer.kind === "catalog" ? (
						<>
							<Text style={styles.offerProduct} numberOfLines={2}>
								{offer.productName ?? offer.headline}
							</Text>
							{offer.price != null && (
								<View style={styles.priceRow}>
									<Text style={styles.priceNow}>
										${Math.round(offer.price).toLocaleString("es-AR")}
									</Text>
									{offer.listPrice != null && offer.listPrice > offer.price && (
										<Text style={styles.priceWas}>
											${Math.round(offer.listPrice).toLocaleString("es-AR")}
										</Text>
									)}
								</View>
							)}
						</>
					) : (
						<>
							<View style={[styles.appliesChip, conditional && styles.appliesChipWarm]}>
								<Text style={[styles.appliesText, conditional && styles.appliesTextWarm]}>
									{promo ? promo.applies : offer.headline}
								</Text>
							</View>
							{promo && <Text style={styles.offerDetail}>{promo.detail}</Text>}
						</>
					)}
				</View>
			</View>

			{until && <Text style={styles.offerValidity}>Vigente hasta el {until}</Text>}

			{offer.brand && (
				<Text style={styles.offerApplies} numberOfLines={1}>
					{offer.brand}
					{offer.category ? ` · ${offer.category}` : ""}
				</Text>
			)}

			{capped && everyPct.length > 1 && (
				<Text style={styles.offerCaveat}>
					El aviso muestra más de un porcentaje ({everyPct.map((p) => `${p}%`).join(", ")}) y no
					dice a qué producto va cada uno, así que mostramos el mayor.
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

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
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
		backgroundColor: colors.dangerSoft,
		borderRadius: 10,
		padding: 12,
	},
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 13 },
	emptyWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingBottom: 60,
		paddingHorizontal: 40,
	},
	emptyTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 16, textAlign: "center" },
	emptyHint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		textAlign: "center",
		lineHeight: 18,
	},
	scroll: { flex: 1 },
	scrollContent: { padding: 16 },
	listHeader: { gap: 12, marginBottom: 12 },
	offerRow: { gap: 12 },
	offerCol: { flex: 1 },
	intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	chipsRow: { gap: 8, paddingRight: 16 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	chipText: {
		fontFamily: typography.family.medium,
		fontSize: 11,
		color: colors.mutedText2,
		letterSpacing: 0.3,
	},
	chipTextActive: { color: colors.buttonText },
	offerCard: {
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 10,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		shadowColor: colors.shadow,
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 3 },
		elevation: 2,
	},
	offerCardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: 14 },
	// The number gets a block of its own instead of being one more line of
	// text. Same anatomy as the home carousel so the two read as one system.
	amountTile: {
		width: 88,
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 6,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
		backgroundColor: colors.navy,
	},
	amountTileFlat: { paddingVertical: 18 },
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	amountKicker: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.8,
	},
	amountValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 27 },
	offerBodyRight: { flex: 1, justifyContent: "center", gap: 6 },
	appliesChip: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 8,
		backgroundColor: colors.softNavy,
	},
	// Warm for anything not simply taken off the price, so a "50% en la 2da
	// unidad" never looks like a plain 50% off.
	appliesChipWarm: { backgroundColor: "#FDECE6" },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 13, lineHeight: 17 },
	appliesTextWarm: { color: "#B44A2E" },
	offerDetail: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 16,
	},
	offerProduct: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 18,
	},
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
	priceNow: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 18 },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		textDecorationLine: "line-through",
	},
	offerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	offerStoreRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
	storeBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
	storeBadgeText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 10 },
	storeName: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	offerValidity: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 12 },
	offerApplies: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	offerCaveat: {
		color: "#64748B",
		fontFamily: typography.family.regular,
		fontSize: 11,
		lineHeight: 15,
		fontStyle: "italic",
	},
	});
}
