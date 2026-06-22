import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Ticket = {
	id: string; storeCode: string; storeColor: string; storeName: string;
	date: string; total: string; products: number; points: string;
};

const TICKETS: Ticket[] = [
	{ id: "t1", storeCode: "CO", storeColor: "#CC1A1A", storeName: "Coto — Av. Cabildo", date: "12 may · 18:42", total: "$9.970", products: 5, points: "+85 pts" },
	{ id: "t2", storeCode: "CA", storeColor: "#0059A6", storeName: "Carrefour — Maipú", date: "6 may · 11:08", total: "$12.450", products: 8, points: "+120 pts" },
	{ id: "t3", storeCode: "DI", storeColor: "#0D80CC", storeName: "Día — Av. Corrientes", date: "29 abr · 19:24", total: "$7.220", products: 4, points: "+72 pts" },
	{ id: "t4", storeCode: "JU", storeColor: "#008040", storeName: "Jumbo — Pueyrredón", date: "21 abr · 17:33", total: "$15.180", products: 11, points: "+150 pts" },
];

type Props = { onBack: () => void; onSelectTicket: (id: string) => void };

export function TicketHistoryScreen({ onBack, onSelectTicket }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Historial de tickets</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.summary}>
					<View style={{ flex: 1 }}>
						<Text style={styles.summaryLabel}>ESTE MES</Text>
						<Text style={styles.summaryValue}>$22.420</Text>
						<Text style={styles.summaryHint}>en 2 tickets</Text>
					</View>
					<View style={styles.summaryDivider} />
					<View style={{ flex: 1 }}>
						<Text style={styles.summaryLabel}>AHORRADO</Text>
						<Text style={[styles.summaryValue, { color: "#22C55E" }]}>$1.840</Text>
						<Text style={styles.summaryHint}>vs precio promedio</Text>
					</View>
				</View>

				{TICKETS.map((t) => (
					<Pressable key={t.id} style={styles.row} onPress={() => onSelectTicket(t.id)}>
						<View style={[styles.badge, { backgroundColor: t.storeColor }]}>
							<Text style={styles.badgeText}>{t.storeCode}</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.store}>{t.storeName}</Text>
							<Text style={styles.date}>{t.date} · {t.products} productos</Text>
						</View>
						<View style={{ alignItems: "flex-end" }}>
							<Text style={styles.total}>{t.total}</Text>
							<Text style={styles.points}>{t.points}</Text>
						</View>
					</Pressable>
				))}
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
	summary: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 14, padding: 16 },
	summaryDivider: { width: 1, height: 40, backgroundColor: "#E5E7EB", marginHorizontal: 12, alignSelf: "center" },
	summaryLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	summaryValue: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18, marginTop: 4 },
	summaryHint: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
	badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	badgeText: { color: "#fff", fontFamily: typography.family.bold, fontSize: 12 },
	store: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	date: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	total: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	points: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 11, marginTop: 2 },
});
