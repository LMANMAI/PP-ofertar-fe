import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useIsTablet, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { getRecurringProducts, getTickets, offerBadge } from "../services";
import { friendlyAuthError } from "../services/authApi";
import type { RecurringProduct, TicketResponse } from "../services";
import type { Session } from "../auth/session";
import {
	BottomNav,
	EmptyState,
	ErrorBanner,
	ForgottenProductsSheet,
	forgottenIn,
	ScreenHeader,
	Skeleton,
	type TabKey,
} from "../components";
import { hasBeenAnnounced, markAnnounced } from "../store/announcedTickets";
import { formatCurrency, formatTicketTimestamp } from "../utils/format";

/** Compares only what TicketRow actually renders — status, totals, item
 * count, store name — not a deep-equal of the full ticket (line items etc.),
 * which would cost more than the render it's meant to save. */
function ticketsAreEqual(a: TicketResponse, b: TicketResponse): boolean {
	return (
		a.status === b.status &&
		a.total === b.total &&
		a.totalDiscounts === b.totalDiscounts &&
		a.storeName === b.storeName &&
		a.items.length === b.items.length
	);
}

/** Polls every 5s while something is being read; stops after this many ticks
 * (3 minutes) so a ticket that never finishes does not poll forever. */
const MAX_POLLS = 36;

type ListItem =
	| { kind: "header"; key: string; label: string }
	| { kind: "ticket"; key: string; ticket: TicketResponse };

