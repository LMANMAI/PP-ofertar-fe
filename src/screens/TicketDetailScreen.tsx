import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = { onBack: () => void };

const MOCK_PRODUCTS = [
	{ id: "1", name: "Aceite Natura 1.5L", qty: "1 u", price: "$2.450" },
	{ id: "2", name: "Leche La Serenísima 1L", qty: "2 u", price: "$1.960" },
	{ id: "3", name: "Pan Lactal Bimbo", qty: "1 u", price: "$1.850" },
	{ id: "4", name: "Yerba Playadito 1kg", qty: "1 u", price: "$3.200" },
	{ id: "5", name: "Detergente Magistral", qty: "1 u", price: "$1.490" },
];

export function TicketDetailScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
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

			<ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.summary}>
					<View style={styles.summaryHeader}>
						<View style={[styles.storeBadge, { backgroundColor: "#CC1A1A" }]}>
							<Text style={styles.storeBadgeText}>CO</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.storeName}>Coto — Av. Cabildo</Text>
							<Text style={styles.storeMeta}>12 may · 18:42</Text>
						</View>
					</View>
					<Text style={styles.totalLabel}>TOTAL</Text>
					<Text style={styles.totalValue}>$9.970,00</Text>
					<View style={styles.tagsRow}>
						<View style={styles.tag}><Text style={styles.tagText}>5 productos</Text></View>
						<View style={[styles.tag, { backgroundColor: colors.cyan }]}>
							<Text style={[styles.tagText, { color: colors.navy }]}>+85 pts</Text>
						</View>
					</View>
				</View>

				<View style={styles.savings}>
					<Ionicons name="trending-down-outline" size={18} color="#22C55E" />
					<View style={{ flex: 1 }}>
						<Text style={styles.savingsTitle}>Ahorraste $620 este ticket</Text>
						<Text style={styles.savingsHint}>vs precio promedio del mercado</Text>
					</View>
				</View>

				<Text style={styles.sectionLabel}>PRODUCTOS</Text>
				<View style={styles.products}>
					{MOCK_PRODUCTS.map((p, idx) => (
						<View key={p.id}>
							<View style={styles.productRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.productName}>{p.name}</Text>
									<Text style={styles.productMeta}>{p.qty}</Text>
								</View>
								<Text style={styles.productPrice}>{p.price}</Text>
							</View>
							{idx < MOCK_PRODUCTS.length - 1 && <View style={styles.divider} />}
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	summary: { backgroundColor: colors.navy, borderRadius: 16, padding: 16, gap: 6 },
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
	storeBadgeText: { color: "#fff", fontFamily: typography.family.bold, fontSize: 11 },
	storeName: { color: "#fff", fontFamily: typography.family.medium, fontSize: 13 },
	storeMeta: { color: "rgba(255,255,255,0.55)", fontFamily: typography.family.regular, fontSize: 11 },
	totalLabel: { color: "rgba(255,255,255,0.55)", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.3, marginTop: 6 },
	totalValue: { color: "#fff", fontFamily: typography.family.bold, fontSize: 26 },
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
	productMeta: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	productPrice: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	divider: { height: 1, backgroundColor: "#E5E7EB" },
});
