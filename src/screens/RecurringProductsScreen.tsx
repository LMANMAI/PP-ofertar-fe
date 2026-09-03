import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { campaignOfferToOffer, describeCampaignDiscount, getRecurringProducts, offerSavings, sortByOfferRelevance } from "../services";
import type { CampaignOffer, Offer, RecurringProduct } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, type TabKey } from "../components";

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
	/** Opens a promotion in the offers detail, where the legal text is shown in
	 * full instead of clipped to three lines. The second argument carries the
	 * rebuilt offer because the feed may not contain this promotion. */
	onOpenOffer?: (id: string, fallback?: Offer | null) => void;
};

export function RecurringProductsScreen({ onBack, session, activeTab, onSelectTab, onScanPress, onOpenOffer }: Props) {
	const insets = useSafeAreaInsets();
	const [products, setProducts] = useState<RecurringProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

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
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Productos recurrentes</Text>
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

			{!loading && !error && products.length === 0 && (
				<View style={styles.emptyWrap}>
					<Ionicons name="repeat-outline" size={56} color={colors.border} />
					<Text style={styles.emptyTitle}>Todavía no detectamos productos recurrentes</Text>
					<Text style={styles.emptyHint}>Escaneá más tickets para que podamos reconocer tus compras habituales</Text>
				</View>
			)}

			{!loading && !error && products.length > 0 && (
				<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
					<Text style={styles.intro}>
						{offerCount > 0
							? `${offerCount} de tus ${products.length} productos habituales tienen oferta ahora. Tocá cualquiera para ver el detalle.`
							: `Detectamos ${products.length} productos que comprás seguido. Te avisamos cuando haya mejor precio.`}
					</Text>

					{products.map((p) => {
						const id = p.barcode || p.description;
						const isExpanded = expandedId === id;
						const offer = p.bestOffer;
						const savings = offer ? offerSavings(offer) : null;
						const discountPct = offer?.discountPct ?? savings?.pct ?? null;
						const campaigns = p.campaignOffers.slice(0, 3);
						const hasAnything = offer != null || campaigns.length > 0;

						return (
							<View key={id} style={styles.card}>
								{/* Only the header toggles. With the whole card pressable,
								    trying to read a truncated line further down collapsed the
								    card instead. */}
								<Pressable
									style={styles.cardHeader}
									onPress={() => setExpandedId(isExpanded ? null : id)}
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
									<View style={{ gap: 4 }}>
										<View style={styles.bestRow}>
											<View style={styles.bestChip}>
												<Ionicons name="trophy" size={11} color="#fff" />
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
											<Ionicons name="megaphone" size={11} color="#fff" />
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
										{offer &&
											(savings ? (
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
														<Ionicons name="pricetag" size={13} color="#15803D" />
														<Text style={styles.savingsText}>
															Ahorrás {formatCurrency(savings.amount)} ({Math.round(savings.pct)}%) sobre el
															precio de lista
														</Text>
													</View>
													<Text style={styles.detailNote}>
														Es el precio más bajo que tenemos registrado para un producto de la misma marca
														y del mismo tipo, entre los súper que seguís. Puede ser otra presentación o
														tamaño del que comprás vos, y el dato es del último relevamiento, no
														necesariamente de hoy.
													</Text>
												</>
											) : (
												<Text style={styles.detailNote}>
													{offer.retailerName} no publicó precio de lista para este producto, así que no
													podemos calcular cuánto representa el descuento.
												</Text>
											))}

										{offer?.promoLabel && (
											// Attributed to the retailer: unattributed, this validity window
											// sat next to a different chain's promotion and read as if both
											// belonged to the same offer.
											<View style={styles.promoRow}>
												<Ionicons name="megaphone-outline" size={13} color={colors.navy} />
												<Text style={styles.promoText}>
													{offer.retailerName}: {offer.promoLabel}
												</Text>
											</View>
										)}

										{offer && p.lastPaidPrice != null && (
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
												{/* Both numbers are per unit, and the offer can be a different
												    size, so this is a reference point and not a saving. */}
												<Text style={styles.paidCaveat}>
													Compará la presentación antes de decidir: los precios pueden ser de tamaños
													distintos.
												</Text>
											</View>
										)}

										{campaigns.length > 0 && (
											<View style={styles.campaignBlock}>
												<Text style={styles.campaignTitle}>OTRAS PROMOCIONES VIGENTES</Text>
												<Text style={styles.campaignIntro}>
													Promociones publicadas por el súper, con sus propias condiciones. No son precios
													por unidad, así que no se comparan de forma directa con el mejor precio de arriba.
												</Text>
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
															<Ionicons name="time-outline" size={13} color={colors.navy} />
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
																{c.legalText && (
																	<Text style={styles.campaignLegal} numberOfLines={3}>
																		{c.legalText}
																	</Text>
																)}
																{openable && (
																	<Text style={styles.campaignLink}>Ver la promoción completa</Text>
																)}
															</View>
															{openable && (
																<Ionicons name="chevron-forward" size={14} color={colors.navy} />
															)}
														</Pressable>
													);
												})}
												<Text style={styles.campaignDisclaimer}>
													Las promociones las publica el súper y pueden cambiar sin aviso. Verificá la
													vigencia y consultá el stock en la sucursal: no garantizamos que el producto
													esté disponible en la que elijas.
												</Text>
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
												<Ionicons name="receipt-outline" size={13} color="#6B7280" />
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
					})}
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
	errorText: { flex: 1, color: "#991B1B", fontFamily: typography.family.medium, fontSize: 13 },
	emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 60, paddingHorizontal: 40 },
	emptyTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 16, textAlign: "center" },
	emptyHint: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center" },
	intro: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: "#E5E7EB" },
	cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	freq: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	bestChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#22C55E", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	campaignChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	bestText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 11 },
	priceGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
	discountBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
	discountText: { color: "#15803D", fontFamily: typography.family.bold, fontSize: 11 },
	price: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 15 },
	noOffer: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12 },
	detailBlock: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10, gap: 8 },
	detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	detailLabel: { flex: 1, color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12 },
	detailValue: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	strikePrice: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 13, textDecorationLine: "line-through" },
	savingsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
	savingsText: { flex: 1, color: "#15803D", fontFamily: typography.family.bold, fontSize: 13 },
	detailNote: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	promoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	promoText: { flex: 1, color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	paidBlock: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8, gap: 4 },
	offerProduct: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 11, lineHeight: 15 },
	paidBetter: { color: "#15803D", fontFamily: typography.family.medium, fontSize: 12, lineHeight: 17 },
	paidCaveat: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 11, lineHeight: 15 },
	paidWorse: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	campaignBlock: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10, gap: 8 },
	campaignTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	campaignIntro: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 11, lineHeight: 15 },
	campaignRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	campaignHeadline: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	campaignUntil: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	campaignLegal: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 10, lineHeight: 14, marginTop: 3 },
	campaignLink: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 11, marginTop: 4, textDecorationLine: "underline" },
	campaignDisclaimer: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 10, lineHeight: 14, fontStyle: "italic" },
	historyRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	historyText: { flex: 1, color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 17 },
	altBlock: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10, gap: 6 },
	altTitle: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	altRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	altName: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	altRetailer: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 11, marginTop: 1 },
	altDiscount: { color: "#22C55E", fontFamily: typography.family.medium, fontSize: 11 },
	altPrice: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
});
