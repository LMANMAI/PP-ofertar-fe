import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	FlatList,
	LayoutAnimation,
	Platform,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import {
	bestKnownDiscount,
	campaignOfferToOffer,
	describeCampaignDiscount,
	getRecurringProducts,
	offerSavings,
	sortByOfferRelevance,
	summarizeOfferPromos,
} from "../services";
import type { CampaignOffer, FeaturedPromo, Offer, RecurringProduct } from "../services";
import { friendlyAuthError } from "../services/authApi";
import type { Session } from "../auth/session";
import { BottomNav, EmptyState, ErrorBanner, ScreenHeader, Skeleton, type TabKey } from "../components";
import { OffersSortSheet } from "../components/OffersSortSheet";
import { ProductOfferLine, offerSummary } from "../components/ProductOfferLine";
import { formatCurrency, formatLongDate } from "../utils/format";
import { isLooseMatch } from "../utils/productMatch";

function formatFrequency(purchaseCount: number, ticketCount: number): string {
	const tickets = ticketCount === 1 ? "1 ticket" : `${ticketCount} tickets`;
	return purchaseCount > ticketCount ? `En ${tickets} · ${purchaseCount} veces` : `En ${tickets}`;
}

function daysUntil(iso: string | null): number | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

// The old architecture's bridge needs this opt-in per-platform; the New
// Architecture (Fabric) ignores it and LayoutAnimation just works.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Whether any shown promotion carries OCR-read percentages, which is what the
 * "verificá en el local" disclaimer qualifies. */
function hasGuessedPercentages(offers: CampaignOffer[]): boolean {
	// Only the OCR-only ones. A percentage taken from the campaign's own
	// metadata is not a guess, and warning about it would undersell a number
	// that is in fact reliable.
	return offers.some((c) => c.percentagesUnverified && c.discountPercentages.length > 0);
}

type SortKey = "relevance" | "discount" | "purchases" | "expiry";

const SORT_LABELS: Record<SortKey, string> = {
	relevance: "Recomendado",
	discount: "Mayor descuento",
	purchases: "Más comprados",
	expiry: "Vence pronto",
};

/** A product plus what the screen derives from it once, so sorting and grouping
 * do not recompute the match on every render. */
type Item = {
	/** Stable across sorts and refreshes of the same list; a barcode alone can
	 * repeat and a description can collide, so the position disambiguates. */
	id: string;
	product: RecurringProduct;
	/** The price on the card is probably for a different product. */
	loose: boolean;
	hasOffer: boolean;
	/** Percentage used to rank "Mayor descuento". A catalog price for a loosely
	 * matched product does not count: it is not this product's discount. */
	discount: number;
	/** Earliest campaign end still ahead, as a timestamp. */
	expiresAt: number | null;
};

function toItem(product: RecurringProduct, index: number): Item {
	const loose = product.bestOffer != null && isLooseMatch(product.description, product.bestOffer.productName);
	const now = Date.now();
	const ends = product.campaignOffers
		.map((c) => (c.activeTo ? new Date(c.activeTo).getTime() : NaN))
		.filter((t) => Number.isFinite(t) && t >= now);
	return {
		id: `${product.barcode || product.description}#${index}`,
		product,
		loose,
		hasOffer: product.bestOffer != null || product.campaignOffers.length > 0 || product.alternativeOffers.length > 0,
		discount: bestKnownDiscount(loose ? { ...product, bestOffer: null } : product),
		expiresAt: ends.length > 0 ? Math.min(...ends) : null,
	};
}

function sortItems(items: Item[], key: SortKey): Item[] {
	if (key === "relevance") return items;
	const sorted = [...items];
	if (key === "discount") sorted.sort((a, b) => b.discount - a.discount);
	if (key === "purchases") {
		sorted.sort(
			(a, b) =>
				b.product.ticketCount - a.product.ticketCount || b.product.purchaseCount - a.product.purchaseCount,
		);
	}
	if (key === "expiry") {
		sorted.sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
	}
	return sorted;
}

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	/** Opens a promotion in the offers detail, where its full legal text lives.
	 * The second argument carries the rebuilt offer because the feed may not
	 * contain this promotion. */
	onOpenOffer?: (id: string, fallback?: Offer | null) => void;
};

