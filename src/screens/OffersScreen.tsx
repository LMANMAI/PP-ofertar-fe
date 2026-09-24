import { memo, useEffect, useMemo, useRef, useState } from "react";
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
	OffersFilterSheet,
	type OffersFilterSection,
	type OffersFilterState,
	OffersSortSheet,
	ScreenHeader,
	Skeleton,
	type TabKey,
	StoreBadge,
} from "../components";
import { radii, space, typography, useIsTablet, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import {
	ALL_CATEGORIES,
	getOffers,
	getRecurringProducts,
	offerCategories,
	offerCategoryLabel,
	offerPromo,
} from "../services";
import { friendlyAuthError } from "../services/authApi";
import type { Offer, PromoIcon, RecurringProduct } from "../services";
import type { Session } from "../auth/session";
import { formatLongDate } from "../utils/format";
import { isInBasket } from "../utils/basket";

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

type SortKey = "relevance" | "discount" | "price" | "expiry";

type OffersCache = {
	token: string;
	offers: Offer[];
	page: number;
	totalPages: number;
	filter: OffersFilterState;
	onlyBasket: boolean;
	sort: SortKey;
	recurring: RecurringProduct[];
	knownRetailers: { slug: string; name: string }[];
	knownCategories: string[];
};

// The screen unmounts whenever the user visits another tab, which used to
// throw away the filters, the order and every page already loaded. What was on
// screen is kept here and shown at once; the first page is refreshed behind it.
let offersCache: OffersCache | null = null;

function ItemSeparator() {
	return <View style={{ height: space.md }} />;
}

const SORT_LABELS: Record<SortKey, string> = {
	relevance: "De tu compra primero",
	discount: "Mayor descuento",
	price: "Menor precio",
	expiry: "Vence antes",
};

function discountOf(o: Offer): number {
	return o.discountPct ?? Math.max(0, ...(o.discountPercentages ?? []));
}

function expiryOf(o: Offer): number | null {
	if (!o.activeTo) return null;
	const t = new Date(o.activeTo).getTime();
	return Number.isNaN(t) ? null : t;
}

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
	const cached = offersCache?.token === session.token ? offersCache : null;
	const [offers, setOffers] = useState<Offer[]>(cached?.offers ?? []);
	const [loading, setLoading] = useState(!cached);
	const [error, setError] = useState<string | null>(null);
	// What the user habitually buys, to tag and float the offers that are theirs.
	// A failure here only means nothing gets tagged.
	const [recurring, setRecurring] = useState<RecurringProduct[]>(cached?.recurring ?? []);
	const [onlyBasket, setOnlyBasket] = useState(cached?.onlyBasket ?? false);
	const [sort, setSort] = useState<SortKey>(cached?.sort ?? "relevance");
	const [sortVisible, setSortVisible] = useState(false);
	const listRef = useRef<FlatList<Offer>>(null);

	const [filter, setFilter] = useState<OffersFilterState>(
		cached?.filter ?? { retailerSlugs: new Set(), categories: new Set() },
	);
	const [filterVisible, setFilterVisible] = useState(false);
	const [filterSection, setFilterSection] = useState<OffersFilterSection>("retailers");
	/** The chains to offer as chips, captured from an unfiltered page. Deriving
	 * them from the current page would erase every other chain the moment one
	 * is picked, leaving no way back. */
	const [knownRetailers, setKnownRetailers] = useState<{ slug: string; name: string }[]>(cached?.knownRetailers ?? []);
	/** Same reasoning as knownRetailers: captured while no category is picked,
	 * so choosing one does not leave the sheet with a single option. */
	const [knownCategories, setKnownCategories] = useState<string[]>(cached?.knownCategories ?? []);
	const [page, setPage] = useState(cached?.page ?? 1);
	const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loadMoreError, setLoadMoreError] = useState(false);

