import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { BottomNav, EmptyState, ErrorBanner, InlineNotice, ScreenHeader, Skeleton, type TabKey } from "../components";
import { ProductOfferLine } from "../components/ProductOfferLine";
import { describePromoLabel, getFollowedProducts, pickProductPromo, readPromoLabels } from "../services";
import type { FollowedProduct, RecurringProduct } from "../services";
import { friendlyAuthError } from "../services/authApi";
import type { Session } from "../auth/session";
import { PRODUCT_PLACEHOLDER } from "../theme/productPlaceholder";
import { formatCurrency, formatLongDate } from "../utils/format";
import { catalogImageUri } from "../utils/productImage";
import { isLooseMatch } from "../utils/productMatch";

/** Quantity promotions shown per product; the rest are the same idea at another chain. */
const MECHANICS_SHOWN = 2;

type Mechanic = FollowedProduct["promoMechanics"][number];

type Props = {
	session: Session;
	/** Whether this screen is the one showing. It reloads each time it comes
	 * back, so a product followed in the scanner opened from here shows up. */
	focused: boolean;
	onBack: () => void;
	/** Products are followed from the barcode scanner. */
	onScanProduct: () => void;
	/** Resolves to whether it stopped being followed; telling the user why not
	 * is the caller's job. */
	onUnfollow: (product: FollowedProduct) => Promise<boolean>;
	/** Where it is cheapest, for the chains the user picked. */
	onSeePrices: (product: FollowedProduct) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

/**
 * The shape `ProductOfferLine` words an offer from. The backend only sends when
 * a followed product was last bought (said on its own line, see
 * lastPurchaseLine), not what was paid, so everything about past purchases is
 * empty — which is also what keeps the "menos que en tu último ticket" line
 * from showing.
 */
function asOfferSubject(p: FollowedProduct): RecurringProduct {
	return {
		description: p.description,
		barcode: p.ean,
		category: null,
		purchaseCount: 0,
		ticketCount: 0,
		inReferenceTicket: false,
		totalDiscounts: 0,
		lastPaidPrice: null,
		lastPaidAt: null,
		bestOffer: p.bestOffer,
		campaignOffers: p.campaignOffers,
		alternativeOffers: [],
		followed: true,
	};
}

/**
 * "Lo compraste el 12 de octubre": it is also on a scanned ticket, so the user
 * sees it is the same product as in "Productos recurrentes" and not another
 * one. The year only when it is not this one. Null if never bought.
 */
function lastPurchaseLine(iso: string | null): string | null {
	if (!iso) return null;
	const otherYear = new Date(iso).getFullYear() !== new Date().getFullYear();
	const day = formatLongDate(iso, { year: otherYear });
	return day ? `Lo compraste el ${day}` : null;
}

/** "3x2", "70% en la 2da unidad": the chain's label reworded by the same rules
 * as every other promotion in the app, or as published when it cannot be read. */
function mechanicHeadline(m: Mechanic): string | null {
	const reading = pickProductPromo(readPromoLabels(m.promoLabels));
	if (!reading) return m.promoLabels[0] ?? null;
	const wording = describePromoLabel(reading);
	return wording.generic ? reading.label : wording.headline;
}

/**
 * Products followed from the scanner, bought or not, each with the promotions
 * it has right now at the chains the user shops at. The push that announces a
 * new one lands here.
 */
export function FollowedProductsScreen({
	session,
	focused,
	onBack,
	onScanProduct,
	onUnfollow,
	onSeePrices,
	activeTab,
	onSelectTab,
	onScanPress,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [products, setProducts] = useState<FollowedProduct[] | null>(null);
	const [promosChecked, setPromosChecked] = useState(true);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [unfollowing, setUnfollowing] = useState<string | null>(null);

	const load = useCallback(
		(mode: "initial" | "refresh") => {
			if (mode === "refresh") setRefreshing(true);
			else setLoading(true);
			getFollowedProducts(session.token)
				.then((data) => {
					// On promotion first: it is what the notification brought them here for.
					// The sort is stable, so each group keeps the backend's newest-first.
					setProducts([...data.items].sort((a, b) => Number(b.inPromo) - Number(a.inPromo)));
					setPromosChecked(data.promosChecked);
					setError(null);
				})
				// A failed refresh keeps the list it already had.
				.catch((err) => setError(friendlyAuthError(err)))
				.finally(() => {
					setLoading(false);
					setRefreshing(false);
				});
		},
		[session.token],
	);

	useEffect(() => {
		// With a list already on screen this is quiet: the skeleton only shows
		// while there is nothing, and a failure keeps what it had.
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount and on coming back
		if (focused) load("initial");
	}, [load, focused]);

	const unfollow = async (product: FollowedProduct) => {
		if (unfollowing) return;
		setUnfollowing(product.ean);
		try {
			if (await onUnfollow(product)) {
				setProducts((current) => current?.filter((p) => p.ean !== product.ean) ?? null);
			}
		} finally {
			setUnfollowing(null);
		}
	};

	const items = products ?? [];
	const inPromoCount = items.filter((p) => p.inPromo).length;
	const summary = !promosChecked
		? items.length === 1
			? "Seguís 1 producto"
			: `Seguís ${items.length} productos`
		: inPromoCount === 0
			? "Ninguno está en promo hoy"
			: inPromoCount === 1
				? "1 está en promo hoy"
				: `${inPromoCount} están en promo hoy`;

	const listHeader = (
		<View style={styles.listHeader}>
			<Text style={styles.summary} accessibilityRole="header">
				{summary}
			</Text>
			<Text style={styles.intro}>
				Revisamos las promos una vez por día y te avisamos cuando alguno de estos productos tenga una. Si elegiste tiendas
				favoritas, miramos solo esas.
			</Text>
			{/* The whole feature rests on a push: with them off, saying "te avisamos"
			    would be a promise nothing is going to keep. */}
			{!session.user.offersPushEnabled && (
				<InlineNotice
					variant="warning"
					icon="notifications-off-outline"
					live={false}
					message="Tenés apagadas las notificaciones de ofertas, así que por ahora no te vamos a avisar. Podés activarlas desde Perfil."
				/>
			)}
			{!promosChecked && (
				<InlineNotice
					variant="warning"
					message="No pudimos consultar las promos en este momento. Tus productos siguen guardados: deslizá hacia abajo para probar de nuevo."
				/>
			)}
			{error && <InlineNotice variant="error" message={error} />}
		</View>
	);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Productos que seguís" onBack={onBack} />

			{loading && products == null && (
				<View style={styles.skeletonList} accessibilityLabel="Cargando los productos que seguís" accessibilityLiveRegion="polite">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} style={styles.card}>
							<View style={[styles.skeletonLine, { width: "65%" }]} />
							<View style={[styles.skeletonLine, { width: "35%", height: 12 }]} />
							<View style={[styles.skeletonLine, { width: "90%", height: 28 }]} />
						</Skeleton>
					))}
				</View>
			)}

			{error && !loading && products == null && <ErrorBanner message={error} onRetry={() => load("initial")} />}

			{products != null && items.length === 0 && (
				<EmptyState
					icon="notifications-outline"
					title="Todavía no seguís ningún producto"
					hint="Escaneá el código de barras de un producto y tocá Seguir. Te avisamos cuando esté en promo, aunque nunca lo hayas comprado."
					action={{ label: "Escanear un producto", onPress: onScanProduct }}
				/>
			)}

			{items.length > 0 && (
				<FlatList
					data={items}
					keyExtractor={(p) => p.ean}
					contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxl, gap: space.smPlus }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.cyan} />}
					ListHeaderComponent={listHeader}
					renderItem={({ item }) => (
						<ProductCard
							product={item}
							promosChecked={promosChecked}
							busy={unfollowing === item.ean}
							disabled={unfollowing != null}
							onUnfollow={unfollow}
							onSeePrices={onSeePrices}
							colors={colors}
							styles={styles}
						/>
					)}
				/>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function ProductCard({
	product: p,
	promosChecked,
	busy,
	disabled,
	onUnfollow,
	onSeePrices,
	colors,
	styles,
}: {
	product: FollowedProduct;
	promosChecked: boolean;
	busy: boolean;
	disabled: boolean;
	onUnfollow: (product: FollowedProduct) => void;
	onSeePrices: (product: FollowedProduct) => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const uri = imageFailed ? null : catalogImageUri(p.imageUrl);
	const mechanics = p.promoMechanics.slice(0, MECHANICS_SHOWN);
	// The match is by brand and kind of product: a price that is really for
	// something else must not read as this product's.
	const loose = isLooseMatch(p.description, p.bestOffer?.productName);
	const bought = lastPurchaseLine(p.lastPurchasedAt);

	return (
		<View style={[styles.card, busy && styles.cardBusy]}>
			<View style={styles.cardTop}>
				<Image
					source={uri ? { uri } : PRODUCT_PLACEHOLDER}
					style={styles.thumb}
					resizeMode="contain"
					onError={() => setImageFailed(true)}
					accessible={false}
				/>
				<View style={styles.cardCopy}>
					<Text style={styles.name} numberOfLines={2}>
						{p.description}
					</Text>
					{p.brand && (
						<Text style={styles.brand} numberOfLines={1}>
							{p.brand}
						</Text>
					)}
					{bought && (
						<View style={styles.bought}>
							<Ionicons name="receipt-outline" size={12} color={colors.mutedText2} accessible={false} />
							<Text style={styles.boughtText} numberOfLines={1}>
								{bought}
							</Text>
						</View>
					)}
				</View>
				<Pressable
					style={(state) => [styles.iconButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
					onPress={() => onUnfollow(p)}
					disabled={disabled}
					accessibilityRole="button"
					accessibilityLabel={`Dejar de seguir ${p.description}`}
					accessibilityState={{ busy, disabled }}
				>
					<Ionicons name="notifications-off-outline" size={20} color={colors.mutedText2} accessible={false} />
				</Pressable>
			</View>

			{p.inPromo ? (
				<>
					<ProductOfferLine product={asOfferSubject(p)} loose={loose} />
					{mechanics.map((m, i) => {
						const headline = mechanicHeadline(m);
						const sameProduct = !isLooseMatch(p.description, m.productName);
						return (
							<View key={`${m.retailerName}-${i}`} style={styles.mechanic}>
								<View style={styles.mechanicChip}>
									<Ionicons name="pricetags" size={12} color={colors.warmChipText} accessible={false} />
									<Text style={styles.mechanicChipText} numberOfLines={2}>
										{headline ? `${headline} en ${m.retailerName}` : `Promo en ${m.retailerName}`}
									</Text>
								</View>
								{m.productName && (
									<Text style={[styles.detail, !sameProduct && styles.detailStrong]} numberOfLines={2}>
										{sameProduct ? "Promo de: " : "Promo de otro producto: "}
										{m.productName}
									</Text>
								)}
								{/* With one unit the price does not move: said with the number
								    beside it, as in "Productos recurrentes". */}
								{m.unitPrice != null && m.requiredQuantity != null && m.requiredQuantity > 1 && (
									<Text style={styles.detail}>
										Llevando 1 sola unidad pagás {formatCurrency(m.unitPrice)}
										{m.promoUnitPrice != null
											? `; llevando ${m.requiredQuantity}, ${formatCurrency(m.promoUnitPrice)} por unidad`
											: ""}
										.
									</Text>
								)}
							</View>
						);
					})}
				</>
			) : (
				promosChecked && <Text style={styles.noPromo}>Sin promo por ahora.</Text>
			)}

			<Pressable
				style={(state) => [styles.linkWrap, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
				onPress={() => onSeePrices(p)}
				accessibilityRole="button"
				accessibilityLabel={`Ver precios de ${p.description}`}
			>
				<Text style={styles.link}>Ver precios</Text>
			</Pressable>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		focusRing: focusRing(colors),
		pressed: { opacity: 0.7 },

		skeletonList: { padding: space.lg, gap: space.smPlus },
		skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: colors.softWarm },

		listHeader: { gap: space.sm, marginBottom: space.xs },
		summary: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.subtitle, lineHeight: lineHeights.subtitle },
		intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },

		card: { backgroundColor: colors.card, borderRadius: radii.md, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.divider },
		cardBusy: { opacity: 0.5 },
		cardTop: { flexDirection: "row", alignItems: "center", gap: space.smPlus },
		thumb: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.card },
		cardCopy: { flex: 1, gap: space.xs / 2 },
		name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label, lineHeight: lineHeights.label },
		brand: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		bought: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs / 2 },
		boughtText: { flexShrink: 1, color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		iconButton: { width: 44, height: 44, marginRight: -space.sm, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },

		mechanic: { gap: space.xs },
		// Warm, like every conditional promotion in the app: it needs more than one unit.
		mechanicChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.warmChip, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm },
		mechanicChipText: { flexShrink: 1, color: colors.warmChipText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		detail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		detailStrong: { color: colors.defaultText, fontFamily: typography.family.medium },
		noPromo: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption },

		linkWrap: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", borderRadius: radii.sm },
		link: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },
	});
}