export function RecurringProductsScreen({ onBack, session, activeTab, onSelectTab, onScanPress, onOpenOffer }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [products, setProducts] = useState<RecurringProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
	const [showNoOffer, setShowNoOffer] = useState(false);
	const [sort, setSort] = useState<SortKey>("relevance");
	const [sortVisible, setSortVisible] = useState(false);
	const reduceMotion = useRef(false);

	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
			reduceMotion.current = enabled;
		});
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
			reduceMotion.current = enabled;
		});
		return () => sub.remove();
	}, []);

	const animateNext = useCallback(() => {
		// The detail block used to just pop in/out with the rest of the card
		// jumping to make room. Animating the layout pass this triggers makes
		// it read as the card growing to reveal its detail, not the list
		// reflowing under the user's thumb.
		if (!reduceMotion.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
	}, []);

	// Stable across renders so ProductCard's React.memo isn't defeated by a
	// fresh closure every time any card toggles. Several cards can stay open at
	// once: comparing two products meant closing one to read the other.
	const handleToggle = useCallback(
		(id: string) => {
			animateNext();
			setExpanded((current) => {
				const next = new Set(current);
				if (!next.delete(id)) next.add(id);
				return next;
			});
		},
		[animateNext],
	);

	const load = useCallback(
		(mode: "initial" | "refresh") => {
			if (mode === "refresh") setRefreshing(true);
			else setLoading(true);
			getRecurringProducts(session.token)
				.then((data) => {
					// Same ordering as the home carousel, so a product featured there
					// is also at the top when the user opens this section.
					setProducts(sortByOfferRelevance(data));
					setError(null);
				})
				// A failed refresh keeps the list it already had: wiping it would turn
				// a dropped connection into an empty screen.
				.catch((err) => setError(friendlyAuthError(err)))
				.finally(() => {
					setLoading(false);
					setRefreshing(false);
				});
		},
		[session.token],
	);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the session token changes
		load("initial");
	}, [load]);

	const items = useMemo(() => products.map(toItem), [products]);

	const sortKeys = useMemo<SortKey[]>(
		() => ["relevance", "discount", "purchases", ...(items.some((i) => i.expiresAt != null) ? (["expiry"] as const) : [])],
		[items],
	);
	const activeSort: SortKey = sortKeys.includes(sort) ? sort : "relevance";

	const { withOffer, withoutOffer } = useMemo(() => {
		const sorted = sortItems(items, activeSort);
		return {
			withOffer: sorted.filter((i) => i.hasOffer),
			// Nothing to act on, so no order to choose: they keep the frequency order.
			withoutOffer: items.filter((i) => !i.hasOffer),
		};
	}, [items, activeSort]);

	// What the offers on shelves save against each chain's own list price, for
	// the products where that price is plausibly the one the user pays. The
	// loosely matched ones are left out: their saving belongs to another product.
	const listSavings = useMemo(() => {
		let amount = 0;
		let count = 0;
		for (const i of items) {
			if (i.loose || !i.product.bestOffer) continue;
			const s = offerSavings(i.product.bestOffer);
			if (s) {
				amount += s.amount;
				count += 1;
			}
		}
		return { amount, count };
	}, [items]);

	const listHeader = (
		<View style={styles.listHeader}>
			{error && <ErrorBanner message={error} onRetry={() => load("refresh")} />}
			{withOffer.length > 0 ? (
				<View style={{ gap: space.xs }}>
					<Text style={styles.intro}>
						{withOffer.length} de tus {items.length} productos habituales tienen oferta ahora. Tocá uno para ver el detalle.
					</Text>
					{listSavings.count > 0 && (
						<Text style={styles.introStrong}>
							{listSavings.count === 1
								? "En el que coincide con lo que comprás, el ahorro sobre el precio de lista es de "
								: `En los ${listSavings.count} que coinciden con lo que comprás, el ahorro sobre el precio de lista suma `}
							{formatCurrency(listSavings.amount)}.
						</Text>
					)}
				</View>
			) : (
				<Text style={styles.intro}>
					Detectamos {items.length} productos que comprás seguido. Cuando alguno tenga oferta, la vas a ver acá.
				</Text>
			)}
			{withOffer.length > 1 && (
				<View style={styles.resultsRow}>
					<Text style={styles.resultsText}>Con oferta</Text>
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
			)}
		</View>
	);

	const listFooter =
		withoutOffer.length > 0 ? (
			<View style={styles.noOfferGroup}>
				<Pressable
					style={(state) => [styles.noOfferHeader, isFocused(state) && styles.focusRing]}
					onPress={() => {
						animateNext();
						setShowNoOffer((v) => !v);
					}}
					accessibilityRole="button"
					accessibilityLabel={`Sin ofertas por ahora, ${withoutOffer.length} ${withoutOffer.length === 1 ? "producto" : "productos"}`}
					accessibilityState={{ expanded: showNoOffer }}
					aria-expanded={showNoOffer}
				>
					<Text style={styles.noOfferTitle}>Sin ofertas por ahora ({withoutOffer.length})</Text>
					<Ionicons name={showNoOffer ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedText2} />
				</Pressable>
				{showNoOffer &&
					withoutOffer.map(({ id, product: p }) => (
						<View key={id} style={styles.noOfferRow}>
							<Text style={styles.name}>{p.description}</Text>
							<Text style={styles.freq}>{formatFrequency(p.purchaseCount, p.ticketCount)}</Text>
						</View>
					))}
			</View>
		) : null;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Productos recurrentes" onBack={onBack} />

			{loading && items.length === 0 && (
				<View style={styles.skeletonList} accessibilityLabel="Cargando tus productos recurrentes" accessibilityLiveRegion="polite">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} style={styles.card}>
							<View style={[styles.skeletonLine, { width: "65%" }]} />
							<View style={[styles.skeletonLine, { width: "35%", height: 12 }]} />
							<View style={[styles.skeletonLine, { width: "90%", height: 28 }]} />
						</Skeleton>
					))}
				</View>
			)}

			{error && !loading && items.length === 0 && <ErrorBanner message={error} onRetry={() => load("initial")} />}

			{!loading && !error && items.length === 0 && (
				<EmptyState
					icon="repeat-outline"
					title="Todavía no detectamos productos recurrentes"
					hint="Escaneá más tickets para que podamos reconocer tus compras habituales"
				/>
			)}

			{items.length > 0 && (
				<FlatList
					data={withOffer}
					extraData={expanded}
					keyExtractor={(i) => i.id}
					contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxl }}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.cyan} />
					}
					ListHeaderComponent={listHeader}
					ListFooterComponent={listFooter}
					ItemSeparatorComponent={ItemSeparator}
					renderItem={({ item }) => (
						<ProductCard
							item={item}
							isExpanded={expanded.has(item.id)}
							onToggle={handleToggle}
							onOpenOffer={onOpenOffer}
							colors={colors}
							styles={styles}
						/>
					)}
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
				onSelect={(key) => {
					setSort(key);
					setSortVisible(false);
				}}
			/>
		</View>
	);
}

