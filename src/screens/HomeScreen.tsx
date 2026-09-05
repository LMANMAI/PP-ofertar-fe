import { useEffect, useMemo, useState } from "react";
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
import { BottomNav, OfferCarouselCardSkeleton, ProductCardSkeleton, type TabKey, useOnboardingTarget } from "../components";
import { space, typography, useIsTablet, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { type Session, getInitials, getAvatarUri, splitName } from "../auth/session";
import {
	describeCampaignDiscount,
	getOffers,
	getRecurringProducts,
	getSavingsReport,
	offerBadge,
	offerPromo,
	sortByOfferRelevance,
} from "../services";
import type { Offer, PromoIcon, RecurringProduct, SavingsReportResponse } from "../services";
import { formatLongDate } from "../utils/format";

/** One offer in the home carousel. Informational only: there is no activation
 * or points behind these, so the card states what is on offer, where, until
 * when, and which of the user's products it touches.
 *
 * The number gets a tile of its own with an icon, because a percentage buried
 * in a sentence is exactly what made these cards read as flat text. The chip
 * under it answers "¿sobre qué se aplica?" — a card that says 50% without
 * saying whether that is the unit or the second unit is worse than no card.
 */
function OfferCarouselCard({ offer, onPress }: { offer: Offer; onPress: () => void }) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatLongDate(offer.activeTo);
	// Campaigns are worded here from the structured mechanic + percentages.
	// A backend that predates those fields returns null and the card falls
	// back to the headline string it already sent.
	const promo = offerPromo(offer);
	const catalogPct =
		offer.kind === "catalog" && offer.discountPct != null && offer.discountPct >= 1
			? `${Math.round(offer.discountPct)}%`
			: null;

	const amount = promo ? promo.amount : catalogPct;
	const capped = promo ? promo.capped : false;
	const icon: PromoIcon = promo ? promo.icon : "pricetag-outline";
	// Conditional promotions are the ones a shopper misreads as a flat
	// discount, so their cue is warm rather than navy.
	const conditional = promo?.conditional ?? false;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.offerCard, pressed && styles.offerCardPressed]}
		>
			<View style={styles.offerTop}>
				<View style={styles.offerStoreRow}>
					<View style={[styles.storeBadge, { backgroundColor: color }]}>
						<Text style={styles.storeBadgeText}>{badge}</Text>
					</View>
					<Text style={styles.storeName} numberOfLines={1}>
						{offer.retailerName}
					</Text>
				</View>
			</View>

			<View style={styles.offerBody}>
				{amount ? (
					<View style={styles.amountTile}>
						<View style={styles.amountKickerRow}>
							<Ionicons name={icon} size={11} color={colors.cyan} />
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
						<Ionicons name={icon} size={22} color={colors.cyan} />
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
								<Text
									style={[styles.appliesText, conditional && styles.appliesTextWarm]}
									numberOfLines={2}
								>
									{promo ? promo.applies : offer.headline}
								</Text>
							</View>
							<Text style={styles.offerSub} numberOfLines={2}>
								{/* `||`, not `??`: the scraper stores an unknown category as an
							    empty string, not null, and `??` would render a blank line. */}
							{offer.category || "Promoción del súper"}
								{offer.province ? ` · ${offer.province}` : ""}
							</Text>
						</>
					)}
				</View>
			</View>

			{until && (
				<Text style={styles.offerValidity}>Vigente hasta el {until}</Text>
			)}

			{offer.percentagesUnverified && (
				<View style={styles.offerCaveatRow}>
					<Ionicons name="alert-circle-outline" size={11} color={colors.subtleText} />
					<Text style={styles.offerCaveat} numberOfLines={1}>
						Porcentaje leído de la imagen
					</Text>
				</View>
			)}
		</Pressable>
	);
}

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
}: Props) {
	const insets = useSafeAreaInsets();
	const isTablet = useIsTablet();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [savings, setSavings] = useState<SavingsReportResponse["summary"] | null>(null);
	const [recurringProducts, setRecurringProducts] = useState<RecurringProduct[]>([]);
	const [offers, setOffers] = useState<Offer[]>([]);
	const offersTarget = useOnboardingTarget("offers");
	const historyTarget = useOnboardingTarget("history");
	const [savingsError, setSavingsError] = useState(false);
	const [loadingSavings, setLoadingSavings] = useState(true);
	const [loadingRecurring, setLoadingRecurring] = useState(true);
	const [recurringError, setRecurringError] = useState(false);
	const [loadingOffers, setLoadingOffers] = useState(true);
	const [offersError, setOffersError] = useState(false);

	function formatCurrencyS(value: number | null | undefined): string {
		if (value == null) return "$0";
		return `$${Math.round(value).toLocaleString("es-AR")}`;
	}

	const loadSavings = () => {
		setLoadingSavings(true);
		setSavingsError(false);
		getSavingsReport(session.token)
			.then((r) => setSavings(r.summary))
			.catch(() => setSavingsError(true))
			.finally(() => setLoadingSavings(false));
	};

	useEffect(() => {
		loadSavings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	const loadRecurring = () => {
		setLoadingRecurring(true);
		setRecurringError(false);
		getRecurringProducts(session.token)
			// Same ordering as the full section, so the carousel reads left to
			// right in the same priority the user sees after "Ver todos": own
			// offer first, then other-brand offer, then no offer — each group by
			// how often they buy it. The backend's own order is by frequency
			// alone, which filled the first cards with staples nobody discounts.
			.then((products) => setRecurringProducts(sortByOfferRelevance(products).slice(0, 10)))
			.catch(() => setRecurringError(true))
			.finally(() => setLoadingRecurring(false));
	};

	useEffect(() => {
		loadRecurring();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	// Everything on offer at the user's chains, not just what matches their
	// habitual products — that is what the section below is for.
	const loadOffers = () => {
		setLoadingOffers(true);
		setOffersError(false);
		getOffers(session.token, 1, 8)
			.then((p) => setOffers(p.items))
			.catch(() => setOffersError(true))
			.finally(() => setLoadingOffers(false));
	};

	useEffect(() => {
		loadOffers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	const savingsTickets = savings?.ticketCount ?? 0;
	const savingsAvg = savings ? formatCurrencyS(savings.averageSavings) : "$0";
	const isNewUser = savings != null && savingsTickets === 0;

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
					accessibilityRole="button"
					accessibilityLabel="Abrir perfil"
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
				contentContainerStyle={[
					styles.scrollContent,
					// Capped and centered on tablet width so cards and copy don't
					// stretch edge to edge — a restructure, not a phone UI scaled up.
					isTablet && styles.scrollContentTablet,
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* Savings card */}
				<View ref={historyTarget.ref} onLayout={historyTarget.onLayout} style={styles.savingsCard}>
					<Text style={styles.savingsOverline}>AHORRO DEL MES</Text>
					{savingsError ? (
						<View style={styles.savingsErrorRow}>
							<Text style={styles.savingsErrorText}>
								No pudimos cargar tu ahorro
							</Text>
							<Pressable
								onPress={loadSavings}
								style={styles.savingsRetryBtn}
								accessibilityRole="button"
								accessibilityLabel="Reintentar cargar ahorro"
							>
								<Ionicons name="refresh" size={14} color={colors.navy} />
								<Text style={styles.savingsRetryText}>Reintentar</Text>
							</Pressable>
						</View>
					) : loadingSavings ? (
						<View style={{ paddingVertical: space.sm }}>
							<ActivityIndicator size="small" color={colors.cyan} />
						</View>
					) : (
						<Text style={styles.savingsAmount}>
							{formatCurrencyS(savings?.totalSavings)}
						</Text>
					)}
					<View style={styles.savingsBottomRow}>
						<View style={styles.metricsRow}>
							<View>
								<Text style={styles.metricLabel}>TICKETS</Text>
								<Text style={styles.metricValue}>{savingsTickets}</Text>
							</View>
							<View style={styles.metricDivider} />
							<View>
								<Text style={styles.metricLabel}>PROM. POR TICKET</Text>
								<Text style={[styles.metricValue, { color: colors.cyan }]}>
									{savingsAvg}
								</Text>
							</View>
						</View>
						<Pressable style={styles.savingsCta} onPress={onOpenHistory}>
							<Text style={styles.savingsCtaText} numberOfLines={1}>Ver mis tickets</Text>
						</Pressable>
					</View>
				</View>

				{/* Ofertas vigentes en los súper que sigue el usuario. El backend ya
				    restringe el match a sus cadenas favoritas, así que todo lo que
				    llega acá es de un súper que eligió. */}
				<View ref={offersTarget.ref} onLayout={offersTarget.onLayout} style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>OFERTAS EN TUS SÚPER</Text>
					<Pressable onPress={() => onSelectTab("offers")}>
						<Text style={styles.sectionLink}>Ver todas</Text>
					</Pressable>
				</View>
				{loadingOffers ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.offersRow}
						accessibilityLabel="Cargando ofertas en tus súper"
					>
						{Array.from({ length: 4 }).map((_, i) => (
							<OfferCarouselCardSkeleton key={i} />
						))}
					</ScrollView>
				) : offersError ? (
					<View style={styles.offersErrorRow}>
						<Ionicons name="cloud-offline-outline" size={18} color={colors.subtleText} />
						<Text style={styles.offersErrorText}>
							No pudimos cargar las ofertas
						</Text>
						<Pressable
							onPress={loadOffers}
							style={styles.offersRetryBtn}
							accessibilityRole="button"
							accessibilityLabel="Reintentar cargar ofertas"
						>
							<Text style={styles.offersRetryText}>Reintentar</Text>
						</Pressable>
					</View>
				) : offers.length === 0 ? (
					<View style={styles.offersEmpty}>
						<Ionicons name="pricetags-outline" size={20} color={colors.subtleText} />
						<Text style={styles.offersEmptyText}>
							Todavía no hay ofertas vigentes en los súper que elegiste como favoritos.
						</Text>
					</View>
				) : (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.offersRow}
					>
						{offers.map((o) => (
							<OfferCarouselCard key={o.id} offer={o} onPress={() => onOpenOffer(o.id)} />
						))}
					</ScrollView>
				)}

				{isNewUser ? (
					<View style={styles.firstRunCard}>
						<Ionicons name="receipt-outline" size={32} color={colors.cyan} />
						<Text style={styles.firstRunTitle}>Todavía no escaneaste ningún ticket</Text>
						<Text style={styles.firstRunBody}>
							Escaneá tu primer ticket y vamos a mostrarte acá los productos que
							comprás seguido y cuánto podés ahorrar.
						</Text>
						<Pressable
							style={styles.firstRunCta}
							onPress={onScanPress}
							accessibilityRole="button"
							accessibilityLabel="Escanear mi primer ticket"
						>
							<Ionicons name="camera-outline" size={16} color={colors.buttonText} />
							<Text style={styles.firstRunCtaText}>Escanear mi primer ticket</Text>
						</Pressable>
					</View>
				) : (
					<>
						{/* Productos seguidos — full width grid */}
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>PRODUCTOS QUE COMPRÁS SEGUIDO</Text>
							<Pressable onPress={onOpenRecurring}>
								<Text style={styles.sectionLink}>Ver todos</Text>
							</Pressable>
						</View>
						{loadingRecurring ? (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.productsRow}
								accessibilityLabel="Cargando productos que comprás seguido"
							>
								{Array.from({ length: 4 }).map((_, i) => (
									<ProductCardSkeleton key={i} />
								))}
							</ScrollView>
						) : recurringError ? (
							<View style={styles.productsErrorRow}>
								<Ionicons name="cloud-offline-outline" size={18} color={colors.subtleText} />
								<Text style={styles.productsErrorText}>
									No pudimos cargar tus productos
								</Text>
								<Pressable
									onPress={loadRecurring}
									style={styles.productsRetryBtn}
									accessibilityRole="button"
									accessibilityLabel="Reintentar cargar productos"
								>
									<Text style={styles.productsRetryText}>Reintentar</Text>
								</Pressable>
							</View>
						) : recurringProducts.length === 0 ? (
							<View style={styles.productsEmpty}>
								<Ionicons name="cart-outline" size={20} color={colors.subtleText} />
								<Text style={styles.productsEmptyText}>
									Todavía no registramos productos que compres seguido. Escaneá
									tickets y aparecen acá.
								</Text>
							</View>
						) : (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.productsRow}
						>
							{recurringProducts.map((p) => {
								const id = p.barcode || p.description;
								const delta = p.bestOffer?.discountPct != null ? `-${Math.round(p.bestOffer.discountPct)}%` : null;
								return (
									<Pressable key={id} style={styles.productCard} onPress={onOpenRecurring}>
										<View style={styles.productIconWrap}>
											<Ionicons name="cart-outline" size={28} color={colors.subtleText} />
										</View>
										<Text style={styles.productName}>{p.description}</Text>
										{/* The price belongs to a same-brand, same-type catalog product that
										    may be a different size, so name it here too — the card is the
										    first place the user sees the claim. */}
										{p.bestOffer?.productName && (
											<Text style={styles.productOfferFor} numberOfLines={1}>
												{p.bestOffer.productName}
											</Text>
										)}
										<View style={styles.productFooter}>
											{p.bestOffer ? (
												<>
													<Text style={styles.productPrice}>{formatCurrencyS(p.bestOffer.price)}</Text>
													{delta && (
														<View style={styles.productDeltaBadge}>
															<Text style={styles.productDeltaText}>{delta}</Text>
														</View>
													)}
												</>
											) : p.campaignOffers.length > 0 ? (
												// Was missing entirely: a product whose only offer is a
												// campaign promotion sorted to the front and then announced
												// "Sin oferta activa" on the very card the ordering had
												// promoted.
												<Text style={styles.productPromo}>
													{describeCampaignDiscount(p.campaignOffers[0]) ?? "Promoción vigente"}
												</Text>
											) : p.alternativeOffers.length > 0 ? (
												// Ordering now promotes these, so the card can no longer
												// claim there is nothing on offer.
												<Text style={styles.productPrice}>Otra marca en oferta</Text>
											) : (
												<Text style={styles.productPrice}>Sin oferta activa</Text>
											)}
										</View>
									</Pressable>
								);
							})}
						</ScrollView>
						)}
					</>
				)}

				{/* Quick actions */}
				<View style={styles.quickRow}>
					<Pressable style={styles.quickItem} onPress={onOpenAnalysis}>
						<Ionicons name="bar-chart-outline" size={18} color={colors.defaultText} />
						<Text style={styles.quickLabel}>Análisis mensual</Text>
					</Pressable>
					<Pressable style={styles.quickItem} onPress={onOpenSmartList}>
						<Ionicons name="bulb-outline" size={18} color={colors.defaultText} />
						<Text style={styles.quickLabel}>Mis consumos</Text>
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

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: space.xl,
		paddingTop: space.smPlus,
		paddingBottom: space.lg,
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
	headerLogo: { width: 32, height: 32, borderRadius: 8, marginRight: space.smPlus },
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
		paddingHorizontal: space.xl,
		paddingTop: 18,
		paddingBottom: space.xxl,
		gap: space.mdPlus,
	},
	scrollContentTablet: {
		width: "100%",
		maxWidth: 640,
		alignSelf: "center",
	},
	savingsCard: {
		backgroundColor: colors.navy,
		borderRadius: 18,
		padding: space.xl,
		gap: space.xs,
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
		marginTop: space.xs,
	},
	savingsErrorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm },
	savingsErrorText: { color: "rgba(255,255,255,0.75)", fontFamily: typography.family.regular, fontSize: 13 },
	savingsRetryBtn: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, backgroundColor: colors.cyan, paddingHorizontal: space.smPlus, paddingVertical: space.xsPlus, borderRadius: 8 },
	savingsRetryText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	firstRunCard: { backgroundColor: colors.card, borderRadius: 16, padding: space.xl, alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: colors.divider },
	firstRunTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 15, textAlign: "center", marginTop: space.xs },
	firstRunBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19, textAlign: "center" },
	firstRunCta: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: space.md, borderRadius: 10, marginTop: space.xsPlus },
	firstRunCtaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 14 },
	savingsBottomRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: space.mdPlus,
		paddingTop: space.mdPlus,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.1)",
	},
	metricsRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
	metricDivider: {
		width: 1,
		height: 24,
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	metricLabel: {
		color: "rgba(255,255,255,0.55)",
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1,
	},
	metricValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 16,
		marginTop: 2,
	},
	savingsCta: {
		backgroundColor: colors.orange,
		paddingHorizontal: space.md,
		paddingVertical: space.sm,
		borderRadius: 10,
		flexShrink: 0,
		marginLeft: space.lg,
	},
	savingsCtaText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: space.sm,
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
	offersRow: { gap: space.md, paddingRight: space.xl },
	offerCard: {
		// Wider than the old 240: the number now sits in a tile beside the
		// text instead of above it, and the "En la 2da unidad" chip needs room
		// to read on one line.
		width: 262,
		borderRadius: 18,
		padding: space.mdPlus,
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
	offersEmpty: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	offersErrorRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	offersErrorText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
	},
	offersRetryBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
		backgroundColor: colors.navy,
		paddingHorizontal: space.smPlus,
		paddingVertical: space.xsPlus,
		borderRadius: 8,
	},
	offersRetryText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	offersEmptyText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
	},
	offerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	offerStoreRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
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
	storeName: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	offerValidity: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 12 },
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.md },
	// The percentage gets its own block instead of being one more line of
	// text — this is the visual cue the cards were missing.
	amountTile: {
		width: 78,
		borderRadius: 14,
		paddingVertical: space.sm,
		paddingHorizontal: space.xsPlus,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
		backgroundColor: colors.navy,
	},
	amountTileFlat: { paddingVertical: space.lg },
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: 3 },
	amountKicker: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.8,
	},
	amountValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 24,
	},
	offerBodyRight: { flex: 1, justifyContent: "center", gap: space.xsPlus },
	appliesChip: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: 8,
		backgroundColor: colors.softNavy,
	},
	// Warm for anything that is not simply taken off the price, so a
	// "50% en la 2da unidad" never looks like a plain 50% off.
	appliesChipWarm: { backgroundColor: colors.warmChip },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 11, lineHeight: 15 },
	appliesTextWarm: { color: colors.warmChipText },
	offerProduct: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 12,
		lineHeight: 16,
	},
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.xsPlus },
	priceNow: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 15 },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 11,
		textDecorationLine: "line-through",
	},
	offerSub: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, lineHeight: 15 },
	offerCaveatRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
	offerCaveat: {
		flex: 1,
		color: "#64748B",
		fontFamily: typography.family.regular,
		fontSize: 11,
		fontStyle: "italic",
	},
	// Matches offersRow above, so both carousels on this screen scroll the same.
	productsRow: {
		gap: space.smPlus,
		paddingRight: space.xl,
	},
	productsErrorRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	productsErrorText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
	},
	productsRetryBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
		backgroundColor: colors.navy,
		paddingHorizontal: space.smPlus,
		paddingVertical: space.xsPlus,
		borderRadius: 8,
	},
	productsRetryText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	productsEmpty: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	productsEmptyText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
	},
	productCard: {
		// Fixed width now that these scroll horizontally; flex:1 only made sense
		// while it was a static row of three.
		width: 150,
		backgroundColor: colors.card,
		borderRadius: 14,
		padding: space.md,
		gap: space.xsPlus,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	productIconWrap: {
		width: "100%",
		aspectRatio: 1,
		borderRadius: 10,
		backgroundColor: colors.softWarm,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: space.xsPlus,
	},
	productName: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 17,
	},
	productOfferFor: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 10,
		lineHeight: 14,
		marginTop: 1,
	},
	productFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 2,
	},
	productPrice: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	// Slightly smaller than a price: a promotion headline is wordier and has to
	// fit the narrow card without truncating.
	productPromo: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 13,
		lineHeight: 17,
	},
	productDeltaBadge: {
		backgroundColor: colors.successSoft,
		paddingHorizontal: space.sm,
		paddingVertical: 3,
		borderRadius: 6,
	},
	productDeltaText: {
		color: colors.successSoftText,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	quickRow: { flexDirection: "row", gap: space.smPlus, marginTop: space.xs },
	quickItem: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.card,
		borderRadius: 10,
		paddingVertical: space.md,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	quickLabel: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	});
}
