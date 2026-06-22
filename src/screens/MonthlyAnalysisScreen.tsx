import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = { onBack: () => void };

const CATS = [
	{ name: "Almacén", pct: 38, amount: "$8.520", color: "#7DD4F5" },
	{ name: "Lácteos", pct: 24, amount: "$5.380", color: "#0D80CC" },
	{ name: "Limpieza", pct: 18, amount: "$4.020", color: "#22C55E" },
	{ name: "Bebidas", pct: 12, amount: "$2.690", color: "#F2B61D" },
	{ name: "Otros", pct: 8, amount: "$1.810", color: "#9CA3A8" },
];

export function MonthlyAnalysisScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Análisis mensual</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.heroCard}>
					<Text style={styles.heroLabel}>GASTO TOTAL · MAYO</Text>
					<Text style={styles.heroValue}>$22.420</Text>
					<View style={styles.heroDelta}>
						<Ionicons name="trending-down" size={12} color="#7DD4F5" />
						<Text style={styles.heroDeltaText}>-12% vs abril</Text>
					</View>
				</View>

				<Text style={styles.sectionLabel}>POR CATEGORÍA</Text>
				<View style={styles.catsCard}>
					{CATS.map((c, idx) => (
						<View key={c.name} style={[styles.catRow, idx === CATS.length - 1 && { borderBottomWidth: 0 }]}>
							<View style={[styles.catDot, { backgroundColor: c.color }]} />
							<View style={{ flex: 1 }}>
								<View style={styles.catHeader}>
									<Text style={styles.catName}>{c.name}</Text>
									<Text style={styles.catAmount}>{c.amount}</Text>
								</View>
								<View style={styles.catBarTrack}>
									<View style={[styles.catBarFill, { width: `${c.pct}%`, backgroundColor: c.color }]} />
								</View>
							</View>
							<Text style={styles.catPct}>{c.pct}%</Text>
						</View>
					))}
				</View>

				<View style={styles.savingsCard}>
					<View style={styles.savingsRow}>
						<Ionicons name="trending-up-outline" size={20} color="#22C55E" />
						<View style={{ flex: 1 }}>
							<Text style={styles.savingsTitle}>Ahorraste $3.180 este mes</Text>
							<Text style={styles.savingsHint}>Comparando con precios promedio</Text>
						</View>
					</View>
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
	heroCard: { backgroundColor: colors.navy, borderRadius: 16, padding: 20, gap: 8 },
	heroLabel: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	heroValue: { color: "#fff", fontFamily: typography.family.bold, fontSize: 34 },
	heroDelta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(125,212,245,0.15)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	heroDeltaText: { color: "#7DD4F5", fontFamily: typography.family.medium, fontSize: 12 },
	sectionLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	catsCard: { backgroundColor: colors.card, borderRadius: 14, padding: 6 },
	catRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
	catDot: { width: 10, height: 10, borderRadius: 5 },
	catHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	catName: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	catAmount: { color: "#6B7280", fontFamily: typography.family.medium, fontSize: 12 },
	catBarTrack: { height: 6, backgroundColor: "#F8F9FB", borderRadius: 3, overflow: "hidden" },
	catBarFill: { height: 6, borderRadius: 3 },
	catPct: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 13, width: 36, textAlign: "right" },
	savingsCard: { backgroundColor: "#E0F5EF", borderRadius: 14, padding: 16 },
	savingsRow: { flexDirection: "row", gap: 12, alignItems: "center" },
	savingsTitle: { color: "#15803D", fontFamily: typography.family.bold, fontSize: 14 },
	savingsHint: { color: "#15803D", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
});
