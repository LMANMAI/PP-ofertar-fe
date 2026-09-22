import { memo, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
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
	StoreBadge,
} from "../components";
import { space, typography, useIsTablet, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { ALL_CATEGORIES, getOffers, offerCategories, offerCategoryLabel, offerPromo } from "../services";
import type { Offer, PromoIcon } from "../services";
import type { Session } from "../auth/session";
import { formatLongDate } from "../utils/format";

type Props = {
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	/** Se manda la oferta entera, no solo el id. Esta pantalla tiene su propia
	 * lista —paginada y filtrada— distinta de la que guarda el router, asi que
	 * cualquier oferta de la pagina 2 en adelante, o traida por un filtro, no
	 * existe del otro lado y el detalle abre vacio. */
	onOpenOffer: (offerId: string, fallback?: Offer | null) => void;
};

/** The backend caps a page at 50; asking for more silently gets 50 anyway. */
const PAGE_SIZE = 50;

/** The chains present in a page of offers, named and sorted for the filter. */
function retailersOf(offers: Offer[]): { slug: string; name: string }[] {
	const bySlug = new Map<string, string>();
	for (const o of offers) {
		if (o.retailerSlug && o.retailerName && !bySlug.has(o.retailerSlug)) {
			bySlug.set(o.retailerSlug, o.retailerName);
		}
	}
	return [...bySlug.entries()]
		.map(([slug, name]) => ({ slug, name }))
		.sort((a, b) => a.name.localeCompare(b.name, "es"));
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
	/** The chains to offer as chips, captured from an unfiltered page. Deriving
	 * them from the current page would erase every other chain the moment one
	 * is picked, leaving no way back. */
	const [knownRetailers, setKnownRetailers] = useState<{ slug: string; name: string }[]>([]);
	/** Same reasoning as knownRetailers: captured while no category is picked,
	 * so choosing one does not leave the sheet with a single option. */
	const [knownCategories, setKnownCategories] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);

// Stable keys, so re-selecting the same values does not refetch.
	const chainKey = [...filter.retailerSlugs].sort().join(",");
	const categoryKey = [...filter.categories].sort().join(",");

	/**
	 * One page of the feed. `append` distinguishes scrolling further down from
	 * starting over, which is what happens when the chain filter changes: the
	 * query is different, so the pages behind it are too.
	 */
	const loadPage = (target: number, append: boolean) => {
		const chains = chainKey ? chainKey.split(",") : undefined;
		const categories = categoryKey ? categoryKey.split(",") : undefined;
		if (append) setLoadingMore(true);
		else setLoading(true);
		getOffers(session.token, target, PAGE_SIZE, chains, categories)
			.then((data) => {
				setOffers((prev) => {
					if (!append) return data.items;
					// The catalog can shift between two requests, so the same offer
					// can arrive twice; keep the copy already on screen.
					const seen = new Set(prev.map((o) => o.id));
					return [...prev, ...data.items.filter((o) => !seen.has(o.id))];
				});
				// Captured from an unfiltered page only, so picking one chain does
				// not erase the chips for all the others.
				if (!append && !chains) setKnownRetailers(retailersOf(data.items));
				if (!append && !categories) {
					setKnownCategories(offerCategories(data.items).filter((c) => c !== ALL_CATEGORIES));
				}
				setPage(data.page);
				setTotalPages(Math.max(1, data.totalPages));
				setError(null);
			})
			.catch((err) => {
				// A failed "load more" leaves what is already on screen alone; only
				// a failed first page is worth taking it over.
				if (!append) setError(err instanceof Error ? err.message : "Error al cargar las ofertas");
			})
			.finally(() => {
				if (append) setLoadingMore(false);
				else setLoading(false);
			});
	};

	useEffect(() => {
		loadPage(1, false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token, chainKey, categoryKey]);

	// Built from the offers on screen rather than a fixed list, so a filter
	// never offers a chip or checkbox that matches nothing.
	const categories = useMemo(
		() =>
			knownCategories.length > 0
				? knownCategories
				: offerCategories(offers).filter((c) => c !== ALL_CATEGORIES),
		[knownCategories, offers],
	);
	const retailers = useMemo(
		() => (knownRetailers.length > 0 ? knownRetailers : retailersOf(offers)),
		[knownRetailers, offers],
	);

	// Both filters now narrow the query, so this is a no-op against a current
	// backend. Kept so an app talking to one that predates the parameters still
	// behaves the way it used to instead of ignoring the filter entirely.
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
					onEndReachedThreshold={0.5}
					onEndReached={() => {
						if (!loading && !loadingMore && page < totalPages) loadPage(page + 1, true);
					}}
					ListFooterComponent={
						loadingMore ? (
							<View style={styles.loadingMore}>
								<ActivityIndicator color={colors.subtleText} />
							</View>
						) : null
					}
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
	onOpenOffer: (offerId: string, fallback?: Offer | null) => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const until = formatLongDate(offer.activeTo);
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
	// La categoría, que hasta ahora sólo se veía abriendo la oferta —y ni
	// siquiera siempre: colgaba de la línea de marca, así que una oferta sin
	// marca la escondía del todo—. `offerCategoryLabel` es una función de
	// módulo, no una closure nueva por render, así que no toca el memo.
	const category = offerCategoryLabel(offer.category);

	return (
		<Pressable
			onPress={() => onOpenOffer(offer.id, offer)}
			style={({ pressed }) => [styles.offerCard, pressed && styles.offerCardPressed]}
		>
			<View style={styles.offerHeader}>
				<View style={styles.offerStoreRow}>
					<StoreBadge retailerSlug={offer.retailerSlug} retailerName={offer.retailerName} />
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

			{/* Categoría y vigencia comparten renglón en vez de sumar uno cada una.
			    Sin ninguna de las dos no se dibuja la fila, así que una oferta de
			    folleto —sin categoría y muchas veces sin vigencia— no queda con un
			    hueco donde antes no había nada. */}
			{(category !== null || until !== null) && (
				<View style={styles.offerMetaRow}>
					{category !== null && (
						<View style={styles.categoryChip} accessibilityLabel={`Categoría: ${category}`}>
							<Ionicons name="pricetags-outline" size={11} color={colors.mutedText2} />
							<Text style={styles.categoryChipText} numberOfLines={1}>
								{category}
							</Text>
						</View>
					)}
					{until !== null && <Text style={styles.offerValidity}>Vigente hasta el {until}</Text>}
				</View>
			)}

			{/* Sólo la marca: la categoría se mudó al chip de arriba y repetirla acá
			    sería decir dos veces lo mismo en la misma card. */}
			{offer.brand && (
				<Text style={styles.offerApplies} numberOfLines={1}>
					{offer.brand}
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
	loadingMore: { paddingVertical: 20, alignItems: "center" },
	intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	filterBarRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
	filterPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
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
	offerCard: {
		borderRadius: 18,
		paddingHorizontal: space.lg,
		paddingVertical: space.mdPlus,
		gap: space.smPlus,
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
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.mdPlus },
	// The number gets a block of its own instead of being one more line of
	// text. Same anatomy as the home carousel so the two read as one system.
	amountTile: {
		width: 88,
		borderRadius: 14,
		paddingVertical: space.smPlus,
		paddingHorizontal: space.xsPlus,
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
	offerBodyRight: { flex: 1, justifyContent: "center", gap: space.xsPlus },
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
	storeName: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	// Un solo renglón para los dos metadatos de contexto. `flexWrap` está porque
	// en tablet la card va a media pantalla: ahí una categoría larga más "Vigente
	// hasta el 31 de diciembre" no entran juntas y la vigencia baja sola, en vez
	// de recortarse.
	offerMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm },
	// La categoría va como chip y no como una línea más de texto porque es,
	// además, el eje por el que se filtra: mismo ícono que la píldora
	// "Categorías" de la barra de filtros, mismo borde `divider` y mismo texto
	// apagado, así que se lee como "de acá sale ese filtro". Deliberadamente
	// distinto del chip de "aplica a", que va lleno y en negrita porque dice algo
	// de la promoción; la categoría es contexto, no una promesa comercial.
	// El relleno es `background` —el fondo de la pantalla— así que sobre la card
	// se lee como un hueco: claro sobre blanco en tema claro, oscuro sobre la
	// superficie de card en tema oscuro. Los dos son tokens, no hex fijos.
	categoryChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xs,
		flexShrink: 1,
		maxWidth: "100%",
		paddingHorizontal: space.sm,
		paddingVertical: 3,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.divider,
		backgroundColor: colors.background,
	},
	categoryChipText: {
		flexShrink: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.medium,
		fontSize: 11,
		lineHeight: 15,
	},
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
