import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { getTickets } from "../services";
import type { TicketResponse } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, type TabKey } from "../components";

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString("es-AR", {
		day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
	});
}

function storeBadge(name: string | null): { code: string; color: string } {
	if (!name) return { code: "TI", color: "#5C6B84" };
	const words = name.split(" ");
	const code = words.map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
	const color = "#0D80CC";
	return { code, color };
}

type Props = {
	onBack: () => void;
	onSelectTicket: (id: number) => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function TicketHistoryScreen({ onBack, onSelectTicket, session, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [tickets, setTickets] = useState<TicketResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const loadTickets = async () => {
		try {
			const data = await getTickets(session.token);
			setTickets(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cargar tickets");
		}
	};

	useEffect(() => {
		setLoading(true);
		loadTickets().finally(() => setLoading(false));
	}, []);

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadTickets();
		setRefreshing(false);
	};

	const totalSpent = tickets.reduce((sum, t) => sum + (t.total ?? 0), 0);
	const totalSaved = tickets.reduce((sum, t) => sum + (t.totalDiscounts ?? 0), 0);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Historial de tickets</Text>
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

			{!loading && !error && tickets.length === 0 && (
				<View style={styles.emptyWrap}>
					<Ionicons name="receipt-outline" size={56} color={colors.border} />
					<Text style={styles.emptyTitle}>Sin tickets aún</Text>
					<Text style={styles.emptyHint}>Escaneá tu primer ticket y aparecerá acá</Text>
				</View>
			)}

			{!loading && tickets.length > 0 && (
				<FlatList
					data={tickets}
					keyExtractor={(t) => String(t.id)}
					contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
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
					renderItem={({ item: t }) => {
						const badge = storeBadge(t.storeName);
						const ticketTotal = t.total;
						const ticketSavings = t.totalDiscounts;
						return (
							<Pressable
								style={styles.row}
								onPress={() => onSelectTicket(t.id)}
								accessibilityRole="button"
								accessibilityLabel={`Ticket de ${t.storeName || "comercio sin nombre"}, ${formatCurrency(ticketTotal)}`}
							>
								<View style={[styles.badge, { backgroundColor: badge.color }]}>
									<Text style={styles.badgeText}>{badge.code}</Text>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.store}>{t.storeName || "Ticket sin nombre"}</Text>
									<Text style={styles.date}>
										{formatDate(t.createdAt)} · {t.items.length} productos
									</Text>
								</View>
								<View style={{ alignItems: "flex-end" }}>
									<Text style={styles.total}>{formatCurrency(ticketTotal)}</Text>
									<View style={styles.statusRow}>
										{ticketSavings != null && ticketSavings > 0 && (
											<Text style={styles.savings}>-{formatCurrency(ticketSavings)}</Text>
										)}
										<View style={[styles.statusBadge, t.status === "FAILED" ? styles.statusFailed : styles.statusOk]}>
											<Text style={[styles.statusText, t.status === "FAILED" && { color: "#E76F51" }]}>
												{t.status === "PROCESSED" ? "OK" : t.status === "FAILED" ? "Falló" : "Pendiente"}
											</Text>
										</View>
									</View>
								</View>
							</Pressable>
						);
					}}
				/>
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
	emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 60 },
	emptyTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18 },
	emptyHint: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 14 },
	summary: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: 16 },
	summaryDivider: { width: 1, height: 40, backgroundColor: colors.divider, marginHorizontal: 12, alignSelf: "center" },
	summaryLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	summaryValue: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18, marginTop: 4 },
	summaryHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
	badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	badgeText: { color: "#fff", fontFamily: typography.family.bold, fontSize: 12 },
	store: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	date: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	total: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
	savings: { color: colors.success, fontFamily: typography.family.medium, fontSize: 11 },
	statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
	statusOk: { backgroundColor: "#E0F5EF" },
	statusFailed: { backgroundColor: "rgba(231,111,81,0.15)" },
	statusText: { fontFamily: typography.family.medium, fontSize: 10, color: "#15803D" },
});
