import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { getRecurringProducts, getTicket } from "../services";
import type { RecurringProduct, TicketResponse } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, ForgottenProductsSheet, forgottenIn, type TabKey } from "../components";
import { hasBeenAnnounced, markAnnounced } from "../store/announcedTickets";

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0,00";
	return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// A whole number is units; a fraction only ever comes from a line the
// supermarket weighed, so it reads as kilos rather than "0,52 u".
function formatQuantity(value: number | null | undefined): string {
	if (value == null) return "1 u";
	if (Number.isInteger(value)) return `${value} u`;
	return `${value.toLocaleString("es-AR", { maximumFractionDigits: 3 })} kg`;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("es-AR", {
		day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
	});
}

type Props = {
	ticketId: number;
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function TicketDetailScreen({ ticketId, onBack, session, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [ticket, setTicket] = useState<TicketResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [forgotten, setForgotten] = useState<RecurringProduct[]>([]);
	const [forgottenVisible, setForgottenVisible] = useState(false);

	useEffect(() => {
		setLoading(true);
		getTicket(session.token, ticketId)
			.then(setTicket)
			.catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el ticket"))
			.finally(() => setLoading(false));
	}, [ticketId, session.token]);

	/**
	 * Backstop for the notice the history raises when processing finishes: that
	 * one only fires with the app open. If the user closed it while the OCR was
	 * running, this is where they find out — the first time they open the
	 * ticket, and only that time.
	 */
	useEffect(() => {
		if (!ticket || ticket.status !== "PROCESSED") return;
		let cancelled = false;

		(async () => {
			if (await hasBeenAnnounced(ticket.id)) return;
			try {
				const products = await getRecurringProducts(session.token, ticket.id);
				if (cancelled) return;
				const missing = forgottenIn(products);
				// Marked either way: the user opened the ticket and this is their
				// one chance to be told, so a ticket with nothing missing must not
				// come back asking later.
				await markAnnounced(ticket.id);
				if (missing.length > 0 && !cancelled) {
					setForgotten(missing);
					setForgottenVisible(true);
				}
			} catch {
				// Enrichment only: never block reading the ticket.
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [ticket, session.token]);

	const storeName = ticket?.storeName?.trim();
	const storeDisplay = storeName || "Ticket escaneado";
	const badge = storeName
		? storeName.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2)
		: "TI";

	const computedSavings = ticket
		? ticket.items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0)
		: 0;
	const discountedCount = ticket
		? ticket.items.filter((i) => (i.discountAmount ?? 0) > 0).length
		: 0;

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Detalle del ticket</Text>
			</View>

			{loading && (
				<View style={styles.loaderWrap}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			)}

			{error && (
				<View style={styles.errorBanner}>
					<Ionicons name="warning-outline" size={18} color="#E76F51" />
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{!loading && !error && ticket && (
				<ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
					{ticket.status === "FAILED" && (
						<View style={styles.failedBanner}>
							<Ionicons name="warning-outline" size={18} color="#E76F51" />
							<Text style={styles.failedBannerText}>No se pudo procesar este ticket</Text>
						</View>
					)}

					<View style={styles.summary}>
						<View style={styles.summaryHeader}>
							<View style={[styles.storeBadge, !storeName ? { backgroundColor: "#5C6B84" } : undefined]}>
								<Text style={styles.storeBadgeText}>{badge}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.storeName}>{storeDisplay}</Text>
								<Text style={styles.storeMeta}>{formatDate(ticket.createdAt)}</Text>
							</View>
						</View>
						<Text style={styles.totalLabel}>GASTO</Text>
						{ticket.subtotal != null && ticket.total != null && ticket.subtotal > ticket.total && (
							<Text style={styles.strikethroughSubtotal}>
								{formatCurrency(ticket.subtotal)}
							</Text>
						)}
						<Text style={styles.totalValue}>{formatCurrency(ticket.total)}</Text>
						<View style={styles.tagsRow}>
							<View style={styles.tag}><Text style={styles.tagText}>{ticket.items.length} productos</Text></View>
						{computedSavings > 0 && ticket.subtotal != null && ticket.subtotal > 0 && (
							<View style={[styles.tag, { backgroundColor: colors.cyan }]}>
								<Text style={[styles.tagText, { color: colors.navy }]}>
									{`${((computedSavings / ticket.subtotal) * 100).toFixed(1).replace(".", ",")}% ahorrado`}
								</Text>
							</View>
						)}
						</View>
					</View>

					{computedSavings > 0 && (
						<View style={styles.savings}>
							<Ionicons name="trending-down-outline" size={18} color="#22C55E" />
							<View style={{ flex: 1 }}>
								<Text style={styles.savingsTitle}>
									Ahorraste {formatCurrency(computedSavings)} este ticket
								</Text>
								<Text style={styles.savingsHint}>
									{discountedCount} de {ticket.items.length} productos con descuento
								</Text>
							</View>
						</View>
					)}

					<Text style={styles.sectionLabel}>PRODUCTOS</Text>
					<View style={styles.products}>
						{ticket.items.map((item, idx) => (
							<View key={item.id || idx}>
								<View style={styles.productRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.productName}>{item.description}</Text>
										<View style={styles.priceRow}>
											<Text style={styles.productMeta}>
												{formatQuantity(item.quantity)} · {formatCurrency(item.unitPrice)}
											</Text>
											{item.discountAmount != null && item.discountAmount > 0
												&& item.originalPrice != null && item.originalPrice > item.unitPrice && (
												<Text style={styles.originalPrice}>{formatCurrency(item.originalPrice / item.quantity)}</Text>
											)}
										</View>
									</View>
									<View style={{ alignItems: "flex-end" }}>
										<Text style={styles.productPrice}>{formatCurrency(item.subtotal)}</Text>
										{item.discountAmount != null && item.discountAmount > 0 && (
											<Text style={styles.discountText}>-{formatCurrency(item.discountAmount)}</Text>
										)}
									</View>
								</View>
								{idx < ticket.items.length - 1 && <View style={styles.divider} />}
							</View>
						))}
					</View>
				</ScrollView>
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

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
	errorText: { flex: 1, color: "#991B1B", fontFamily: typography.family.medium, fontSize: 13 },
	failedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12 },
	failedBannerText: { flex: 1, color: "#991B1B", fontFamily: typography.family.medium, fontSize: 13 },
	summary: { backgroundColor: colors.navy, borderRadius: 16, padding: 16, gap: 6 },
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E1352F", alignItems: "center", justifyContent: "center" },
	storeBadgeText: { color: "#fff", fontFamily: typography.family.bold, fontSize: 11 },
	storeName: { color: "#fff", fontFamily: typography.family.medium, fontSize: 13 },
	storeMeta: { color: "rgba(255,255,255,0.55)", fontFamily: typography.family.regular, fontSize: 11 },
	totalLabel: { color: "rgba(255,255,255,0.55)", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.3, marginTop: 6 },
	totalValue: { color: "#fff", fontFamily: typography.family.bold, fontSize: 24 },
	strikethroughSubtotal: {
		color: "rgba(255,255,255,0.5)",
		textDecorationLine: "line-through",
		fontFamily: typography.family.medium,
		fontSize: 14,
		marginTop: 4,
	},
	tagsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
	tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
	tagText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 11 },
	savings: { flexDirection: "row", gap: 10, backgroundColor: "#E0F5EF", padding: 14, borderRadius: 12, alignItems: "center" },
	savingsTitle: { color: "#15803D", fontFamily: typography.family.bold, fontSize: 13 },
	savingsHint: { color: "#15803D", fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	sectionLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	products: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
	productRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
	productName: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 2 },
	productMeta: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12 },
	originalPrice: { textDecorationLine: "line-through", color: "#9CA3A8", opacity: 0.6, fontFamily: typography.family.regular, fontSize: 12 },
	productPrice: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	discountText: { color: "#22C55E", fontFamily: typography.family.medium, fontSize: 11, marginTop: 2 },
	divider: { height: 1, backgroundColor: "#E5E7EB" },
});
