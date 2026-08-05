import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { getRecurringProducts } from "../services";
import type { RecurringProduct } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, type TabKey } from "../components";

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function formatFrequency(purchaseCount: number): string {
	return purchaseCount === 1 ? "Comprado 1 vez" : `Comprado ${purchaseCount} veces`;
}

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function RecurringProductsScreen({ onBack, session, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [products, setProducts] = useState<RecurringProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		getRecurringProducts(session.token)
			.then((data) => {
				setProducts(data);
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al cargar tus productos recurrentes");
			})
			.finally(() => setLoading(false));
	}, [session.token]);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
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
						Detectamos {products.length} productos que comprás seguido. Te avisamos cuando hay mejor precio.
					</Text>

					{products.map((p) => {
						const id = p.barcode || p.description;
						return (
							<View key={id} style={styles.card}>
								<View style={styles.cardHeader}>
									<Ionicons name="repeat-outline" size={18} color={colors.cyan} />
									<View style={{ flex: 1 }}>
										<Text style={styles.name}>{p.description}</Text>
										<Text style={styles.freq}>{formatFrequency(p.purchaseCount)}</Text>
									</View>
									<Pressable>
										<Ionicons name="notifications-outline" size={20} color="#9CA3A8" />
									</Pressable>
								</View>
								{p.bestOffer ? (
									<View style={styles.bestRow}>
										<View style={styles.bestChip}>
											<Ionicons name="trophy" size={11} color="#fff" />
											<Text style={styles.bestText}>Mejor en {p.bestOffer.retailerName}</Text>
										</View>
										<Text style={styles.price}>{formatCurrency(p.bestOffer.price)}</Text>
									</View>
								) : (
									<Text style={styles.noOffer}>Sin ofertas activas por ahora</Text>
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
	freq: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	bestChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#22C55E", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	bestText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 11 },
	price: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 15 },
	noOffer: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12 },
});