function ItemSeparator() {
	return <View style={{ height: space.smPlus }} />;
}

/** The promotion's mechanic in its own block: the number, what it applies to,
 * and the condition. Same anatomy as the offer cards on Inicio and Ofertas. */
function PromoBody({
	featured,
	price,
	colors,
	styles,
}: {
	featured: FeaturedPromo;
	price: number;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<View style={styles.promoBody}>
			{featured.wording.amount ? (
				<View style={styles.amountTile}>
					<View style={styles.amountKickerRow}>
						<Ionicons name={featured.wording.icon} size={11} color={colors.cyan} />
						{featured.wording.capped && <Text style={styles.amountKicker}>HASTA</Text>}
					</View>
					<Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
						{featured.wording.amount}
					</Text>
				</View>
			) : (
				<View style={[styles.amountTile, styles.amountTileFlat]}>
					<Ionicons name={featured.wording.icon} size={24} color={colors.cyan} />
				</View>
			)}
			<View style={styles.promoBodyRight}>
				<View style={[styles.appliesChip, featured.wording.conditional && styles.appliesChipWarm]}>
					<Text style={[styles.appliesText, featured.wording.conditional && styles.appliesTextWarm]}>
						{featured.wording.applies}
					</Text>
				</View>
				<Text style={styles.promoDetail}>{featured.wording.detail}</Text>
				{/* El punto de toda la tarea: con una sola unidad el precio no
				    baja. Se dice con el número al lado para que no quede como
				    una advertencia genérica que nadie lee. */}
				{featured.requiredQuantity > 1 && (
					<Text style={styles.promoCondition}>
						Llevando 1 sola unidad pagás {formatCurrency(price)}
						{featured.unitPrice != null
							? `; llevando ${featured.requiredQuantity}, ${formatCurrency(featured.unitPrice)} por unidad`
							: ""}
						.
					</Text>
				)}
			</View>
		</View>
	);
}

