import { memo, useEffect, useMemo, useState } from "react";
import {
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
	BottomNav,
	EmptyState,
	ErrorBanner,
	LoadingState,
	OffersFilterSheet,
	type OffersFilterSection,
	type OffersFilterState,
	ScreenHeader,
	type TabKey,
} from "../components";
import { space, typography, useIsTablet, useThemeColors, type ColorTokens } from "../theme/designSystem";
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

	const [filter, setFilter] = useState<OffersFilterState>({
		retailerSlugs: new Set(),
		categories: new Set(),
	});
	const [filterVisible, setFilterVisible] = useState(false);
	const [filterSection, setFilterSection] = useState<OffersFilterSection>("retailers");

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

	// Built from the offers on screen rather than a fixed list, so a filter
	// never offers a chip or checkbox that matches nothing.
	const categories = useMemo(
		() => offerCategories(offers).filter((c) => c !== ALL_CATEGORIES),
		[offers],
	);
	const retailers = useMemo(() => {
		const bySlug = new Map<string, string>();
		for (const o of offers) {
			if (o.retailerSlug && o.retailerName && !bySlug.has(o.retailerSlug)) {
				bySlug.set(o.retailerSlug, o.retailerName);
			}
		}
		return [...bySlug.entries()]
			.map(([slug, name]) => ({ slug, name }))
			.sort((a, b) => a.name.localeCompare(b.name, "es"));
	}, [offers]);

	const visibleOffers = useMemo(() => {
		return offers.filter((o) => {
			if (filter.retailerSlugs.size > 0 && (!o.retailerSlug || !filter.retailerSlugs.has(o.retailerSlug))) {
				return false;
			}
			if (filter.categories.size > 0 && (!o.category || !filter.categories.has(o.category))) {
				return false;
			}
			return true;
		});
	}, [offers, filter]);

	const openFilter = (section: OffersFilterSection) => {
		setFilterSection(section);
		setFilterVisible(true);
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Ofertas para vos" logo />

			{loading && <LoadingState />}

			{error && !loading && <ErrorBanner message={error} />}

			{!loading && !error && offers.length === 0 && (
				<EmptyState
					icon="pricetags-outline"
					title="No hay ofertas vigentes"
					hint="No encontramos ofertas en los súper que elegiste como favoritos. Probá sumando cadenas desde tu perfil."
				/>
			)}

			{!loading && !error && offers.length > 0 && visibleOffers.length === 0 && (
				<EmptyState
					icon="filter-outline"
					title="Ninguna oferta coincide con estos filtros"
					hint="Probá sacando algún filtro para ver más resultados."
					action={{
						label: "Limpiar filtros",
						onPress: () => setFilter({ retailerSlugs: new Set(), categories: new Set() }),
					}}
				/>
			)}

			{!loading && !error && offers.length > 0 && visibleOffers.length > 0 && (
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

							<View style={styles.filterBarRow}>
								<Pressable
									style={[styles.filterPill, filter.retailerSlugs.size > 0 && styles.filterPillActive]}
									onPress={() => openFilter("retailers")}
								>
									<Ionicons
										name="storefront-outline"
										size={14}
										color={filter.retailerSlugs.size > 0 ? colors.buttonText : colors.defaultText}
									/>
									<Text
										style={[
											styles.filterPillText,
											filter.retailerSlugs.size > 0 && styles.filterPillTextActive,
										]}
									>
										Supermercados{filter.retailerSlugs.size > 0 ? ` (${filter.retailerSlugs.size})` : ""}
									</Text>
								</Pressable>

								<Pressable
									style={[styles.filterPill, filter.categories.size > 0 && styles.filterPillActive]}
									onPress={() => openFilter("categories")}
								>
									<Ionicons
										name="pricetags-outline"
										size={14}
										color={filter.categories.size > 0 ? colors.buttonText : colors.defaultText}
									/>
									<Text
										style={[
											styles.filterPillText,
											filter.categories.size > 0 && styles.filterPillTextActive,
										]}
									>
										Categorías{filter.categories.size > 0 ? ` (${filter.categories.size})` : ""}
									</Text>
								</Pressable>
							</View>

						</>
					}
					ListHeaderComponentStyle={styles.listHeader}
					renderItem={({ item: o }) => (
						<View style={isTablet ? styles.offerCol : undefined}>
							<OfferCard offer={o} onOpenOffer={onOpenOffer} colors={colors} styles={styles} />
						</View>
					)}
					// Off-screen rows don't need to stay mounted, and batching the
					// initial paint keeps the first frame cheap on a 50-offer page.
					removeClippedSubviews
					initialNumToRender={8}
					maxToRenderPerBatch={8}
					windowSize={7}
				/>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>

			<OffersFilterSheet
				visible={filterVisible}
				onClose={() => setFilterVisible(false)}
				section={filterSection}
				offers={offers}
				retailers={retailers}
				categories={categories}
				value={filter}
				onApply={(next) => {
					setFilter(next);
					setFilterVisible(false);
				}}
			/>
		</View>
	);
}

/** Same anatomy as the home carousel card, one size up: the number in its own
 * tile with an icon, and right beside it the thing the list never used to say —
 * whether the percentage comes off the price or off a second unit.
 *
 * Memoized, and takes `onOpenOffer` + the offer instead of a pre-bound
 * `onOpen` closure, so its props stay referentially stable across re-renders
 * of the list (a fresh `() => onOpenOffer(o.id)` per render would defeat the
 * memo on every single card, every time). */
const OfferCard = memo(function OfferCard({
	offer,
	onOpenOffer,
	colors,
	styles,
}: {
	offer: Offer;
	onOpenOffer: (offerId: string) => void;
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
			onPress={() => onOpenOffer(offer.id)}
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
});

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	scrollContent: { padding: space.lg },
	listHeader: { gap: space.md, marginBottom: space.md },
	offerRow: { gap: space.md },
	offerCol: { flex: 1 },
	intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	filterBarRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
	filterPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderRadius: 20,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	filterPillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	filterPillText: {
		fontFamily: typography.family.medium,
		fontSize: 12,
		color: colors.defaultText,
	},
	filterPillTextActive: { color: colors.buttonText },
	clearFiltersButton: {
		marginTop: 6,
		backgroundColor: colors.navy,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 10,
	},
	clearFiltersText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 13 },
	offerCard: {
		borderRadius: 18,
		paddingHorizontal: space.lg,
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
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
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
	appliesChipWarm: { backgroundColor: colors.warmChip },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 13, lineHeight: 17 },
	appliesTextWarm: { color: colors.warmChipText },
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
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
	priceNow: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 18 },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		textDecorationLine: "line-through",
	},
	offerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	offerStoreRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
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
