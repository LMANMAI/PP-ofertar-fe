import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomNav, OfferCarouselCardSkeleton, ProductCardSkeleton, type TabKey, useOnboardingTarget, StoreBadge, PrimaryButton } from "../components";
import { radii, space, typography, useIsTablet, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { type Session, getInitials, getAvatarUri, splitName } from "../auth/session";
import {
	describeCampaignDiscount,
	getOffers,
	getRecurringProducts,
	getSavingsReport,
	sortByOfferRelevance,
} from "../services";
import type { Offer, RecurringProduct, SavingsReportResponse } from "../services";
import { formatCurrency, formatLongDate, yyyyMM } from "../utils/format";
import { isLooseMatch } from "../utils/productMatch";
import { ConditionsButton, PromoConditionsSheet } from "../components/PromoConditionsSheet";
import {
	heroSpoken,
	offerCardHero,
	offerConditions,
	productOfferHero,
	type PromoConditions,
} from "../components/promoConditions";
import { catalogImageUri } from "../utils/productImage";
import { isInBasket } from "../utils/basket";
import { PRODUCT_PLACEHOLDER } from "../theme/productPlaceholder";

type HomeCache = {
	token: string;
	savings?: SavingsReportResponse["summary"];
	allTimeTickets?: number;
	recurring?: RecurringProduct[];
	offers?: Offer[];
};

// The screen unmounts whenever the user visits another tab, so without this
// every return to Inicio started from empty and flashed four skeletons. The
// last answer is shown at once and the fetches still run behind it.
let homeCache: HomeCache | null = null;

function patchHomeCache(token: string, patch: Partial<Omit<HomeCache, "token">>) {
	const base: HomeCache = homeCache?.token === token ? homeCache : { token };
	homeCache = { ...base, ...patch };
}

/**
 * A catalog photo URL that is actually safe to hand to <Image>.
 *
 * It reaches here from a retailer's catalog through two services, so it can be
 * absent (a backend deployed before the field existed), an empty string, or a
 * site-relative path the retailer only ever meant to resolve on its own pages.
 * Anything that is not an absolute http(s) URL is treated as "no photo", which
 * is the same outcome as a product the catalog never photographed: the card
 * draws the icon it has always drawn. An <Image> pointed at a relative path
 * fails silently and leaves a hole, which is the one result worth avoiding.
 */
/**
 * The square tile at the top of a "productos que comprás seguido" card.
 *
 * Its own component because the fallback needs state, and state cannot live
 * inside the .map that renders the row. A dead URL only announces itself
 * through onError, and when it does exactly one card has to swap back to the
 * icon — remembering *which* URL failed rather than a bare boolean, so a
 * refreshed list with a new photo gets a fresh attempt instead of inheriting
 * the previous card's failure.
 *
 * The tile keeps the same size, radius and background in all three states, so
 * a product with no photo, a photo that 404s, and a backend that sends no
 * photos at all are indistinguishable from how the carousel looked before.
 */
function RecurringProductThumb({
	uri,
	styles,
}: {
	uri: string | null;
	styles: ReturnType<typeof createStyles>;
}) {
	const [failedUri, setFailedUri] = useState<string | null>(null);
	const showPhoto = uri !== null && uri !== failedUri;

	return (
		<View style={styles.productIconWrap}>
			<Image
				// Un solo <Image>: el placeholder es un asset local, así que no
				// puede fallar en carga y no necesita su propio onError. Lo que
				// cambia es la fuente, no el árbol, así que la tarjeta no salta
				// de tamaño cuando una foto no llega.
				source={showPhoto ? { uri } : PRODUCT_PLACEHOLDER}
				// Mismo estilo para los dos: la ilustración es cuadrada y el tile
				// también, así que "contain" la deja justo a borde con borde y su
				// propio fondo blanco pasa a ser el del tile, recortado por las
				// esquinas redondeadas. Reducirla dejaba ese blanco flotando
				// sobre otro fondo y se veían dos blancos distintos.
				style={styles.productImage}
				// The catalog ships packshots on white at assorted aspect
				// ratios; "cover" would crop the label off the tall ones.
				resizeMode="contain"
				onError={() => setFailedUri(uri)}
				// The product name is right underneath, so announcing the
				// picture too would just make the card read twice.
				accessible={false}
			/>
		</View>
	);
}

/** One offer in the home carousel. Informational only: there is no activation
 * or points behind these, so the card states what is on offer, where, until
 * when, and which of the user's products it touches.
 *
 * Lo grande es lo que se paga. Una oferta de catálogo muestra el precio final
 * con el de lista tachado, sin tile de porcentaje: con el tachado a la vista,
 * el "-25%" es una cuenta que el usuario no necesita. Una campaña no trae
 * precio, así que su número va en el tile y, al lado, el chip que responde
 * "¿sobre qué se aplica?" — una card que dice 50% sin decir si es la unidad o
 * la segunda unidad es peor que no tener card. La letra chica (el aviso de
 * porcentaje leído de la imagen, los legales) está detrás de "Condiciones".
 */
function OfferCarouselCard({
	offer,
	onPress,
	onOpenConditions,
	inBasket = false,
	styles,
}: {
	offer: Offer;
	onPress: () => void;
	onOpenConditions: (conditions: PromoConditions) => void;
	inBasket?: boolean;
	styles: ReturnType<typeof createStyles>;
}) {
	const colors = useThemeColors();
	const until = formatLongDate(offer.activeTo);
	// Campaigns are worded from the structured mechanic + percentages; a
	// backend that predates those fields falls back to the headline string it
	// already sent. `offerCardHero` hace las dos cosas.
	const hero = offerCardHero(offer);
	const conditions = offerConditions(offer);

	const spoken = [
		`${offer.kind === "catalog" ? "Oferta" : "Promoción"} en ${offer.retailerName ?? "tu súper"}`,
		offer.kind === "catalog" ? offer.productName ?? offer.headline : null,
		heroSpoken(hero) || (offer.kind === "catalog" ? null : offer.headline),
		until ? `vigente hasta el ${until}` : null,
		inBasket ? "de tu compra" : null,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<View style={styles.offerCard}>
			{/* El área que abre el detalle y el botón de condiciones son hermanos:
			    con el label en toda la card, el lector de pantalla no vería el
			    botón. */}
			<Pressable
				onPress={onPress}
				style={(state) => [styles.offerMain, state.pressed && styles.offerCardPressed, isFocused(state) && styles.focusRing]}
				accessibilityRole="button"
				accessibilityLabel={spoken}
			>
				<View style={styles.offerTop}>
					<View style={styles.offerStoreRow}>
						<StoreBadge retailerSlug={offer.retailerSlug} retailerName={offer.retailerName} />
						<Text style={styles.storeName} numberOfLines={1}>
							{offer.retailerName}
						</Text>
					</View>
					{inBasket && (
						<View style={styles.basketTag}>
							<Ionicons name="cart-outline" size={12} color={colors.infoSoftText} />
							<Text style={styles.basketTagText}>De tu compra</Text>
						</View>
					)}
				</View>

				{hero.kind === "price" ? (
					<View style={styles.catalogBody}>
						<Text style={styles.offerProduct} numberOfLines={2}>
							{offer.productName ?? offer.headline}
						</Text>
						<View style={styles.priceRow}>
							<Text style={styles.priceNow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
								{formatCurrency(hero.price)}
							</Text>
							{hero.listPrice != null && (
								<Text style={styles.priceWas} numberOfLines={1}>
									{formatCurrency(hero.listPrice)}
								</Text>
							)}
							{hero.discountPct != null && <Text style={styles.pctNote}>-{hero.discountPct}%</Text>}
						</View>
					</View>
				) : (
					<View style={styles.offerBody}>
						{hero.kind === "mechanic" && hero.amount ? (
							<View style={styles.amountTile}>
								<View style={styles.amountKickerRow}>
									<Ionicons name={hero.icon} size={11} color={colors.cyan} />
									{hero.capped && <Text style={styles.amountKicker}>HASTA</Text>}
								</View>
								<Text
									style={styles.amountValue}
									numberOfLines={1}
									adjustsFontSizeToFit
									minimumFontScale={0.6}
								>
									{hero.amount}
								</Text>
							</View>
						) : (
							<View style={[styles.amountTile, styles.amountTileFlat]}>
								<Ionicons name={hero.kind === "mechanic" ? hero.icon : "pricetag-outline"} size={22} color={colors.cyan} />
							</View>
						)}

						<View style={styles.offerBodyRight}>
							{offer.kind === "catalog" ? (
								<Text style={styles.offerProduct} numberOfLines={2}>
									{offer.productName ?? offer.headline}
								</Text>
							) : (
								<>
									{hero.kind === "mechanic" && hero.applies ? (
										<View style={[styles.appliesChip, hero.conditional && styles.appliesChipWarm]}>
											<Text
												style={[styles.appliesText, hero.conditional && styles.appliesTextWarm]}
												numberOfLines={2}
											>
												{hero.applies}
											</Text>
										</View>
									) : null}
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
				)}

				{until && (
					<Text style={styles.offerValidity}>Vigente hasta el {until}</Text>
				)}
			</Pressable>

			{conditions !== null && (
				<ConditionsButton
					onPress={() => onOpenConditions(conditions)}
					accessibilityLabel={`Condiciones de la promoción de ${offer.retailerName ?? "tu súper"}`}
				/>
			)}
		</View>
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
	onOpenHabitual: () => void;
	/** La oferta entera, por el mismo motivo que en OffersScreen: el carrusel
	 * sale de su propio fetch y no del que resuelve el detalle. */
	onOpenOffer: (offerId: string, fallback?: Offer | null) => void;
};

const FEED_PAGE_SIZE = 24;
const OFFERS_SHOWN = 8;

export function HomeScreen({
	session,
	activeTab,
	onSelectTab,
	onScanPress,
	onOpenHistory,
	onOpenAnalysis,
	onOpenRecurring,
	onOpenHabitual,
	onOpenOffer,
}: Props) {
	const insets = useSafeAreaInsets();
	const isTablet = useIsTablet();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const cached = homeCache?.token === session.token ? homeCache : null;
	const [savings, setSavings] = useState<SavingsReportResponse["summary"] | null>(cached?.savings ?? null);
	// Tickets ever scanned, not just this month: "new user" must not flip on the
	// 1st of a month or after a month without scans. Null while unknown.
	const [allTimeTickets, setAllTimeTickets] = useState<number | null>(cached?.allTimeTickets ?? null);
	const [recurringProducts, setRecurringProducts] = useState<RecurringProduct[]>(cached?.recurring ?? []);
	const [offers, setOffers] = useState<Offer[]>(cached?.offers ?? []);
	const offersTarget = useOnboardingTarget("offers");
	const historyTarget = useOnboardingTarget("history");
	const [savingsError, setSavingsError] = useState(false);
	const [loadingSavings, setLoadingSavings] = useState(!cached?.savings);
	const [loadingRecurring, setLoadingRecurring] = useState(!cached?.recurring);
	const [recurringError, setRecurringError] = useState(false);
	const [loadingOffers, setLoadingOffers] = useState(!cached?.offers);
	const [offersError, setOffersError] = useState(false);
	// La hoja de condiciones del carrusel de ofertas, o null.
	const [conditions, setConditions] = useState<PromoConditions | null>(null);
	const openConditions = useCallback((next: PromoConditions) => setConditions(next), []);
	const closeConditions = useCallback(() => setConditions(null), []);
	// Se cierra antes de navegar para no encontrarla abierta al volver.
	const openFullOffer = useCallback(
		(offer: Offer) => {
			setConditions(null);
			onOpenOffer(offer.id, offer);
		},
		[onOpenOffer],
	);

	function formatCurrencyS(value: number | null | undefined): string {
		if (value == null) return "$0";
		return `$${Math.round(value).toLocaleString("es-AR")}`;
	}

	const loadSavings = (silent = false) => {
		if (!silent) setLoadingSavings(true);
		setSavingsError(false);
		// The card is titled for the month; without these bounds the backend
		// applies no filter at all and answers with the user's whole history,
		// so tickets from previous months were being counted as this month's.
		const month = yyyyMM(new Date());
		getSavingsReport(session.token, month, month)
			.then((r) => {
				setSavings(r.summary);
				patchHomeCache(session.token, { savings: r.summary });
			})
			// A failed refresh keeps what the cache already showed.
			.catch(() => {
				if (!silent) setSavingsError(true);
			})
			.finally(() => setLoadingSavings(false));
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the session token changes
		loadSavings(cached?.savings != null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	useEffect(() => {
		// No bounds: the backend answers with the whole history.
		getSavingsReport(session.token)
			.then((r) => {
				setAllTimeTickets(r.summary.ticketCount);
				patchHomeCache(session.token, { allTimeTickets: r.summary.ticketCount });
			})
			.catch(() => setAllTimeTickets(null));
	}, [session.token]);

	const loadRecurring = (silent = false) => {
		if (!silent) setLoadingRecurring(true);
		setRecurringError(false);
		getRecurringProducts(session.token)
			// Same ordering as the full section, so the carousel reads left to
			// right in the same priority the user sees after "Ver todos": own
			// offer first, then other-brand offer, then no offer — each group by
			// how often they buy it. The backend's own order is by frequency
			// alone, which filled the first cards with staples nobody discounts.
			.then((products) => {
				const top = sortByOfferRelevance(products).slice(0, 10);
				setRecurringProducts(top);
				patchHomeCache(session.token, { recurring: top });
			})
			.catch(() => {
				if (!silent) setRecurringError(true);
			})
			.finally(() => setLoadingRecurring(false));
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the session token changes
		loadRecurring(cached?.recurring != null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	// Everything on offer at the user's chains, not just what matches their
	// habitual products. A wider page than what is shown, so the ones that do
	// match their basket can be floated to the front (see rankedOffers).
	const loadOffers = (silent = false) => {
		if (!silent) setLoadingOffers(true);
		setOffersError(false);
		getOffers(session.token, 1, FEED_PAGE_SIZE)
			.then((p) => {
				setOffers(p.items);
				patchHomeCache(session.token, { offers: p.items });
			})
			.catch(() => {
				if (!silent) setOffersError(true);
			})
			.finally(() => setLoadingOffers(false));
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the session token changes
		loadOffers(cached?.offers != null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.token]);

	// Offers for what the user actually buys come first, and say so; the rest
	// keep the feed's own order. Without recurring products nothing is floated.
	const rankedOffers = useMemo(() => {
		const flagged = offers.map((offer) => ({ offer, inBasket: isInBasket(offer, recurringProducts) }));
		return [...flagged.filter((f) => f.inBasket), ...flagged.filter((f) => !f.inBasket)].slice(0, OFFERS_SHOWN);
	}, [offers, recurringProducts]);

	const savingsTickets = savings?.ticketCount ?? 0;
	const savingsAvg = savings ? formatCurrencyS(savings.averageSavings) : "$0";
	const isNewUser = allTimeTickets === 0;
	const onOfferCount = recurringProducts.filter(
		(p) => p.bestOffer != null || p.campaignOffers.length > 0 || p.alternativeOffers.length > 0,
	).length;
	const greetingSub =
		onOfferCount > 0
			? `${onOfferCount} ${onOfferCount === 1 ? "de tus productos habituales está" : "de tus productos habituales están"} en oferta`
			: loadingRecurring
			? "Qué bueno tenerte de nuevo"
			: isNewUser
				? "Escaneá tu primer ticket para empezar a ahorrar"
				: "Sin ofertas en tus productos habituales por ahora";

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />

			<View style={styles.header}>
				<Image
					source={require("../../assets/logo_ofertar.png")}
					style={styles.headerLogo}
					accessible={false}
				/>
				<View style={styles.headerLeft}>
					<Text style={styles.greeting} accessibilityRole="header">¡Hola, {splitName(session.user.name).firstName}!</Text>
					<Text style={styles.greetingSub}>{greetingSub}</Text>
				</View>
				<Pressable
					onPress={() => onSelectTab("profile")}
					style={(state) => [
						styles.avatar,
						state.pressed && { opacity: 0.85 },
						isFocused(state) && styles.focusRing,
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
				{/* Savings card. The figure is the sum of the discounts printed on the
				    month's scanned tickets, and the card says so. */}
				{/* eslint-disable-next-line react-hooks/refs -- attachRef/onLayout are a stable useCallback from useOnboardingTarget, not a render-time ref read */}
				<View ref={historyTarget.attachRef} onLayout={historyTarget.onLayout} style={styles.savingsCard}>
					<Text style={styles.savingsOverline}>Ahorrado este mes</Text>
					{savingsError ? (
						<View style={styles.savingsErrorRow}>
							<Text style={styles.savingsErrorText}>
								No pudimos cargar tu ahorro
							</Text>
							<Pressable
								onPress={() => loadSavings()}
								style={(state) => [styles.savingsRetryBtn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel="Reintentar cargar ahorro"
							>
								<Ionicons name="refresh" size={14} color={colors.navy} />
								<Text style={styles.savingsRetryText}>Reintentar</Text>
							</Pressable>
						</View>
					) : loadingSavings ? (
						<View style={styles.savingsAmountSkeleton} accessible accessibilityLabel="Cargando tu ahorro" />
					) : (
						<>
							<Text style={styles.savingsAmount}>
								{formatCurrencyS(savings?.totalSavings)}
							</Text>
							<Text style={styles.savingsHint}>Descuentos que figuran en tus tickets</Text>
						</>
					)}
					<View style={styles.savingsBottomRow}>
						{savings && !savingsError ? (
							<View style={styles.metricsRow}>
								<View>
									<Text style={styles.metricLabel}>Tickets</Text>
									<Text style={styles.metricValue}>{savingsTickets}</Text>
								</View>
								<View style={styles.metricDivider} />
								<View>
									<Text style={styles.metricLabel}>Promedio por ticket</Text>
									<Text style={[styles.metricValue, { color: colors.cyan }]}>
										{savingsAvg}
									</Text>
								</View>
							</View>
						) : loadingSavings ? (
							<View style={styles.metricsRow}>
								<View style={styles.metricSkeleton} />
								<View style={styles.metricDivider} />
								<View style={styles.metricSkeleton} />
							</View>
						) : (
							<View style={styles.metricsRow} />
						)}
						<Pressable
							style={(state) => [styles.savingsCta, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
							onPress={onOpenHistory}
							hitSlop={4}
							accessibilityRole="button"
							accessibilityLabel="Ver mis tickets"
						>
							<Text style={styles.savingsCtaText} numberOfLines={1}>Ver mis tickets</Text>
						</Pressable>
					</View>
				</View>

				{isNewUser ? (
					<View style={styles.firstRunCard}>
						<Ionicons name="receipt-outline" size={32} color={colors.cyan} />
						<Text style={styles.firstRunTitle}>Todavía no escaneaste ningún ticket</Text>
						<Text style={styles.firstRunBody}>
							Escaneá tu primer ticket y vamos a mostrarte acá los productos que
							comprás seguido y cuánto podés ahorrar.
						</Text>
						<PrimaryButton
							label="Escanear mi primer ticket"
							onPress={onScanPress}
							icon="camera-outline"
							size="compact"
							style={styles.firstRunCta}
						/>
					</View>
				) : (
					<>
						{/* Lo que el usuario ya compra, primero: es lo que responde a "qué me
						    conviene comprar la próxima vez". */}
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle} accessibilityRole="header">PARA TU PRÓXIMA COMPRA</Text>
							<Pressable
								onPress={onOpenRecurring}
								style={(state) => [styles.sectionLinkWrap, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel="Ver todos los productos que comprás seguido"
							>
								<Text style={styles.sectionLink}>Ver todos</Text>
							</Pressable>
						</View>
						{loadingRecurring ? (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.productsRow}
								accessible accessibilityLabel="Cargando productos que comprás seguido"
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
									onPress={() => loadRecurring()}
									style={(state) => [styles.productsRetryBtn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
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
								// Lo mismo que muestra "Productos recurrentes", en chico: el
								// precio final con el de lista tachado, o —con una promo
								// condicional— el precio por unidad o la mecánica, y siempre
								// cuánto sale una sola unidad. Un precio que es de otro
								// producto (`isLooseMatch`) no lleva descuento: antes esta
								// card le ponía el "-X%" igual.
								const hero = p.bestOffer
									? productOfferHero(p.bestOffer, isLooseMatch(p.description, p.bestOffer.productName))
									: null;
								// The photo belongs to the catalog SKU the offer resolved to —
								// by barcode for most lines, so it really is the article on the
								// receipt. No offer means no photo, and the icon stands.
								const photo = catalogImageUri(p.bestOffer?.imageUrl);
								const spoken = [
									p.description,
									p.bestOffer && hero ? `en ${p.bestOffer.retailerName}, ${heroSpoken(hero)}` : null,
									p.bestOffer && p.lastPaidPrice != null ? `última compra ${formatCurrencyS(p.lastPaidPrice)}` : null,
								]
									.filter(Boolean)
									.join(", ");
								return (
									<Pressable
										key={id}
										style={(state) => [styles.productCard, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
										onPress={onOpenRecurring}
										accessibilityRole="button"
										accessibilityLabel={spoken}
									>
										<RecurringProductThumb uri={photo} styles={styles} />
										<Text style={styles.productName} numberOfLines={2}>{p.description}</Text>
										{/* The price belongs to a same-brand, same-type catalog product that
										    may be a different size, so name it here too — the card is the
										    first place the user sees the claim. */}
										{p.bestOffer?.productName && (
											<Text style={styles.productOfferFor} numberOfLines={2}>
												{p.bestOffer.productName}
											</Text>
										)}
										<View style={styles.productFooter}>
											{hero && hero.kind === "price" ? (
												<View style={styles.productPriceCol}>
													<Text style={styles.productPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
														{formatCurrencyS(hero.price)}
													</Text>
													{hero.listPrice != null ? (
														<Text style={styles.productPriceWas} numberOfLines={1}>
															{formatCurrencyS(hero.listPrice)}
														</Text>
													) : hero.discountPct != null ? (
														<View style={styles.productDeltaBadge}>
															<Text style={styles.productDeltaText}>-{hero.discountPct}%</Text>
														</View>
													) : null}
												</View>
											) : hero && hero.kind === "unitPrice" ? (
												// El número y su condición en el mismo bloque, y abajo
												// lo que sale una sola unidad.
												<View style={styles.productPriceCol}>
													<Text style={styles.productPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
														{formatCurrencyS(hero.unitPrice)} c/u
													</Text>
													<Text style={styles.productCondition}>{hero.condition}</Text>
													<Text style={styles.productSingle}>{hero.single.text}</Text>
												</View>
											) : hero && hero.kind === "mechanic" ? (
												// Sin precio por unidad publicado: la mecánica manda.
												<View style={styles.productPriceCol}>
													<Text style={styles.productPromo} numberOfLines={1}>
														{hero.capped ? "Hasta " : ""}
														{hero.amount ?? "Promo"}
													</Text>
													{hero.applies ? (
														<Text style={styles.productCondition} numberOfLines={2}>
															{hero.applies}
														</Text>
													) : null}
													{hero.single ? <Text style={styles.productSingle}>{hero.single.text}</Text> : null}
												</View>
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
										{/* The baseline the "-40%" lacks on its own: what they paid the
										    last time. A fact from their ticket, not a computed saving;
										    for products sold by weight it is per kilo. */}
										{p.bestOffer && p.lastPaidPrice != null && (
											<Text style={styles.productLastPaid}>
												Última compra: {formatCurrencyS(p.lastPaidPrice)}
											</Text>
										)}
										{/* Same rule as the full list: a shelf price and a campaign
										    are different offers, so the price must not swallow the
										    promotion the ordering promoted this card for. */}
										{p.bestOffer && p.campaignOffers.length > 0 && (
											<Text style={styles.productPromo} numberOfLines={1}>
												{describeCampaignDiscount(p.campaignOffers[0]) ?? "Promoción vigente"}
											</Text>
										)}
									</Pressable>
								);
							})}
						</ScrollView>
						)}

						{/* Tu compra habitual era un atajo de 12 px bajo el pliegue. */}
						<Pressable
							style={(state) => [styles.smartListCard, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
							onPress={onOpenHabitual}
							accessibilityRole="button"
							accessibilityLabel="Tu compra habitual. Lo que comprás seguido y qué te falta"
						>
							<View style={styles.smartListIcon}>
								<Ionicons name="bulb-outline" size={20} color={colors.cyan} />
							</View>
							<View style={styles.smartListCopy}>
								<Text style={styles.smartListTitle}>Tu compra habitual</Text>
								<Text style={styles.smartListBody}>
									Lo que comprás seguido y qué te falta.
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
						</Pressable>
					</>
				)}

				{/* Ofertas vigentes en los súper que sigue el usuario. El backend ya
				    restringe el match a sus cadenas favoritas, así que todo lo que
				    llega acá es de un súper que eligió. Las de sus productos, primero. */}
				{/* eslint-disable-next-line react-hooks/refs -- attachRef/onLayout are a stable useCallback from useOnboardingTarget, not a render-time ref read */}
				<View ref={offersTarget.attachRef} onLayout={offersTarget.onLayout} style={styles.sectionHeader}>
					<Text style={styles.sectionTitle} accessibilityRole="header">OFERTAS EN TUS SÚPER</Text>
					<Pressable
						onPress={() => onSelectTab("offers")}
						style={(state) => [styles.sectionLinkWrap, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel="Ver todas las ofertas"
					>
						<Text style={styles.sectionLink}>Ver todas</Text>
					</Pressable>
				</View>
				{loadingOffers ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.offersRow}
						accessible accessibilityLabel="Cargando ofertas en tus súper"
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
							onPress={() => loadOffers()}
							style={(state) => [styles.offersRetryBtn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
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
						{rankedOffers.map(({ offer, inBasket }) => (
							<OfferCarouselCard key={offer.id} styles={styles} offer={offer} inBasket={inBasket}
								onPress={() => onOpenOffer(offer.id, offer)}
								onOpenConditions={openConditions}
							/>
						))}
					</ScrollView>
				)}

				<Pressable
					style={(state) => [styles.smartListCard, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
					onPress={onOpenAnalysis}
					accessibilityRole="button"
					accessibilityLabel="Análisis mensual"
				>
					<View style={styles.smartListIcon}>
						<Ionicons name="bar-chart-outline" size={20} color={colors.cyan} />
					</View>
					<View style={styles.smartListCopy}>
						<Text style={styles.smartListTitle}>Análisis mensual</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
				</Pressable>
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

			<PromoConditionsSheet conditions={conditions} onClose={closeConditions} onOpenFull={openFullOffer} />
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
		borderBottomLeftRadius: radii.xl,
		borderBottomRightRadius: radii.xl,
	},
	headerLogo: { width: 32, height: 32, borderRadius: radii.sm, marginRight: space.smPlus },
	headerLeft: { flex: 1 },
	greeting: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.h3,
		lineHeight: typography.lineHeights.h3,
	},
	greetingSub: {
		color: colors.navyMutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
		marginTop: 2,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: radii.full,
		backgroundColor: colors.cyan,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	
	avatarImage: { width: "100%", height: "100%" },
	avatarText: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.label,
	},
	scroll: { flex: 1, backgroundColor: colors.background },
	scrollContent: {
		paddingHorizontal: space.xl,
		paddingTop: space.xl,
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
			borderRadius: radii.xl,
			padding: space.xl,
			gap: space.xs,
			// Navy on the dark page is ~1.1:1, so the edge is drawn.
			borderWidth: 1,
			borderColor: colors.navyHairline,
		},
	savingsOverline: {
		color: colors.navyMutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		
	},
	savingsAmount: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.display,
		lineHeight: typography.lineHeights.display,
		marginTop: space.xs,
	},
	savingsHint: {
		color: colors.navyMutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	// Placeholder blocks while the figures load, instead of a "$0" or "0" that
	// reads as data.
	savingsAmountSkeleton: { width: 140, height: 36, borderRadius: radii.sm, marginVertical: space.xs, backgroundColor: colors.navyHairline },
	metricSkeleton: { width: 64, height: 28, borderRadius: radii.sm, backgroundColor: colors.navyHairline },
	savingsErrorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm },
	savingsErrorText: { color: colors.navyMutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	savingsRetryBtn: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, backgroundColor: colors.cyan, paddingHorizontal: space.smPlus, minHeight: 44, borderRadius: radii.sm },
	savingsRetryText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	firstRunCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: space.xl, alignItems: "center", gap: space.sm, borderWidth: 1, borderColor: colors.divider },
	firstRunTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.body, textAlign: "center", marginTop: space.xs },
	firstRunBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption, textAlign: "center" },
	firstRunCta: { marginTop: space.xsPlus },
	savingsBottomRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: space.mdPlus,
		paddingTop: space.mdPlus,
		borderTopWidth: 1,
		borderTopColor: colors.navyHairline,
	},
	metricsRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
	metricDivider: {
		width: 1,
		height: 24,
		backgroundColor: colors.navyHairline,
	},
	metricLabel: {
		color: colors.navyMutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		
	},
	metricValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.subtitle,
		marginTop: 2,
	},
	savingsCta: {
		backgroundColor: colors.orange,
		paddingHorizontal: space.md,
		minHeight: 44,
		justifyContent: "center",
		borderRadius: radii.md,
		flexShrink: 0,
		marginLeft: space.lg,
	},
	// White on the coral fill is 3.09:1; navy on coral is ~5.3:1 (same rule as
	// the welcome screen's primary button).
	savingsCtaText: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
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
		fontSize: typography.sizes.micro,
		letterSpacing: 1.4,
	},
	// 44px tall hit area; the negative vertical margin keeps the row as tight
	// as it was with a bare 15px link.
	sectionLinkWrap: { minHeight: 44, justifyContent: "center", marginVertical: -space.mdPlus, paddingHorizontal: space.xs },
	// Cyan only reads on the dark theme (1.6:1 on the light page), so the link
	// takes the action color: navy in light, cyan in dark.
	sectionLink: {
		color: colors.actionFill,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		textDecorationLine: "underline",
	},
	offersRow: { gap: space.md, paddingRight: space.xl },
	offerCard: {
		// Wider than the old 240: the number now sits in a tile beside the
		// text instead of above it, and the "En la 2da unidad" chip needs room
		// to read on one line.
		width: 262,
		borderRadius: radii.xl,
		padding: space.mdPlus,
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
	},
	pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		offerCardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
	// El área tocable ocupa lo que sobra, así en un carrusel con cards de
	// distinto alto el botón de condiciones queda siempre abajo de todo.
	offerMain: { flexGrow: 1, gap: space.smPlus },
	offersEmpty: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	offersErrorRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	offersErrorText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	offersRetryBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.xsPlus,
			backgroundColor: colors.actionFill,
			paddingHorizontal: space.smPlus,
			minHeight: 44,
			borderRadius: radii.sm,
		},
	offersRetryText: {
			color: colors.actionText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
		},
	offersEmptyText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	offerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	offerStoreRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
	basketTag: { flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.infoSoft, borderRadius: radii.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
	basketTagText: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	// El súper en negrita: junto con el logo es lo que se reconoce de un
	// vistazo.
	storeName: { flex: 1, color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.label },
	offerValidity: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.md },
	// The percentage gets its own block instead of being one more line of
	// text — this is the visual cue the cards were missing.
	amountTile: {
		width: 78,
		borderRadius: radii.lg,
		paddingVertical: space.sm,
		paddingHorizontal: space.xsPlus,
		alignItems: "center",
		justifyContent: "center",
		gap: 2, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.navyHairline, },
	amountTileFlat: { paddingVertical: space.lg },
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
	amountKicker: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		letterSpacing: 0.8,
	},
	amountValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h2,
	},
	offerBodyRight: { flex: 1, justifyContent: "center", gap: space.xsPlus },
	appliesChip: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: radii.sm,
		backgroundColor: colors.softNavy,
	},
	// Warm for anything that is not simply taken off the price, so a
	// "50% en la 2da unidad" never looks like a plain 50% off.
	appliesChipWarm: { backgroundColor: colors.warmChip },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
	appliesTextWarm: { color: colors.warmChipText },
	offerProduct: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	// Sin tile para una oferta de catálogo: el precio final es el número
	// grande. `flexWrap` para que un monto largo baje el tachado de renglón.
	catalogBody: { gap: space.xs },
	priceRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: space.xsPlus },
	priceNow: { flexShrink: 1, color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.h2, lineHeight: typography.lineHeights.h2 },
	pctNote: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		textDecorationLine: "line-through",
	},
	offerSub: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
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
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	productsErrorText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	productsRetryBtn: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.xsPlus,
			backgroundColor: colors.actionFill,
			paddingHorizontal: space.smPlus,
			minHeight: 44,
			borderRadius: radii.sm,
		},
	productsRetryText: {
			color: colors.actionText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
		},
	productsEmpty: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		backgroundColor: colors.card,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.divider,
		padding: space.mdPlus,
	},
	productsEmptyText: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	productCard: {
		// Fixed width now that these scroll horizontally; flex:1 only made sense
		// while it was a static row of three.
		width: 150,
		backgroundColor: colors.card,
		borderRadius: radii.lg,
		padding: space.md,
		gap: space.xsPlus,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	productIconWrap: {
		width: "100%",
		aspectRatio: 1,
		borderRadius: radii.md,
		backgroundColor: colors.softWarm,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: space.xsPlus,
		// The photo is clipped to the tile rather than sized to it, so a
		// packshot can never bleed past the rounded corner while it loads.
		overflow: "hidden",
	},
	/** Fills the tile above, which is what keeps the card the exact size it
	 * was when this was an icon. The tile's own background shows through
	 * around a photo that does not fill it. */
	productImage: {
		width: "100%",
		height: "100%",
	},
	productName: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	productOfferFor: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
		marginTop: 1,
	},
	productLastPaid: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	smartListCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.md,
		backgroundColor: colors.card,
		borderRadius: radii.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: space.mdPlus,
	},
	smartListIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.navyHairline, alignItems: "center", justifyContent: "center" },
	smartListCopy: { flex: 1, gap: 2 },
	smartListTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.body },
	smartListBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
	productFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 2,
	},
	productPrice: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
	},
	// Slightly smaller than a price: a promotion headline is wordier and has to
	// fit the narrow card without truncating.
	productPromo: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	productPriceCol: { flexShrink: 1, gap: 2 },
	productPriceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
		textDecorationLine: "line-through",
	},
	// La condición en el tono cálido de los chips de "aplica a": no es una
	// rebaja lisa.
	productCondition: {
		color: colors.warmChipText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	productSingle: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	productDeltaBadge: {
		backgroundColor: colors.successSoft,
		paddingHorizontal: space.sm,
		paddingVertical: 3,
		borderRadius: radii.sm,
	},
	productDeltaText: {
		color: colors.successSoftText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
	},
	});
}
