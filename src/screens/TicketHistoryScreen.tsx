import { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, typography, useIsTablet, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { getRecurringProducts, getTickets, offerBadge } from "../services";
import type { RecurringProduct, TicketResponse } from "../services";
import type { Session } from "../auth/session";
import {
	BottomNav,
	EmptyState,
	ErrorBanner,
	ForgottenProductsSheet,
	forgottenIn,
	LoadingState,
	ScreenHeader,
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
	onBack,
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
	const [tickets, setTickets] = useState<TicketResponse[]>([]);
	const [forgotten, setForgotten] = useState<RecurringProduct[]>([]);
	const [forgottenVisible, setForgottenVisible] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const loadTickets = async () => {
		try {
			const data = await getTickets(session.token);
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
			setError(err instanceof Error ? err.message : "Error al cargar tickets");
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

	useEffect(() => {
		setLoading(true);
		loadTickets().finally(() => setLoading(false));
	}, []);

	const hasPending = tickets.some((t) => t.status === "PENDING");

	// While something is still being read on the server, refresh on a timer so
	// the row flips to "listo" on its own instead of making the user pull down.
	useEffect(() => {
		if (!hasPending) return;
		const id = setInterval(loadTickets, 5000);
		return () => clearInterval(id);
	}, [hasPending]);

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadTickets();
		setRefreshing(false);
	};

	const totalSpent = tickets.reduce((sum, t) => sum + (t.total ?? 0), 0);
	const totalSaved = tickets.reduce((sum, t) => sum + (t.totalDiscounts ?? 0), 0);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Historial de tickets" onBack={onBack} />

			{loading && <LoadingState />}

			{error && !loading && <ErrorBanner message={error} />}

			{!loading && !error && tickets.length === 0 && (
				<EmptyState
					icon="receipt-outline"
					title="Sin tickets aún"
					hint="Escaneá tu primer ticket y aparecerá acá"
				/>
			)}

			{!loading && tickets.length > 0 && (
				<FlatList
					// Same restructure as OffersScreen: two columns once the viewport
					// is tablet-wide, instead of one column stretched edge to edge.
					key={isTablet ? "grid" : "list"}
					numColumns={isTablet ? 2 : 1}
					columnWrapperStyle={isTablet ? { gap: 10 } : undefined}
					data={tickets}
					keyExtractor={(t) => String(t.id)}
					contentContainerStyle={{ padding: space.lg, gap: 10, paddingBottom: insets.bottom + 24 }}
					ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.cyan} />}
					ListHeaderComponent={
						<View style={styles.summary}>
							<View style={{ flex: 1 }}>
								<Text style={styles.summaryLabel}>GASTADO</Text>
								<Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
								<Text style={styles.summaryHint}>en {tickets.length} tickets</Text>
							</View>
							<View style={styles.summaryDivider} />
							<View style={{ flex: 1 }}>
								<Text style={styles.summaryLabel}>AHORRADO</Text>
								<Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totalSaved)}</Text>
								<Text style={styles.summaryHint}>descuentos</Text>
							</View>
						</View>
					}
					ListHeaderComponentStyle={{ marginBottom: 10 }}
					renderItem={({ item: t }) => (
						<TicketRow
							ticket={t}
							isTablet={isTablet}
							onSelectTicket={onSelectTicket}
							colors={colors}
							styles={styles}
						/>
					)}
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
	isTablet,
	onSelectTicket,
	colors,
	styles,
}: {
	ticket: TicketResponse;
	isTablet: boolean;
	onSelectTicket: (ticket: TicketResponse) => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	const badge = offerBadge(t.storeName);
	const ticketTotal = t.total;
	// Null while the ticket is still being processed, and the
	// backend also leaves it null when nothing was discounted.
	const ticketSavings = t.totalDiscounts ?? 0;
	const isPending = t.status === "PENDING";
	return (
		<Pressable
			// A ticket still being read has no items or totals yet, so
			// opening it would show an empty screen.
			style={[styles.row, isPending && styles.rowPending, isTablet && { flex: 1 }]}
			onPress={() => !isPending && onSelectTicket(t)}
			disabled={isPending}
			accessibilityRole="button"
			accessibilityLabel={`Ticket de ${t.storeName || "comercio sin nombre"}, ${formatCurrency(ticketTotal)}`}
		>
			<View style={[styles.badge, { backgroundColor: badge.color }]}>
				<Text style={styles.badgeText}>{badge.badge}</Text>
			</View>
			<View style={{ flex: 1 }}>
				<Text style={styles.store}>
					{t.storeName || (isPending ? "Leyendo tu ticket…" : "Ticket sin nombre")}
				</Text>
				<Text style={styles.date}>
					{isPending
						? "Podés seguir usando la app mientras tanto"
						: `${formatTicketTimestamp(t.createdAt)} · ${t.items.length} productos`}
				</Text>
			</View>
			<View style={{ alignItems: "flex-end" }}>
				{isPending ? (
					<ActivityIndicator size="small" color={colors.cyan} />
				) : (
					<Text style={styles.total}>{formatCurrency(ticketTotal)}</Text>
				)}
				<View style={styles.statusRow}>
					{!isPending && ticketSavings != null && ticketSavings > 0 && (
						<Text style={styles.savings}>-{formatCurrency(ticketSavings)}</Text>
					)}
					<View
						style={[
							styles.statusBadge,
							t.status === "FAILED"
								? styles.statusFailed
								: isPending
									? styles.statusPending
									: styles.statusOk,
						]}
					>
						<Text
							style={[
								styles.statusText,
								t.status === "FAILED" && { color: colors.orange },
								isPending && { color: colors.warningSoftText },
							]}
						>
							{t.status === "PROCESSED" ? "OK" : t.status === "FAILED" ? "Falló" : "Procesando"}
						</Text>
					</View>
				</View>
			</View>
		</Pressable>
	);
});

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	summary: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: space.lg },
	summaryDivider: { width: 1, height: 40, backgroundColor: colors.divider, marginHorizontal: space.md, alignSelf: "center" },
	summaryLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	summaryValue: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 18, marginTop: space.xs },
	summaryHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	row: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
	badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	badgeText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 12 },
	store: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	date: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	total: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 14 },
	statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
	savings: { color: colors.success, fontFamily: typography.family.medium, fontSize: 11 },
	statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
	statusOk: { backgroundColor: colors.successSoft },
	statusFailed: { backgroundColor: colors.dangerSoft },
	statusPending: { backgroundColor: colors.warningSoft },
	rowPending: { opacity: 0.75 },
	statusText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.successSoftText },
	});
}