/** "septiembre de 2026", from the device's own calendar. */
function monthLabel(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "Sin fecha";
	const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Tickets arrive newest first; this only inserts a header where the month changes. */
function withMonthHeaders(tickets: TicketResponse[]): ListItem[] {
	const items: ListItem[] = [];
	let current = "";
	for (const t of tickets) {
		const label = monthLabel(t.createdAt);
		if (label !== current) {
			current = label;
			items.push({ kind: "header", key: `h:${label}`, label });
		}
		items.push({ kind: "ticket", key: `t:${t.id}`, ticket: t });
	}
	return items;
}

/** A dash for a money figure that does not exist yet, instead of "$0". */
function moneyOrDash(value: number | null | undefined): string {
	return value == null ? "—" : formatCurrency(value);
}

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

function ItemSeparator() {
	return <View style={{ height: space.smPlus }} />;
}

// The screen unmounts whenever the user leaves it, so every visit started from
// empty and flashed skeletons. The last list is shown at once and refreshed
// behind it.
let ticketsCache: { token: string; tickets: TicketResponse[] } | null = null;

function rememberTickets(token: string, tickets: TicketResponse[]) {
	ticketsCache = { token, tickets };
}

type Props = {
	onBack: () => void;
	onSelectTicket: (ticket: TicketResponse) => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	/** Tickets uploaded in this session that have not been announced yet. Held
	 * by App so it survives leaving this screen and coming back: the polling
	 * only runs while the history is mounted, so a ticket that finished while
	 * the user was elsewhere has to still be waiting when they return. */
	awaitingTicketIds: number[];
	onTicketAnnounced: (ticketId: number) => void;
};

export function TicketHistoryScreen({
	onSelectTicket,
	session,
	activeTab,
	onSelectTab,
	onScanPress,
	awaitingTicketIds,
	onTicketAnnounced,
}: Props) {
	const insets = useSafeAreaInsets();
	const isTablet = useIsTablet();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const cached = ticketsCache?.token === session.token ? ticketsCache : null;
	const [tickets, setTickets] = useState<TicketResponse[]>(cached?.tickets ?? []);
	const [forgotten, setForgotten] = useState<RecurringProduct[]>([]);
	const [forgottenVisible, setForgottenVisible] = useState(false);
	const [loading, setLoading] = useState(!cached);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const polls = useRef(0);
	const [pollsExhausted, setPollsExhausted] = useState(false);
	// Bumped by a manual refresh so the polling effect starts again after it gave up.
	const [pollEpoch, setPollEpoch] = useState(0);

	const loadTickets = async () => {
		try {
			const data = await getTickets(session.token);
			rememberTickets(session.token, data);
			// Keeps each unchanged ticket's object identity across a refetch —
			// the 5s poll below refetches the whole list on every tick, and
			// replacing every object wholesale would defeat TicketRow's memo
			// for every row, not just the one still processing.
			setTickets((current) => {
				const previousById = new Map(current.map((t) => [t.id, t]));
				return data.map((t) => {
					const previous = previousById.get(t.id);
					return previous && ticketsAreEqual(previous, t) ? previous : t;
				});
			});
			setError(null);
			await maybeAnnounceForgotten(data);
		} catch (err) {
			setError(friendlyAuthError(err));
		}
	};

	/**
	 * Raises the "did you forget something" sheet for a ticket that has just
	 * finished being read on the server.
	 *
	 * Driven by the uploaded-ticket list rather than by watching a PENDING row
	 * flip: the OCR can finish before the first refresh, and the user can walk
	 * away and come back, so there is no transition to catch reliably.
	 */
	const maybeAnnounceForgotten = async (all: TicketResponse[]) => {
		if (forgottenVisible || awaitingTicketIds.length === 0) return;

		// Newest first, as the endpoint returns them: only the most recent one
		// gets announced, so two tickets finishing together do not stack modals.
		const ready = all.find(
			(t) => awaitingTicketIds.includes(t.id) && t.status !== "PENDING",
		);
		if (!ready) return;

		// Claimed before the request so a refresh landing meanwhile cannot
		// announce the same ticket twice.
		onTicketAnnounced(ready.id);
		if (ready.status !== "PROCESSED") return;
		// Persisted too, so opening the ticket later does not repeat the notice.
		if (await hasBeenAnnounced(ready.id)) return;
		await markAnnounced(ready.id);

		try {
			const products = await getRecurringProducts(session.token, ready.id);
			const missing = forgottenIn(products);
			if (missing.length > 0) {
				setForgotten(missing);
				setForgottenVisible(true);
			}
		} catch {
			// An enrichment: never let it break the history listing.
		}
	};

	const reload = (silent = false) => {
		if (!silent) setLoading(true);
		loadTickets().finally(() => setLoading(false));
	};

	// The interval below outlives the render that created it, so it calls
	// through this ref: otherwise it kept the token, the awaiting ids and the
	// "sheet is open" flag of that first render.
	const loadRef = useRef(loadTickets);
	useEffect(() => {
		loadRef.current = loadTickets;
	});

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount
		reload(cached != null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const hasPending = tickets.some((t) => t.status === "PENDING");

	// While something is still being read on the server, refresh on a timer so
	// the row flips to "listo" on its own instead of making the user pull down.
	useEffect(() => {
		if (!hasPending) {
			polls.current = 0;
			return;
		}
		const id = setInterval(() => {
			polls.current += 1;
			if (polls.current >= MAX_POLLS) {
				clearInterval(id);
				setPollsExhausted(true);
				return;
			}
			loadRef.current();
		}, 5000);
		return () => clearInterval(id);
	}, [hasPending, pollEpoch]);

	const handleRefresh = async () => {
		setRefreshing(true);
		polls.current = 0;
		setPollsExhausted(false);
		setPollEpoch((e) => e + 1);
		await loadTickets();
		setRefreshing(false);
	};

	const totalSpent = tickets.reduce((sum, t) => sum + (t.total ?? 0), 0);
	const totalSaved = tickets.reduce((sum, t) => sum + (t.totalDiscounts ?? 0), 0);
	// Figures exist only for tickets already read: with none, "$0" would look
	// like data instead of "not yet".
	const readCount = tickets.filter((t) => t.status === "PROCESSED").length;
	const spentText = readCount > 0 ? formatCurrency(totalSpent) : "—";
	const savedText = readCount > 0 ? formatCurrency(totalSaved) : "—";
	const items = useMemo(() => withMonthHeaders(tickets), [tickets]);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Historial de tickets" logo />

			{loading && (
				<View style={styles.skeletonList} accessibilityLabel="Cargando tus tickets">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} style={styles.row}>
							<View style={styles.skeletonBadge} />
							<View style={styles.skeletonLines}>
								<View style={styles.skeletonLine} />
								<View style={[styles.skeletonLine, styles.skeletonLineShort]} />
							</View>
						</Skeleton>
					))}
				</View>
			)}

			{error && !loading && <ErrorBanner message={error} onRetry={() => reload()} />}

			{!loading && !error && tickets.length === 0 && (
				<EmptyState
					icon="receipt-outline"
					title="Todavía no escaneaste ningún ticket"
					hint="Cada ticket que escaneás mejora las ofertas que te mostramos."
					action={{ label: "Escanear mi primer ticket", onPress: onScanPress }}
				/>
			)}

			{!loading && tickets.length > 0 && (
				<FlatList
					data={items}
					keyExtractor={(i) => i.key}
					contentContainerStyle={[
						{ padding: space.lg, paddingBottom: insets.bottom + space.xxl },
						// Capped and centered on a tablet, the same as Inicio, instead of
						// a second column: the month headers need the full row.
						isTablet && styles.listTablet,
					]}
					ItemSeparatorComponent={ItemSeparator}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.actionFill} colors={[colors.actionFill]} />}
					ListHeaderComponent={
						<>
							<View
								style={styles.summary}
								accessible
								accessibilityLabel={`Todos tus tickets. Gastado ${spentText} en ${plural(readCount, "ticket leído", "tickets leídos")}. Descuentos ${savedText} que figuran en tus tickets`}
							>
								<Text style={styles.summaryOverline}>Todos tus tickets</Text>
								<View style={styles.summaryRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.summaryLabel}>Gastado</Text>
										<Text style={styles.summaryValue}>{spentText}</Text>
										<Text style={styles.summaryHint}>en {plural(readCount, "ticket leído", "tickets leídos")}</Text>
									</View>
									<View style={styles.summaryDivider} />
									<View style={{ flex: 1 }}>
										<Text style={styles.summaryLabel}>Descuentos</Text>
										<Text style={[styles.summaryValue, { color: colors.cyan }]}>{savedText}</Text>
										<Text style={styles.summaryHint}>que figuran en tus tickets</Text>
									</View>
								</View>
							</View>
							{pollsExhausted && (
								<Text style={styles.stalledNote}>
									Un ticket sigue en proceso. Deslizá hacia abajo para actualizar.
								</Text>
							)}
						</>
					}
					ListHeaderComponentStyle={{ marginBottom: space.smPlus, gap: space.smPlus }}
					renderItem={({ item }) =>
						item.kind === "header" ? (
							<Text style={styles.monthHeader} accessibilityRole="header">
								{item.label.toUpperCase()}
							</Text>
						) : (
							<TicketRow
								ticket={item.ticket}
								onSelectTicket={onSelectTicket}
								onScanPress={onScanPress}
								colors={colors}
								styles={styles}
							/>
						)
					}
					// A ticket still PENDING re-polls every 5s (see the effect above),
					// which replaces the whole `tickets` array — without memoizing the
					// row, every visible ticket re-renders on each poll, not just the
					// one still processing.
					removeClippedSubviews
					initialNumToRender={10}
					maxToRenderPerBatch={10}
					windowSize={9}
				/>
			)}

			<ForgottenProductsSheet
				products={forgotten}
				visible={forgottenVisible}
				onClose={() => setForgottenVisible(false)}
			/>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const TicketRow = memo(function TicketRow({
	ticket: t,
	onSelectTicket,
	onScanPress,
	colors,
	styles,
}: {
	ticket: TicketResponse;
	onSelectTicket: (ticket: TicketResponse) => void;
	onScanPress: () => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const badge = offerBadge(t.storeName);
	const isPending = t.status === "PENDING";
	const isFailed = t.status === "FAILED";
	// Null while the ticket is still being processed, and the backend also
	// leaves it null when nothing was discounted.
	const ticketSavings = t.totalDiscounts ?? 0;
	const name = t.storeName || (isPending ? "Leyendo tu ticket…" : "Ticket sin nombre");
	const when = formatTicketTimestamp(t.createdAt);

	// A store-less ticket has no initials to show; a neutral receipt icon says
	// "a ticket" instead of an empty colored dot.
	const badgeView = t.storeName ? (
		<View style={[styles.badge, { backgroundColor: badge.color }]}>
			<Text style={styles.badgeText}>{badge.badge}</Text>
		</View>
	) : (
		<View style={[styles.badge, styles.badgeNeutral]}>
			<Ionicons
				name={isFailed ? "alert-circle-outline" : "receipt-outline"}
				size={18}
				color={isFailed ? colors.dangerSoftText : colors.mutedText2}
			/>
		</View>
	);

	if (isFailed) {
		// Not openable: the detail screen has nothing to show for a ticket that
		// could not be read, so the row offers the one useful thing instead.
			return (
				<View style={[styles.row, styles.rowFailed]}>
					{badgeView}
					<View style={styles.rowBody}>
						{/* Only the text is grouped: a group that wrapped the button too would
						    hide it from screen readers. */}
						<View accessible accessibilityLabel={`${name}, ${when}. No pudimos leer este ticket`}>
							<Text style={styles.store}>{name}</Text>
							<Text style={styles.date}>{when}</Text>
							<View style={styles.failedLine}>
								<Ionicons name="alert-circle" size={14} color={colors.dangerSoftText} />
								<Text style={styles.failedText}>No pudimos leer este ticket</Text>
							</View>
						</View>
						<Pressable
							onPress={onScanPress}
							style={(state) => [styles.rescan, isFocused(state) && styles.focusRing]}
							accessibilityRole="button"
							accessibilityLabel="Escanear de nuevo"
						>
							<Ionicons name="camera-outline" size={16} color={colors.actionText} />
							<Text style={styles.rescanText}>Escanear de nuevo</Text>
						</Pressable>
					</View>
				</View>
			);
	}

	const spoken = isPending
		? `${name}. Se está leyendo. Podés seguir usando la app mientras tanto`
		: [
				name,
				when,
				plural(t.items.length, "producto", "productos"),
				`total ${moneyOrDash(t.total)}`,
				ticketSavings > 0 ? `descuento ${formatCurrency(ticketSavings)}` : null,
			]
				.filter(Boolean)
				.join(", ");

	return (
		<Pressable
			// A ticket still being read has no items or totals yet, so
			// opening it would show an empty screen.
			style={(state) => [styles.row, isFocused(state) && styles.focusRing]}
			onPress={() => !isPending && onSelectTicket(t)}
			disabled={isPending}
			accessibilityRole="button"
			accessibilityLabel={spoken}
			accessibilityState={{ disabled: isPending, busy: isPending }}
		>
			{badgeView}
			<View style={styles.rowBody}>
				<Text style={styles.store}>{name}</Text>
				<Text style={styles.date}>
					{isPending ? "Podés seguir usando la app mientras tanto" : when}
				</Text>
				{!isPending && (
					<Text style={styles.date}>{plural(t.items.length, "producto", "productos")}</Text>
				)}
			</View>
			<View style={{ alignItems: "flex-end" }}>
				{isPending ? (
					<View style={styles.pendingChip}>
						<ActivityIndicator size="small" color={colors.warningSoftText} />
						<Text style={styles.pendingText}>Procesando</Text>
					</View>
				) : (
					<>
						<Text style={styles.total}>{moneyOrDash(t.total)}</Text>
						{ticketSavings > 0 && (
							<Text style={styles.savings}>-{formatCurrency(ticketSavings)}</Text>
						)}
					</>
				)}
			</View>
			{!isPending && <Ionicons name="chevron-forward" size={16} color={colors.subtleText} />}
		</Pressable>
	);
});

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	listTablet: { width: "100%", maxWidth: 640, alignSelf: "center" },
	// The one navy block of the screen, like Inicio's savings card, so the
	// figures do not sink into the same near-black as the rows in dark mode.
	// Navy on the dark page is ~1.1:1, so the edge is drawn.
	summary: { backgroundColor: colors.navy, borderRadius: radii.xl, padding: space.xl, gap: space.md, borderWidth: 1, borderColor: colors.navyHairline },
	summaryOverline: { color: colors.navyMutedText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	summaryRow: { flexDirection: "row" },
	summaryDivider: { width: 1, height: 48, backgroundColor: colors.navyHairline, marginHorizontal: space.lg, alignSelf: "center" },
	summaryLabel: { color: colors.navyMutedText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	summaryValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: typography.sizes.h2, lineHeight: typography.lineHeights.h2, marginTop: space.xs },
	summaryHint: { color: colors.navyMutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption, marginTop: 2 },
	stalledNote: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	monthHeader: { color: colors.mutedText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro, letterSpacing: 1.4, marginTop: space.sm },
	row: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.card, padding: space.mdPlus, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider },
	rowFailed: { borderColor: colors.dangerSoftText },
	rowBody: { flex: 1 },
	badge: { width: 36, height: 36, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
	badgeNeutral: { backgroundColor: colors.softWarm },
	badgeText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: typography.sizes.micro },
	store: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.label },
	date: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, marginTop: 2 },
	total: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.label },
	// successSoftText, not the bright success green: that one is ~2.3:1 on the
	// light card. The minus sign still carries the meaning without the color.
	savings: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, marginTop: 2 },
	pendingChip: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, backgroundColor: colors.warningSoft, borderRadius: radii.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
	pendingText: { color: colors.warningSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	failedLine: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs },
	failedText: { color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	rescan: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, minHeight: 44, alignSelf: "flex-start", marginTop: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, backgroundColor: colors.actionFill },
	rescanText: { color: colors.actionText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	focusRing: focusRing(colors),
	skeletonList: { padding: space.lg, gap: space.smPlus },
	skeletonBadge: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.softWarm },
	skeletonLines: { flex: 1, gap: space.sm },
	skeletonLine: { height: 12, borderRadius: radii.sm, backgroundColor: colors.softWarm },
	skeletonLineShort: { width: "55%" },
	});
}