// Stable keys, so re-selecting the same values does not refetch.
	const chainKey = [...filter.retailerSlugs].sort().join(",");
	const categoryKey = [...filter.categories].sort().join(",");

	/**
	 * One page of the feed. `append` distinguishes scrolling further down from
	 * starting over, which is what happens when the chain filter changes: the
	 * query is different, so the pages behind it are too.
	 */
	const seqRef = useRef(0);
	const firstRun = useRef(true);
	const loadPage = (target: number, append: boolean, silent = false) => {
		const chains = chainKey ? chainKey.split(",") : undefined;
		const categories = categoryKey ? categoryKey.split(",") : undefined;
		// A new first page invalidates whatever is still in flight: a slow answer
		// for an old filter must not land on top of the current one, and a
		// "load more" for the old query must not append to the new list.
		const seq = append ? seqRef.current : ++seqRef.current;
		if (append) {
			setLoadingMore(true);
			setLoadMoreError(false);
		} else {
			setLoadingMore(false);
			setLoadMoreError(false);
			// Silent: the screen already shows the cached list, refresh it behind.
			if (!silent) setLoading(true);
		}
		getOffers(session.token, target, PAGE_SIZE, chains, categories)
			.then((data) => {
				if (seq !== seqRef.current) return;
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
				if (seq !== seqRef.current) return;
				// A failed "load more" leaves what is already on screen alone and
				// says so under the list; only a failed first page takes it over,
				// and a failed background refresh keeps the cached list.
				if (append) setLoadMoreError(true);
				else if (!silent) setError(friendlyAuthError(err));
			})
			.finally(() => {
				if (seq !== seqRef.current) return;
				if (append) setLoadingMore(false);
				else setLoading(false);
			});
	};

	useEffect(() => {
		const silent = firstRun.current && cached != null;
		firstRun.current = false;
		loadPage(1, false, silent);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token, chainKey, categoryKey]);

	useEffect(() => {
		if (loading && offers.length === 0) return;
		offersCache = {
			token: session.token,
			offers,
			page,
			totalPages,
			filter,
			onlyBasket,
			sort,
			recurring,
			knownRetailers,
			knownCategories,
		};
	}, [session.token, loading, offers, page, totalPages, filter, onlyBasket, sort, recurring, knownRetailers, knownCategories]);

	useEffect(() => {
		getRecurringProducts(session.token)
			.then(setRecurring)
			.catch(() => setRecurring([]));
	}, [session.token]);

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

	const basketIds = useMemo(
		() => new Set(offers.filter((o) => isInBasket(o, recurring)).map((o) => o.id)),
		[offers, recurring],
	);
	const hasExpiry = useMemo(() => offers.some((o) => o.activeTo != null), [offers]);
	// "De tu compra primero" only exists when something in the list is the
	// user's: otherwise it would be the feed's own order, which is already by
	// discount, and the chip would offer two options that look identical.
	const sortKeys = useMemo(
		() =>
			[
				...(basketIds.size > 0 ? ["relevance"] : []),
				"discount",
				"price",
				...(hasExpiry ? ["expiry"] : []),
			] as SortKey[],
		[basketIds.size, hasExpiry],
	);
	const activeSort: SortKey = sortKeys.includes(sort) ? sort : sortKeys[0];

	// Both filters now narrow the query, so the first pass is a no-op against a
	// current backend. Kept so an app talking to one that predates the parameters
	// still behaves the way it used to instead of ignoring the filter entirely.
	const visibleOffers = useMemo(() => {
		const filtered = offers.filter((o) => {
			if (filter.retailerSlugs.size > 0 && (!o.retailerSlug || !filter.retailerSlugs.has(o.retailerSlug))) {
				return false;
			}
			if (filter.categories.size > 0 && (!o.category || !filter.categories.has(o.category))) {
				return false;
			}
			if (onlyBasket && !basketIds.has(o.id)) return false;
			return true;
		});
		const withIndex = filtered.map((o, i) => ({ o, i }));
		// Array.prototype.sort is stable, but the tie-break by feed position is
		// explicit so "relevance" (basket first, then the feed's own order) is
		// obviously deterministic.
		withIndex.sort((a, b) => {
			switch (activeSort) {
				case "discount":
					return discountOf(b.o) - discountOf(a.o) || a.i - b.i;
				case "price": {
					const pa = a.o.price ?? Number.POSITIVE_INFINITY;
					const pb = b.o.price ?? Number.POSITIVE_INFINITY;
					return pa - pb || a.i - b.i;
				}
				case "expiry": {
					const ea = expiryOf(a.o) ?? Number.POSITIVE_INFINITY;
					const eb = expiryOf(b.o) ?? Number.POSITIVE_INFINITY;
					return ea - eb || a.i - b.i;
				}
				default: {
					const ba = basketIds.has(a.o.id) ? 0 : 1;
					const bb = basketIds.has(b.o.id) ? 0 : 1;
					return ba - bb || a.i - b.i;
				}
			}
		});
		return withIndex.map((x) => x.o);
	}, [offers, filter, onlyBasket, activeSort, basketIds]);

	const hasMore = page < totalPages;
	// "De mi compra" filters what is already loaded, so a first page with none of
	// the user's offers would read as "no results" while more pages are still to
	// come. Keep fetching until one shows up or the feed ends.
	const awaitingMore = onlyBasket && hasMore && visibleOffers.length === 0 && !loading && !error && offers.length > 0;
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- keeps paging while the basket filter has nothing to show yet
		if (awaitingMore && !loadingMore && !loadMoreError) loadPage(page + 1, true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [awaitingMore, loadingMore, loadMoreError, page]);
	const clearAll = () => {
		setFilter({ retailerSlugs: new Set(), categories: new Set() });
		setOnlyBasket(false);
	};

	const openFilter = (section: OffersFilterSection) => {
		setFilterSection(section);
		setFilterVisible(true);
	};

	const activeChips: { key: string; label: string; onRemove: () => void }[] = [
		...[...filter.retailerSlugs].map((slug) => ({
			key: `r:${slug}`,
			label: retailers.find((r) => r.slug === slug)?.name ?? slug,
			onRemove: () =>
				setFilter((f) => {
					const next = new Set(f.retailerSlugs);
					next.delete(slug);
					return { ...f, retailerSlugs: next };
				}),
		})),
		...[...filter.categories].map((cat) => ({
			key: `c:${cat}`,
			label: cat,
			onRemove: () =>
				setFilter((f) => {
					const next = new Set(f.categories);
					next.delete(cat);
					return { ...f, categories: next };
				}),
		})),
		...(onlyBasket ? [{ key: "basket", label: "De mi compra", onRemove: () => setOnlyBasket(false) }] : []),
	];

	const selectSort = (key: SortKey) => {
		setSort(key);
		setSortVisible(false);
		// The change is invisible when the first cards happen to stay the same,
		// so the list goes back to the top to show the new order from the start.
		listRef.current?.scrollToOffset({ offset: 0, animated: false });
	};
	const showBasketChip = recurring.length > 0 && (basketIds.size > 0 || onlyBasket);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Ofertas para vos" logo />

			{loading && offers.length === 0 && ( <View style={styles.skeletonList} accessible accessibilityLabel="Cargando ofertas">
					{Array.from({ length: 3 }).map((_, i) => (
						<OfferCardSkeleton key={i} styles={styles} />
					))}
				</View>
			)}

			{error && !loading && <ErrorBanner message={error} onRetry={() => loadPage(1, false)} />}

			{!loading && !error && offers.length === 0 && (
				<EmptyState
					icon="pricetags-outline"
					title="No hay ofertas vigentes"
					hint="No encontramos ofertas en los súper que elegiste como favoritos. Probá sumando cadenas desde tu perfil."
					action={{ label: "Ir a mi perfil", onPress: () => onSelectTab("profile") }}
				/>
			)}

			{awaitingMore && (
				<View style={styles.searchingMore} accessibilityLiveRegion="polite">
					{loadMoreError ? (
						<>
							<Text style={styles.footerText}>No pudimos cargar más ofertas.</Text>
							<Pressable
								onPress={() => loadPage(page + 1, true)}
								style={(state) => [styles.footerRetry, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel="Reintentar cargar más ofertas"
							>
								<Text style={styles.footerRetryText}>Reintentar</Text>
							</Pressable>
						</>
					) : (
						<>
							<ActivityIndicator color={colors.subtleText} />
							<Text style={styles.footerText}>Buscando tus productos en más ofertas…</Text>
						</>
					)}
				</View>
			)}

			{!loading && !error && !awaitingMore && offers.length > 0 && visibleOffers.length === 0 && (
				<EmptyState
					icon="filter-outline"
					title="Ninguna oferta coincide con estos filtros"
					hint="Probá sacando algún filtro para ver más resultados."
					action={{
						label: "Limpiar filtros",
						onPress: clearAll,
					}}
				/>
			)}

			{!error && offers.length > 0 && visibleOffers.length > 0 && ( <FlatList ref={listRef} accessibilityState={{ busy: loading }}
					// A restructure, not a stretch: on a tablet-width viewport the same
					// cards lay out two to a row instead of one full-width column.
					key={isTablet ? "grid" : "list"}
					numColumns={isTablet ? 2 : 1}
					columnWrapperStyle={isTablet ? styles.offerRow : undefined}
					style={[styles.scroll, loading && styles.scrollBusy]}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					data={visibleOffers}
					keyExtractor={(o) => o.id}
					onEndReachedThreshold={0.5}
					onEndReached={() => {
						if (!loading && !loadingMore && !loadMoreError && hasMore) loadPage(page + 1, true);
					}}
					ListFooterComponent={
						loadingMore ? (
							<View style={styles.footerNote}>
								<ActivityIndicator color={colors.subtleText} />
							</View>
						) : loadMoreError ? (
							<View style={styles.footerNote} accessibilityRole="alert" accessibilityLiveRegion="polite">
								<Text style={styles.footerText}>No pudimos cargar más ofertas.</Text>
								<Pressable
									onPress={() => loadPage(page + 1, true)}
									style={(state) => [styles.footerRetry, isFocused(state) && styles.focusRing]}
									accessibilityRole="button"
									accessibilityLabel="Reintentar cargar más ofertas"
								>
									<Text style={styles.footerRetryText}>Reintentar</Text>
								</Pressable>
							</View>
						) : !hasMore ? (
							<View style={styles.footerNote}>
								<Text style={styles.footerText}>Ya viste todas las ofertas.</Text>
							</View>
						) : null
					}
					ItemSeparatorComponent={ItemSeparator}
					ListHeaderComponent={
						<>
							{/* The percentage on every card is measured against the list price the
							    chain itself publishes; saying so once here keeps it off each card. */}
							<Text style={styles.intro}>
								Todo lo que está en oferta en los súper que elegiste. El descuento se calcula sobre el
								precio de lista que publica cada uno.
							</Text>

							<View style={styles.filterBarRow}>
								<FilterPill
									icon="storefront-outline"
									label="Supermercados"
									count={filter.retailerSlugs.size}
									onPress={() => openFilter("retailers")}
									styles={styles}
									colors={colors}
								/>
								<FilterPill
									icon="pricetags-outline"
									label="Categorías"
									count={filter.categories.size}
									onPress={() => openFilter("categories")}
									styles={styles}
									colors={colors}
								/>
								{showBasketChip && (
									<FilterPill
										icon="cart-outline"
										label="De mi compra"
										active={onlyBasket}
										onPress={() => setOnlyBasket((v) => !v)}
										styles={styles}
										colors={colors}
									/>
								)}
							</View>

							{activeChips.length > 0 && (
								<View style={styles.activeRow}>
									{activeChips.map((c) => (
										<Pressable
											key={c.key}
											onPress={c.onRemove}
											style={(state) => [styles.activeChip, isFocused(state) && styles.focusRing]}
											accessibilityRole="button"
											accessibilityLabel={`Quitar filtro ${c.label}`}
										>
											<Text style={styles.activeChipText} numberOfLines={1}>{c.label}</Text>
											<Ionicons name="close" size={14} color={colors.actionText} />
										</Pressable>
									))}
									<Pressable
										onPress={clearAll}
										style={(state) => [styles.clearAll, isFocused(state) && styles.focusRing]}
										accessibilityRole="button"
										accessibilityLabel="Limpiar todos los filtros"
									>
										<Text style={styles.clearAllText}>Limpiar todo</Text>
									</Pressable>
								</View>
							)}

							<View style={styles.resultsRow}>
								<Text style={styles.resultsText} accessibilityLiveRegion="polite">
									{hasMore
										? `${visibleOffers.length} ofertas cargadas`
										: `${visibleOffers.length} ${visibleOffers.length === 1 ? "oferta" : "ofertas"}`}
								</Text>
								<Pressable
									onPress={() => setSortVisible(true)}
									style={(state) => [styles.sortChip, isFocused(state) && styles.focusRing]}
									accessibilityRole="button"
									accessibilityLabel={`Orden: ${SORT_LABELS[activeSort]}. Tocá para elegir otro`}
								>
									<Ionicons name="swap-vertical" size={14} color={colors.defaultText} />
									<Text style={styles.sortChipText}>{SORT_LABELS[activeSort]}</Text>
								</Pressable>
							</View>
						</>
					}
					ListHeaderComponentStyle={styles.listHeader}
					renderItem={({ item: o }) => (
						<View style={isTablet ? styles.offerCol : undefined}>
							<OfferCard
								offer={o}
								inBasket={basketIds.has(o.id)}
								onOpenOffer={onOpenOffer}
								colors={colors}
								styles={styles}
							/>
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

			<OffersSortSheet
				visible={sortVisible}
				onClose={() => setSortVisible(false)}
				options={sortKeys.map((k) => ({ key: k, label: SORT_LABELS[k] }))}
				value={activeSort}
				onSelect={selectSort}
				note={hasMore ? "Ordena las ofertas que ya cargaste; hay más al bajar." : undefined}
			/>

			<OffersFilterSheet visible={filterVisible} onClose={() => setFilterVisible(false)} section={filterSection} retailers={retailers}
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

/** A 44px filter chip. `count` is how many values of a sheet-backed filter are
 * selected; `active` is for a plain on/off chip. Either one fills it navy. */
function FilterPill({
	icon,
	label,
	count = 0,
	active,
	onPress,
	styles,
	colors,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	count?: number;
	active?: boolean;
	onPress: () => void;
	styles: ReturnType<typeof createStyles>;
	colors: ColorTokens;
}) {
	const on = active ?? count > 0;
	return (
		<Pressable
			style={(state) => [styles.filterPill, on && styles.filterPillActive, isFocused(state) && styles.focusRing]}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={count > 0 ? `${label}, ${count} seleccionados` : label}
			accessibilityState={{ selected: on }}
		>
			<Ionicons name={icon} size={14} color={on ? colors.actionText : colors.defaultText} />
			<Text style={[styles.filterPillText, on && styles.filterPillTextActive]}>
				{label}
				{count > 0 ? ` (${count})` : ""}
			</Text>
		</Pressable>
	);
}

/** Placeholder with the geometry of an OfferCard, so the list does not jump
 * when the first page arrives. Not pressable: it is not content yet. */
function OfferCardSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
	return (
		<Skeleton style={styles.offerCard}>
			<View style={styles.skeletonStoreRow}>
				<View style={styles.skeletonBadge} />
				<View style={styles.skeletonLine} />
			</View>
			<View style={styles.offerBody}>
				<View style={[styles.amountTile, styles.skeletonTile]} />
				<View style={styles.offerBodyRight}>
					<View style={styles.skeletonLine} />
					<View style={[styles.skeletonLine, styles.skeletonLineShort]} />
				</View>
			</View>
		</Skeleton>
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
	inBasket,
	onOpenOffer,
	colors,
	styles,
}: {
	offer: Offer;
	inBasket: boolean;
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

	const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
	const spoken = [
		`${offer.kind === "catalog" ? "Oferta" : "Promoción"} en ${offer.retailerName ?? "tu súper"}${offer.province ? `, ${offer.province}` : ""}`,
		offer.kind === "catalog"
			? offer.productName ?? offer.headline
			: promo
				? `${promo.amount ?? ""} ${promo.applies}`.trim()
				: offer.headline,
		offer.kind === "catalog" && catalogPct ? `${catalogPct} de descuento` : null,
		offer.kind === "catalog" && offer.price != null ? money(offer.price) : null,
		offer.kind === "catalog" && offer.price != null && offer.listPrice != null && offer.listPrice > offer.price
			? `antes ${money(offer.listPrice)}`
			: null,
		until ? `vigente hasta el ${until}` : "vigencia no informada",
		inBasket ? "de tu compra" : null,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<Pressable
			onPress={() => onOpenOffer(offer.id, offer)}
			style={(state) => [styles.offerCard, state.pressed && styles.offerCardPressed, isFocused(state) && styles.focusRing]}
			accessibilityRole="button"
			accessibilityLabel={spoken}
		>
			<View style={styles.offerHeader}>
				<View style={styles.offerStoreRow}>
					<StoreBadge retailerSlug={offer.retailerSlug} retailerName={offer.retailerName} />
					<Text style={styles.storeName} numberOfLines={1}>
						{offer.retailerName}
						{offer.province ? ` · ${offer.province}` : ""}
					</Text>
				</View>
				{inBasket && (
					<View style={styles.basketTag}>
						<Ionicons name="cart-outline" size={12} color={colors.infoSoftText} />
						<Text style={styles.basketTagText}>De tu compra</Text>
					</View>
				)}
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
											Antes ${Math.round(offer.listPrice).toLocaleString("es-AR")}
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

			{/* Categoría y vigencia comparten renglón. Una oferta sin fecha lo dice en
			    vez de callarlo: sin vencimiento no se puede saber si va a seguir ahí
			    cuando llegue al súper. */}
			<View style={styles.offerMetaRow}>
				{category !== null && (
					<View style={styles.categoryChip} accessibilityLabel={`Categoría: ${category}`}>
						<Ionicons name="pricetags-outline" size={11} color={colors.mutedText2} />
						<Text style={styles.categoryChipText} numberOfLines={1}>
							{category}
						</Text>
					</View>
				)}
				{until !== null ? (
					<Text style={styles.offerValidity}>Vigente hasta el {until}</Text>
				) : (
					<Text style={styles.offerValidityMissing}>Vigencia no informada</Text>
				)}
			</View>

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
		scrollBusy: { opacity: 0.5 },
		searchingMore: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm, padding: space.xl },
	scrollContent: { padding: space.lg },
	listHeader: { gap: space.md, marginBottom: space.md },
	offerRow: { gap: space.md },
	offerCol: { flex: 1 },
	footerNote: { paddingVertical: space.xl, alignItems: "center", gap: space.xs },
	footerText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	footerRetry: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.md },
	footerRetryText: { color: colors.actionFill, fontFamily: typography.family.bold, fontSize: typography.sizes.caption, textDecorationLine: "underline" },
	intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	filterBarRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm, marginTop: space.xs },
	filterPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
		minHeight: 44,
		paddingHorizontal: space.md,
		borderRadius: radii.full,
		backgroundColor: colors.card,
		borderWidth: 1,
		// The chip's edge is what delimits it on the page (~3:1), not the hairline.
		borderColor: colors.inputBorder,
	},
	filterPillActive: { backgroundColor: colors.actionFill, borderColor: colors.actionFill },
	filterPillText: {
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		color: colors.defaultText,
	},
	filterPillTextActive: { color: colors.actionText },
	activeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
	activeChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xs,
		minHeight: 44,
		maxWidth: "100%",
		paddingHorizontal: space.md,
		borderRadius: radii.full,
		backgroundColor: colors.actionFill,
	},
	activeChipText: { flexShrink: 1, color: colors.actionText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	clearAll: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm },
	clearAllText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, textDecorationLine: "underline" },
	resultsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	resultsText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	sortChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
		minHeight: 44,
		paddingHorizontal: space.md,
		borderRadius: radii.full,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.inputBorder,
	},
	sortChipText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	offerCard: {
		borderRadius: radii.xl,
		paddingHorizontal: space.lg,
		paddingVertical: space.mdPlus,
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
	},
	offerCardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
	focusRing: focusRing(colors),
	skeletonList: { padding: space.lg, gap: space.md },
	skeletonStoreRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
	skeletonBadge: { width: 28, height: 28, borderRadius: radii.full, backgroundColor: colors.softWarm },
	skeletonLine: { flex: 1, height: 14, borderRadius: radii.sm, backgroundColor: colors.softWarm },
	skeletonLineShort: { flex: 0, width: "60%" },
	skeletonTile: { backgroundColor: colors.softWarm, height: 70 },
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.mdPlus },
	// The number gets a block of its own instead of being one more line of
	// text. Same anatomy as the home carousel so the two read as one system.
	amountTile: {
		width: 88,
		borderRadius: radii.lg,
		paddingVertical: space.smPlus,
		paddingHorizontal: space.xsPlus,
		alignItems: "center",
		justifyContent: "center",
		gap: 2, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.navyHairline, },
	amountTileFlat: { paddingVertical: space.xl },
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
	amountKicker: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		letterSpacing: 0.8,
	},
	amountValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: typography.sizes.h1 },
	offerBodyRight: { flex: 1, justifyContent: "center", gap: space.xsPlus },
	appliesChip: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		paddingHorizontal: space.sm,
		paddingVertical: space.xsPlus,
		borderRadius: radii.sm,
		backgroundColor: colors.softNavy,
	},
	// Warm for anything not simply taken off the price, so a "50% en la 2da
	// unidad" never looks like a plain 50% off.
	appliesChipWarm: { backgroundColor: colors.warmChip },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	appliesTextWarm: { color: colors.warmChipText },
	offerDetail: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	offerProduct: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
	priceNow: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.bodyL },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		textDecorationLine: "line-through",
	},
	offerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
	basketTag: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.infoSoft, borderRadius: radii.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
	basketTagText: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	offerStoreRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
	storeName: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
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
		paddingVertical: space.xs,
		borderRadius: radii.full,
		borderWidth: 1,
		borderColor: colors.divider,
		backgroundColor: colors.background,
	},
	categoryChipText: {
		flexShrink: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	offerValidity: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	offerValidityMissing: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	offerApplies: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	offerCaveat: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
		fontStyle: "italic",
	},
	});
}
