import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	LayoutAnimation,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { getRecurringProducts, sortByOfferRelevance } from "../services";
import type { RecurringProduct } from "../services";
import { friendlyAuthError } from "../services/authApi";
import type { Session } from "../auth/session";
import { BottomNav, EmptyState, ErrorBanner, ProductOfferLine, ScreenHeader, Skeleton, habitualProducts, offerSummary, type TabKey, SectionLabel } from "../components";
import { formatLongDate } from "../utils/format";
import { isLooseMatch } from "../utils/productMatch";

// The old architecture's bridge needs this opt-in per-platform; the New
// Architecture (Fabric) ignores it and LayoutAnimation just works.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Below this many tickets there is nothing to compare "the last one" against:
 * a product needs two trips to be habitual, so with two tickets every habitual
 * product is in both. */
const MIN_TICKETS_TO_JUDGE = 3;

type Item = {
	/** A barcode can repeat and a description can collide, so the position disambiguates. */
	id: string;
	product: RecurringProduct;
	/** The price on the card is probably for a different product. */
	loose: boolean;
	hasOffer: boolean;
};

function toItem(product: RecurringProduct, index: number): Item {
	return {
		id: `${product.barcode || product.description}#${index}`,
		product,
		loose: product.bestOffer != null && isLooseMatch(product.description, product.bestOffer.productName),
		hasOffer: product.bestOffer != null || product.campaignOffers.length > 0 || product.alternativeOffers.length > 0,
	};
}

/** "hoy", "ayer", "hace 12 días", "hace 3 meses". */
function since(iso: string | null): string | null {
	if (!iso) return null;
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return null;
	const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
	if (days === 0) return "hoy";
	if (days === 1) return "ayer";
	if (days < 60) return `hace ${days} días`;
	return `hace ${Math.round(days / 30)} meses`;
}

/** How often and how recently, in the words the rest of the app uses. The date
 * is when the receipt was scanned: the ticket carries no emission date. */
function habitLine(p: RecurringProduct): string {
	const tickets = p.ticketCount === 1 ? "1 ticket" : `${p.ticketCount} tickets`;
	const last = since(p.lastPaidAt);
	return last ? `En ${tickets} · última vez ${last}` : `En ${tickets}`;
}

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	/** The full offer detail of every product lives in "Productos recurrentes". */
	onOpenRecurring: () => void;
};