/** One card in the list, split out and memoized so toggling one product's
 * expanded detail doesn't re-render every other card — with the campaign and
 * alternative-offer sub-lists this screen can carry, re-running that JSX for
 * every product on every single tap was the actual jank source. */
const ProductCard = memo(function ProductCard({
	item,
	isExpanded,
	onToggle,
	onOpenOffer,
	colors,
	styles,
}: {
	item: Item;
	isExpanded: boolean;
	onToggle: (id: string) => void;
	onOpenOffer?: (id: string, fallback?: Offer | null) => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const { id, product: p, loose } = item;
	const offer = p.bestOffer;
	const savings = offer ? offerSavings(offer) : null;
	// Qué promoción aplica, no sólo cuánto baja la unidad en el catálogo: la
	// mecánica (3x2, 2da unidad, llevando N) va arriba y las bancarias aparte.
	const promos = offer ? summarizeOfferPromos(offer) : null;
	const featured = promos?.featured ?? null;
	// A flat "X% de descuento" is what the badge beside the price already says;
	// the block earns its space only for a mechanic that is not obvious.
	const showPromo = featured != null && (featured.wording.conditional || featured.requiredQuantity > 1);
	const campaigns = p.campaignOffers.slice(0, 3);
	const hasAnything = offer != null || campaigns.length > 0;
	const summary = offerSummary(p, loose);

	return (
		<View style={styles.card}>
			{/* Only the header toggles. With the whole card pressable,
			    trying to read a truncated line further down collapsed the
			    card instead. */}
			<Pressable
				style={(state) => [styles.cardHeader, isFocused(state) && styles.focusRing]}
				onPress={() => hasAnything && onToggle(id)}
				disabled={!hasAnything}
				accessibilityRole={hasAnything ? "button" : undefined}
				accessibilityLabel={`${p.description}. ${formatFrequency(p.purchaseCount, p.ticketCount)}. ${summary}`}
				accessibilityHint={hasAnything ? (isExpanded ? "Toca para contraer el detalle" : "Toca para ver el detalle") : undefined}
				accessibilityState={hasAnything ? { expanded: isExpanded } : undefined}
				aria-expanded={hasAnything ? isExpanded : undefined}
			>
				<View style={{ flex: 1 }}>
					<Text style={styles.name}>{p.description}</Text>
					<Text style={styles.freq}>{formatFrequency(p.purchaseCount, p.ticketCount)}</Text>
				</View>
				{hasAnything && (
					<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedText2} />
				)}
			</Pressable>

			{/* La queja que esto arregla: "Mejor en X supermercado" no dice QUÉ
			    promoción aplica. La mecánica va acá, con el mismo tile + chip que usan
			    las cards de oferta, y no escondida en el detalle desplegado. Si el
			    precio es de otro producto, la promoción también: queda en el detalle,
			    no en el titular. */}
			<ProductOfferLine product={p} loose={loose}>
				{offer && featured && showPromo && !loose && (
					<PromoBody featured={featured} price={offer.price} colors={colors} styles={styles} />
				)}
			</ProductOfferLine>

			{!offer && campaigns.length === 0 &&
				(p.alternativeOffers.length > 0 ? (
					// Saying "sin ofertas" while listing one right below it was a
					// straight contradiction.
					<Text style={styles.noOffer}>Sin oferta de esta marca, pero hay otra marca en oferta</Text>
				) : (
					<Text style={styles.noOffer}>Sin ofertas activas por ahora</Text>
				))}

			{isExpanded && hasAnything && (
				<View style={styles.detailBlock}>
					{/* Everything about the one offer this card already shows — price
					    comparison, which promo it comes from, how it compares to what
					    you actually paid last time — grouped under one heading instead
					    of running straight into "other promotions" below with nothing
					    to mark where one ends and the next begins. */}
					{offer && (
						<View style={styles.detailGroup}>
							<Text style={styles.detailGroupTitle}>ESTE PRECIO</Text>
							{loose && (
								<Text style={styles.detailNote}>
									Es el precio de otro producto de la misma marca o tipo, no del que comprás vos. Puede
									cambiar la presentación, el tamaño o incluso qué es.
								</Text>
							)}
							{featured && showPromo && loose && (
								<PromoBody featured={featured} price={offer.price} colors={colors} styles={styles} />
							)}
							{savings ? (
								<>
									<View style={styles.detailRow}>
										<Text style={styles.detailLabel}>Precio de lista</Text>
										<Text style={styles.strikePrice}>{formatCurrency(offer.listPrice)}</Text>
									</View>
									<View style={styles.detailRow}>
										<Text style={styles.detailLabel}>Precio con la oferta</Text>
										<Text style={styles.detailValue}>{formatCurrency(offer.price)}</Text>
									</View>
									<View style={styles.savingsRow}>
										<Ionicons name="pricetag" size={13} color={colors.successSoftText} />
										<Text style={styles.savingsText}>
											{loose ? "Ese producto tiene" : "Ahorrás"} {formatCurrency(savings.amount)} ({Math.round(savings.pct)}%){" "}
											{loose ? "de descuento sobre" : "sobre"} el precio de lista
										</Text>
									</View>
								</>
							) : (
								<Text style={styles.detailNote}>
									{offer.retailerName} no publicó precio de lista para este producto, así que no
									podemos calcular cuánto representa el descuento.
								</Text>
							)}

							{/* Bancarias, dichas como bancarias. Antes caían en el mismo
							    renglón que un 3x2 y se leían como descuento del producto,
							    cuando en realidad hay que pagar con esa tarjeta para
							    conseguirlas. Atribuidas a la cadena: sin atribuir, quedaban
							    al lado de la promoción de otro súper y parecían la misma.

							    "tarjeta o programa" y no "medio de pago": este renglón no
							    trae sólo tarjetas. COTO manda "Miembros Comunidad", que es
							    un beneficio de socios y no se paga con nada — leerlo como
							    medio de pago quedaba raro. Lo que las une es que hay que
							    cumplir algo que no es llevar más unidades. */}
							{promos && promos.payment.length > 0 && (
								<View style={styles.promoRow}>
									<Ionicons name="card-outline" size={13} color={colors.infoSoftText} />
									<Text style={styles.promoText}>
										Con tarjeta o programa de {offer.retailerName}: {promos.payment.join(" · ")}
									</Text>
								</View>
							)}

							{/* Lo que no pudimos clasificar, crudo. Perderlo sería peor que
							    mostrarlo sin interpretar. */}
							{promos && promos.other.length > 0 && (
								<View style={styles.promoRow}>
									<Ionicons name="megaphone-outline" size={13} color={colors.infoSoftText} />
									<Text style={styles.promoText}>
										{offer.retailerName}: {promos.other.join(" · ")}
									</Text>
								</View>
							)}

							{p.lastPaidPrice != null && (
								<View style={styles.paidBlock}>
									<View style={styles.detailRow}>
										{/* The date is when the receipt was scanned, not when the
										    purchase happened — the ticket carries no emission date.
										    Worded so it stays true either way, including when an old
										    receipt is scanned today. */}
										<Text style={styles.detailLabel}>
											En tu último ticket escaneado
											{formatLongDate(p.lastPaidAt) ? ` (${formatLongDate(p.lastPaidAt)})` : ""}
										</Text>
										<Text style={styles.detailValue}>{formatCurrency(p.lastPaidPrice)}</Text>
									</View>
									{/* Comparing what you paid with the price of a different
									    product proves nothing, so a loose match gets no verdict. */}
									{loose ? null : p.lastPaidPrice > offer.price ? (
										<Text style={styles.paidBetter}>
											La oferta está {formatCurrency(p.lastPaidPrice - offer.price)} por debajo de lo
											que pagaste
										</Text>
									) : (
										<Text style={styles.paidWorse}>
											La última vez lo conseguiste más barato que esta oferta
										</Text>
									)}
								</View>
							)}
						</View>
					)}

					{campaigns.length > 0 && (
						<View style={offer ? styles.campaignBlock : styles.detailGroup}>
							<Text style={styles.detailGroupTitle}>{offer ? "OTRAS PROMOCIONES VIGENTES" : "PROMOCIONES VIGENTES"}</Text>
							{campaigns.map((c, i) => {
								const until = formatLongDate(c.activeTo);
								const days = daysUntil(c.activeTo);
								const discount = describeCampaignDiscount(c);
								const full = campaignOfferToOffer(c);
								const openable = full != null && onOpenOffer != null;
								return (
									<Pressable
										key={`${c.retailerName}-${i}`}
										style={(state) => [styles.campaignRow, isFocused(state) && styles.focusRing]}
										disabled={!openable}
										onPress={() => full && onOpenOffer?.(full.id, full)}
										accessibilityRole={openable ? "button" : undefined}
										accessibilityLabel={`${discount ? `${discount} en ` : ""}${c.retailerName}${c.province ? `, ${c.province}` : ""}${until ? `. Vigente hasta el ${until}` : ""}`}
										accessibilityHint={openable ? "Ver la promoción completa" : undefined}
									>
										<Ionicons name="time-outline" size={14} color={colors.defaultText} />
										<View style={{ flex: 1 }}>
											<Text style={styles.campaignHeadline}>
												{discount ? `${discount} · ` : ""}
												{c.retailerName}
												{c.province ? ` · ${c.province}` : ""}
											</Text>
											{until && (
												<Text style={styles.campaignUntil}>
													Vigente hasta el {until}
													{days != null && days >= 0 && days <= 7 && (
														<Text style={styles.campaignUrgent}>
															{days === 0 ? " · vence hoy" : ` · quedan ${days} día${days === 1 ? "" : "s"}`}
														</Text>
													)}
												</Text>
											)}
											{openable && <Text style={styles.campaignLink}>Ver la promoción completa</Text>}
										</View>
										{openable && <Ionicons name="chevron-forward" size={16} color={colors.defaultText} />}
									</Pressable>
								);
							})}
							{hasGuessedPercentages(campaigns) && (
								<Text style={styles.campaignDisclaimer}>
									Algún porcentaje se leyó de la imagen de la promoción y puede no ser exacto,
									confirmalo en el local.
								</Text>
							)}
						</View>
					)}
				</View>
			)}

			{p.alternativeOffers.length > 0 && (
				<View style={styles.altBlock}>
					<Text style={styles.detailGroupTitle}>TAMBIÉN EN OFERTA (OTRAS MARCAS)</Text>
					{p.alternativeOffers.map((alt, i) => (
						<View key={`${alt.productName}-${i}`} style={styles.altRow}>
							<Ionicons name="swap-horizontal-outline" size={14} color={colors.subtleText} />
							{/* Two lines and the retailer named: on one line the product
							    got cut mid-word, and the price was shown without saying
							    which supermarket it was from. */}
							<View style={{ flex: 1 }}>
								<Text style={styles.altName} numberOfLines={2}>
									{alt.productName}
								</Text>
								{alt.retailerName && <Text style={styles.altRetailer}>en {alt.retailerName}</Text>}
							</View>
							{alt.discountPct != null && <Text style={styles.altDiscount}>-{Math.round(alt.discountPct)}%</Text>}
							<Text style={styles.altPrice}>{formatCurrency(alt.price)}</Text>
						</View>
					))}
				</View>
			)}
		</View>
	);
});

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		listHeader: { gap: space.md, marginBottom: space.md },
		intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		introStrong: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		resultsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
		resultsText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.caption },
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
		sortChipText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.caption },
		focusRing: focusRing(colors),
		skeletonList: { padding: space.lg, gap: space.smPlus },
		skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: colors.softWarm },
		card: { backgroundColor: colors.card, borderRadius: radii.md, padding: space.mdPlus, gap: space.md, borderWidth: 1, borderColor: colors.divider },
		cardHeader: { flexDirection: "row", alignItems: "center", gap: space.smPlus, minHeight: 44 },
		name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label, lineHeight: lineHeights.label },
		freq: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro, marginTop: space.xs / 2 },
		noOffer: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro },
		noOfferGroup: { marginTop: space.lg, gap: space.xs },
		noOfferHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
		noOfferTitle: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.caption },
		noOfferRow: { paddingVertical: space.smPlus, borderTopWidth: 1, borderTopColor: colors.divider },
		detailBlock: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: space.smPlus, gap: space.sm },
		detailGroup: { gap: space.sm },
		// Section label: the one place the design system spends letter-spacing.
		detailGroupTitle: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: sizes.overline, lineHeight: lineHeights.overline, letterSpacing: 1.2 },
		detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
		detailLabel: { flex: 1, color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro },
		detailValue: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.caption },
		strikePrice: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: sizes.caption, textDecorationLine: "line-through" },
		savingsRow: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, backgroundColor: colors.successSoft, borderRadius: radii.sm, paddingHorizontal: space.smPlus, paddingVertical: space.sm },
		savingsText: { flex: 1, color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: sizes.caption },
		detailNote: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: 17 },
		promoRow: { flexDirection: "row", alignItems: "center", gap: space.xsPlus },
		promoText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		// Misma anatomía que las cards de oferta (OffersScreen/HomeScreen): el número
		// en su propio bloque y el "a qué se aplica" en un chip, para que la promo se
		// lea igual en las dos pantallas. Más angosto porque acá el tile convive con
		// el precio y el nombre del producto de catálogo.
		promoBody: { flexDirection: "row", alignItems: "stretch", gap: space.smPlus },
		amountTile: {
			width: 68,
			borderRadius: radii.md,
			paddingVertical: space.sm,
			paddingHorizontal: space.xs,
			alignItems: "center",
			justifyContent: "center",
			gap: space.xs / 2,
			backgroundColor: colors.navy,
			// The tile is a fixed navy: on a dark card it needs an edge to be seen.
			borderWidth: 1,
			borderColor: colors.navyHairline,
		},
		amountTileFlat: { paddingVertical: space.smPlus },
		amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
		amountKicker: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: sizes.overline },
		amountValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: sizes.h3 },
		promoBodyRight: { flex: 1, justifyContent: "center", gap: space.xs },
		appliesChip: { alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm, backgroundColor: colors.softNavy },
		// Cálido para todo lo que no sea una rebaja lisa sobre el precio, así un
		// "70% en la 2da unidad" nunca parece un 70% a secas.
		appliesChipWarm: { backgroundColor: colors.warmChip },
		appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		appliesTextWarm: { color: colors.warmChipText },
		promoDetail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		promoCondition: { color: colors.warmChipText, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		paidBlock: { borderTopWidth: 1, borderTopColor: colors.softWarm, paddingTop: space.sm, gap: space.xs },
		paidBetter: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: 17 },
		paidWorse: { color: colors.warningSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: 17 },
		campaignBlock: { borderTopWidth: 1, borderTopColor: colors.softWarm, paddingTop: space.smPlus, gap: space.sm },
		campaignRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xsPlus, minHeight: 44 },
		campaignHeadline: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		campaignUntil: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, marginTop: space.xs / 2 },
		campaignUrgent: { color: colors.warningSoftText, fontFamily: typography.family.medium },
		campaignLink: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro, marginTop: space.xs, textDecorationLine: "underline" },
		campaignDisclaimer: { color: colors.warningSoftText, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		altBlock: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: space.smPlus, gap: space.xsPlus },
		altRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xsPlus },
		altName: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		altRetailer: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: sizes.micro, marginTop: 1 },
		altDiscount: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		altPrice: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro },
	});
}
