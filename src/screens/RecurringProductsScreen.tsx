import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	LayoutAnimation,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { campaignOfferToOffer, describeCampaignDiscount, getRecurringProducts, offerSavings, sortByOfferRelevance } from "../services";
import type { CampaignOffer, Offer, RecurringProduct } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, EmptyState, ErrorBanner, LoadingState, ScreenHeader, type TabKey } from "../components";

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function formatFrequency(purchaseCount: number, ticketCount: number): string {
	const times = purchaseCount === 1 ? "1 vez" : `${purchaseCount} veces`;
	const trips = ticketCount === 1 ? "1 compra" : `${ticketCount} compras`;
	return `Comprado ${times} en ${trips}`;
}

/** Retailers publish these as ISO strings, but the field is free text in the
 * scraper's schema — anything unparseable is dropped rather than rendered to
 * the user as "Invalid Date". */
function formatDate(iso: string | null): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
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
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
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

	// Stable across renders so ProductCard's React.memo isn't defeated by a
	// fresh closure every time any card toggles — otherwise every card in the
	// list re-renders (including their off-screen detail sections) on every
	// single tap, not just the one that changed.
	const handleToggle = useCallback((id: string) => {
		// The detail block used to just pop in/out with the rest of the card
		// jumping to make room. Animating the layout pass this triggers makes
		// it read as the card growing to reveal its detail, not the list
		// reflowing under the user's thumb.
		if (!reduceMotion.current) {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		}
		setExpandedId((current) => (current === id ? null : id));
	}, []);

	useEffect(() => {
		setLoading(true);
		getRecurringProducts(session.token)
			.then((data) => {
				// Same ordering as the home carousel, so a product featured there
				// is also at the top when the user opens this section.
				setProducts(sortByOfferRelevance(data));
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al cargar tus productos recurrentes");
			})
			.finally(() => setLoading(false));
	}, [session.token]);

	// Counts alternative-brand offers too, matching what the ordering treats as
	// "has something to act on".
	const offerCount = products.filter(
		(p) => p.bestOffer != null || p.campaignOffers.length > 0 || p.alternativeOffers.length > 0,
	).length;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Productos recurrentes" onBack={onBack} />

			{loading && <LoadingState />}

			{error && !loading && <ErrorBanner message={error} />}

			{!loading && !error && products.length === 0 && (
				<EmptyState
					icon="repeat-outline"
					title="Todavía no detectamos productos recurrentes"
					hint="Escaneá más tickets para que podamos reconocer tus compras habituales"
				/>
			)}

			{!loading && !error && products.length > 0 && (
				<ScrollView contentContainerStyle={{ padding: space.lg, gap: 10, paddingBottom: insets.bottom + 24 }}>
					<Text style={styles.intro}>
						{offerCount > 0
							? `${offerCount} de tus ${products.length} productos habituales tienen oferta ahora. Tocá cualquiera para ver el detalle.`
							: `Detectamos ${products.length} productos que comprás seguido. Te avisamos cuando haya mejor precio.`}
					</Text>

					{products.map((p) => {
						const id = p.barcode || p.description;
						return (
							<ProductCard
								key={id}
								id={id}
								product={p}
								isExpanded={expandedId === id}
								onToggle={handleToggle}
								onOpenOffer={onOpenOffer}
								colors={colors}
								styles={styles}
							/>
						);
					})}
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

/** One card in the list, split out and memoized so toggling one product's
 * expanded detail doesn't re-render every other card — with the campaign and
 * alternative-offer sub-lists this screen can carry, re-running that JSX for
 * every product on every single tap was the actual jank source. */
const ProductCard = memo(function ProductCard({
	id,
	product: p,
	isExpanded,
	onToggle,
	onOpenOffer,
	colors,
	styles,
}: {
	id: string;
	product: RecurringProduct;
	isExpanded: boolean;
	onToggle: (id: string) => void;
	onOpenOffer?: (id: string, fallback?: Offer | null) => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const offer = p.bestOffer;
	const savings = offer ? offerSavings(offer) : null;
	const discountPct = offer?.discountPct ?? savings?.pct ?? null;
	const campaigns = p.campaignOffers.slice(0, 3);
	const hasAnything = offer != null || campaigns.length > 0;

	return (
		<View style={styles.card}>
			{/* Only the header toggles. With the whole card pressable,
			    trying to read a truncated line further down collapsed the
			    card instead. */}
			<Pressable
				style={styles.cardHeader}
				onPress={() => onToggle(id)}
			>
				<Ionicons name="repeat-outline" size={18} color={colors.cyan} />
				<View style={{ flex: 1 }}>
					<Text style={styles.name}>{p.description}</Text>
					<Text style={styles.freq}>{formatFrequency(p.purchaseCount, p.ticketCount)}</Text>
				</View>
				{hasAnything && (
					<Ionicons
						name={isExpanded ? "chevron-up" : "chevron-down"}
						size={18}
						color="#9CA3A8"
					/>
				)}
			</Pressable>

			{offer ? (
				<View style={{ gap: space.xs }}>
					<View style={styles.bestRow}>
						<View style={styles.bestChip}>
							<Ionicons name="trophy" size={11} color={colors.buttonText} />
							<Text style={styles.bestText}>Mejor en {offer.retailerName}</Text>
						</View>
						<View style={styles.priceGroup}>
							{discountPct != null && discountPct >= 1 && (
								<View style={styles.discountBadge}>
									<Text style={styles.discountText}>-{Math.round(discountPct)}%</Text>
								</View>
							)}
							<Text style={styles.price}>{formatCurrency(offer.price)}</Text>
						</View>
					</View>
					{/* Always visible, never only in the expanded detail: the match is
					    by brand and kind of product, so the price can belong to another
					    size or variety. Hiding which product it is turned a bag of
					    flour into "the best price" for a bottle of oil. */}
					{offer.productName && (
						<Text style={styles.offerProduct} numberOfLines={2}>
							Precio de: {offer.productName}
						</Text>
					)}
				</View>
			) : campaigns.length > 0 ? (
				// A campaign promotion with no catalog price is still an offer;
				// calling it "sin ofertas activas" was hiding a real one.
				<View style={styles.bestRow}>
					<View style={styles.campaignChip}>
						<Ionicons name="megaphone" size={11} color={colors.buttonText} />
						<Text style={styles.bestText}>
							{describeCampaignDiscount(campaigns[0]) ?? "Promoción vigente"} en{" "}
							{campaigns[0].retailerName}
						</Text>
					</View>
				</View>
			) : p.alternativeOffers.length > 0 ? (
				// Saying "sin ofertas" while listing one right below it was a
				// straight contradiction.
				<Text style={styles.noOffer}>
					Sin oferta de esta marca, pero hay otra marca en oferta
				</Text>
			) : (
				<Text style={styles.noOffer}>Sin ofertas activas por ahora</Text>
			)}

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
											Ahorrás {formatCurrency(savings.amount)} ({Math.round(savings.pct)}%) sobre el
											precio de lista
										</Text>
									</View>
									<Text style={styles.detailNote}>
										El mejor precio registrado para un producto de la misma marca y tipo — puede
										ser otra presentación o tamaño del que comprás vos.
									</Text>
								</>
							) : (
								<Text style={styles.detailNote}>
									{offer.retailerName} no publicó precio de lista para este producto, así que no
									podemos calcular cuánto representa el descuento.
								</Text>
							)}

							{offer.promoLabel && (
								// Attributed to the retailer: unattributed, this validity window
								// sat next to a different chain's promotion and read as if both
								// belonged to the same offer.
								<View style={styles.promoRow}>
									<Ionicons name="megaphone-outline" size={13} color={colors.defaultText} />
									<Text style={styles.promoText}>
										{offer.retailerName}: {offer.promoLabel}
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
											{formatDate(p.lastPaidAt) ? ` (${formatDate(p.lastPaidAt)})` : ""}
										</Text>
										<Text style={styles.detailValue}>{formatCurrency(p.lastPaidPrice)}</Text>
									</View>
									{p.lastPaidPrice > offer.price ? (
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
						<View style={styles.campaignBlock}>
							<Text style={styles.campaignTitle}>OTRAS PROMOCIONES VIGENTES</Text>
							{campaigns.map((c, i) => {
								const until = formatDate(c.activeTo);
								const days = daysUntil(c.activeTo);
								const discount = describeCampaignDiscount(c);
								const full = campaignOfferToOffer(c);
								const openable = full != null && onOpenOffer != null;
								return (
									<Pressable
										key={`${c.retailerName}-${i}`}
										style={styles.campaignRow}
										disabled={!openable}
										onPress={() => full && onOpenOffer?.(full.id, full)}
									>
										<Ionicons name="time-outline" size={13} color={colors.defaultText} />
										<View style={{ flex: 1 }}>
											<Text style={styles.campaignHeadline}>
												{discount ? `${discount} · ` : ""}
												{c.retailerName}
												{c.province ? ` · ${c.province}` : ""}
											</Text>
											{until && (
												<Text style={styles.campaignUntil}>
													Vigente hasta el {until}
													{days != null && days >= 0 && days <= 7
														? days === 0
															? " · vence hoy"
															: ` · quedan ${days} día${days === 1 ? "" : "s"}`
														: ""}
												</Text>
											)}
											{openable && (
												<Text style={styles.campaignLink}>Ver la promoción completa</Text>
											)}
										</View>
										{openable && (
											<Ionicons name="chevron-forward" size={14} color={colors.defaultText} />
										)}
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

					{p.totalDiscounts > 0 && (
						<View style={styles.historyRow}>
							<Ionicons name="receipt-outline" size={13} color={colors.mutedText2} />
							<Text style={styles.historyText}>
								Ya llevás {formatCurrency(p.totalDiscounts)} ahorrados en este producto por descuentos
								de tus tickets
							</Text>
						</View>
					)}
				</View>
			)}

			{p.alternativeOffers.length > 0 && (
				<View style={styles.altBlock}>
					<Text style={styles.altTitle}>TAMBIÉN EN OFERTA (OTRAS MARCAS)</Text>
					{p.alternativeOffers.map((alt, i) => (
						<View key={`${alt.productName}-${i}`} style={styles.altRow}>
							<Ionicons name="swap-horizontal-outline" size={13} color="#9CA3A8" />
							{/* Two lines and the retailer named: on one line the product
							    got cut mid-word, and the price was shown without saying
							    which supermarket it was from. */}
							<View style={{ flex: 1 }}>
								<Text style={styles.altName} numberOfLines={2}>
									{alt.productName}
								</Text>
								{alt.retailerName && (
									<Text style={styles.altRetailer}>en {alt.retailerName}</Text>
								)}
							</View>
							{alt.discountPct != null && (
								<Text style={styles.altDiscount}>-{Math.round(alt.discountPct)}%</Text>
							)}
							<Text style={styles.altPrice}>{formatCurrency(alt.price)}</Text>
						</View>
					))}
				</View>
			)}
		</View>
	);
});

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: space.md, borderWidth: 1, borderColor: colors.divider },
	cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	freq: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	bestChip: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: space.xs, borderRadius: 10 },
	campaignChip: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: space.xs, borderRadius: 10 },
	bestText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 11 },
	priceGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
	discountBadge: { backgroundColor: colors.successSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
	discountText: { color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: 11 },
	price: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 15 },
	noOffer: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12 },
	detailBlock: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: space.sm },
	detailGroup: { gap: space.sm },
	detailGroupTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	detailLabel: { flex: 1, color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12 },
	detailValue: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	strikePrice: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 13, textDecorationLine: "line-through" },
	savingsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.successSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: space.sm },
	savingsText: { flex: 1, color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: 13 },
	detailNote: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	promoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	promoText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 12 },
	paidBlock: { borderTopWidth: 1, borderTopColor: colors.softWarm, paddingTop: space.sm, gap: space.xs },
	offerProduct: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, lineHeight: 15 },
	paidBetter: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: 12, lineHeight: 17 },
	paidWorse: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	campaignBlock: { borderTopWidth: 1, borderTopColor: colors.softWarm, paddingTop: 10, gap: space.sm },
	campaignTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	campaignRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	campaignHeadline: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 12 },
	campaignUntil: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	campaignLink: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 11, marginTop: space.xs, textDecorationLine: "underline" },
	campaignDisclaimer: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 10, lineHeight: 14, fontStyle: "italic" },
	historyRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	historyText: { flex: 1, color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	altBlock: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: 6 },
	altTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	altRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	altName: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	altRetailer: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 11, marginTop: 1 },
	altDiscount: { color: colors.success, fontFamily: typography.family.medium, fontSize: 11 },
	altPrice: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 12 },
	});
}