export function HabitualPurchaseScreen({ onBack, session, activeTab, onSelectTab, onScanPress, onOpenRecurring }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [all, setAll] = useState<RecurringProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showBought, setShowBought] = useState(false);
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

	const load = useCallback(
		(mode: "initial" | "refresh") => {
			if (mode === "refresh") setRefreshing(true);
			else setLoading(true);
			getRecurringProducts(session.token)
				.then((data) => {
					setAll(data);
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
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the session token changes
		load("initial");
	}, [load]);

	const { missing, bought, ticketsSeen, referenceIso } = useMemo(() => {
		const habitual = sortByOfferRelevance(habitualProducts(all)).map(toItem);
		return {
			missing: habitual.filter((i) => !i.product.inReferenceTicket),
			bought: habitual.filter((i) => i.product.inReferenceTicket),
			// The most tickets any product shows up in: a floor for how many there are.
			ticketsSeen: all.reduce((max, p) => Math.max(max, p.ticketCount), 0),
			// The latest scan among what the reference ticket contains.
			referenceIso: all
				.filter((p) => p.inReferenceTicket && p.lastPaidAt)
				.map((p) => p.lastPaidAt as string)
				.sort()
				.pop() ?? null,
		};
	}, [all]);

	const canJudge = ticketsSeen >= MIN_TICKETS_TO_JUDGE;
	const habitualCount = missing.length + bought.length;
	const boughtWithOffer = bought.filter((i) => i.hasOffer);
	const referenceDate = formatLongDate(referenceIso);

	const toggleBought = () => {
		if (!reduceMotion.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowBought((v) => !v);
	};

	const empty = !loading && !error && habitualCount === 0;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Tu compra habitual" onBack={onBack} />

			{loading && habitualCount === 0 && (
				<View style={styles.skeletonList} accessibilityLabel="Cargando tu compra habitual" accessibilityLiveRegion="polite">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} style={styles.card}>
							<View style={[styles.skeletonLine, { width: "65%" }]} />
							<View style={[styles.skeletonLine, { width: "40%", height: 12 }]} />
						</Skeleton>
					))}
				</View>
			)}

			{error && !loading && habitualCount === 0 && <ErrorBanner message={error} onRetry={() => load("initial")} />}

			{empty && (
				<EmptyState
					icon="receipt-outline"
					title="Todavía no detectamos tu compra habitual"
					hint="Con dos tickets reconocemos lo que comprás seguido. Con tres, te decimos qué te falta."
					action={{ label: "Escanear ticket", onPress: onScanPress }}
				/>
			)}

			{habitualCount > 0 && (
				<ScrollView
					contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xxl }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.cyan} />}
				>
					{error && <ErrorBanner message={error} onRetry={() => load("refresh")} />}

					{/* What "missing" is measured against, said out loud: without it the
					    list reads as an order, and after a small top-up shop it would
					    call everything else forgotten. */}
					<View style={{ gap: space.xs }}>
						<Text style={styles.intro}>
							{canJudge
								? `Lo comparamos con el último ticket que escaneaste${referenceDate ? ` (${referenceDate})` : ""}.`
								: "Con tres tickets o más te decimos qué productos habituales te faltan."}
						</Text>
						{canJudge && (
							<Text style={styles.introStrong}>
								{missing.length === 0
									? "Tu último ticket ya tenía todo lo habitual."
									: missing.length === 1
										? "1 de tus productos habituales no estaba."
										: `${missing.length} de tus ${habitualCount} productos habituales no estaban.`}
							</Text>
						)}
					</View>

					{canJudge && missing.length > 0 && (
						<>
							<SectionLabel style={styles.sectionLabel}>
								NO ESTABAN EN TU ÚLTIMO TICKET ({missing.length})
							</SectionLabel>
							{missing.map((item) => (
								<HabitualCard key={item.id} item={item} styles={styles} colors={colors} />
							))}
						</>
					)}

					{/* With nothing missing there is no list to act on, which is exactly
					    when the offers on what they buy are the useful thing to show. */}
					{canJudge && missing.length === 0 && boughtWithOffer.length > 0 && (
						<>
							<SectionLabel style={styles.sectionLabel}>
								CON OFERTA AHORA ({boughtWithOffer.length})
							</SectionLabel>
							{boughtWithOffer.map((item) => (
								<HabitualCard key={item.id} item={item} styles={styles} colors={colors} />
							))}
						</>
					)}

					{!canJudge &&
						[...missing, ...bought].map((item) => (
							<HabitualCard key={item.id} item={item} styles={styles} colors={colors} />
						))}

					{canJudge && bought.length > 0 && (
						<View style={{ gap: space.xs }}>
							<Pressable
								style={(state) => [styles.groupHeader, isFocused(state) && styles.focusRing]}
								onPress={toggleBought}
								accessibilityRole="button"
								accessibilityLabel={`Ya estaban en tu último ticket, ${bought.length} ${bought.length === 1 ? "producto" : "productos"}`}
								accessibilityState={{ expanded: showBought }}
								aria-expanded={showBought}
							>
								<Text style={styles.groupTitle}>Ya estaban en tu último ticket ({bought.length})</Text>
								<Ionicons name={showBought ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedText2} />
							</Pressable>
							{showBought &&
								bought.map(({ id, product: p }) => (
									<View key={id} style={styles.boughtRow}>
										<Text style={styles.name}>{p.description}</Text>
										<Text style={styles.meta}>{habitLine(p)}</Text>
									</View>
								))}
						</View>
					)}

					<Pressable
						style={(state) => [styles.link, isFocused(state) && styles.focusRing]}
						onPress={onOpenRecurring}
						accessibilityRole="button"
						accessibilityLabel="Ver las ofertas de todos tus productos recurrentes"
					>
						<Text style={styles.linkText}>Ver las ofertas de todos tus productos</Text>
						<Ionicons name="chevron-forward" size={16} color={colors.actionFill} />
					</Pressable>
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

/** One habitual product: what it is, how it fits the habit, and what is on offer
 * for it — through the same line "Productos recurrentes" uses. Read as a unit by
 * a screen reader, since the pieces mean nothing apart. */
const HabitualCard = memo(function HabitualCard({
	item,
	styles,
	colors,
}: {
	item: Item;
	styles: ReturnType<typeof createStyles>;
	colors: ColorTokens;
}) {
	const { product: p, loose } = item;
	return (
		<View style={styles.card} accessible accessibilityLabel={`${p.description}. ${habitLine(p)}. ${offerSummary(p, loose)}`}>
			<View style={{ gap: space.xs / 2 }}>
				<Text style={styles.name}>{p.description}</Text>
				<Text style={styles.meta}>{habitLine(p)}</Text>
			</View>
			<ProductOfferLine product={p} loose={loose} />
			{!p.bestOffer && p.campaignOffers.length === 0 && (
				<Text style={styles.noOffer}>
					{p.alternativeOffers.length > 0
						? "Sin oferta de esta marca, pero hay otra marca en oferta"
						: "Sin ofertas activas por ahora"}
				</Text>
			)}
		</View>
	);
});

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		focusRing: focusRing(colors),
		skeletonList: { padding: space.lg, gap: space.smPlus },
		skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: colors.softWarm },
		intro: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		introStrong: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		// Section label: the one place the design system spends letter-spacing.
		sectionLabel: { marginTop: space.xs },
		card: { backgroundColor: colors.card, borderRadius: radii.md, padding: space.mdPlus, gap: space.md, borderWidth: 1, borderColor: colors.divider },
		name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label, lineHeight: lineHeights.label },
		meta: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		noOffer: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro },
		groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
		groupTitle: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.caption },
		boughtRow: { gap: space.xs / 2, paddingVertical: space.smPlus, borderTopWidth: 1, borderTopColor: colors.divider },
		link: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 44, marginTop: space.sm },
		linkText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },
	});
}
