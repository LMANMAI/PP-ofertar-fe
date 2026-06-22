import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Prod = { id: string; name: string; freq: string; bestStore: string; price: string };

const PRODS: Prod[] = [
	{ id: "1", name: "Leche La Serenísima 1L", freq: "Cada 4 días", bestStore: "Día", price: "$1.420" },
	{ id: "2", name: "Pan Lactal Bimbo", freq: "Cada 7 días", bestStore: "Coto", price: "$1.850" },
	{ id: "3", name: "Yerba Playadito 1kg", freq: "Cada 14 días", bestStore: "Día", price: "$2.880" },
	{ id: "4", name: "Aceite Natura 1.5L", freq: "Cada 21 días", bestStore: "Día", price: "$2.010" },
	{ id: "5", name: "Detergente Magistral", freq: "Cada 30 días", bestStore: "Carrefour", price: "$1.380" },
];

type Props = { onBack: () => void };

export function RecurringProductsScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
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

			<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
				<Text style={styles.intro}>
					Detectamos {PRODS.length} productos que comprás seguido. Te avisamos cuando hay mejor precio.
				</Text>

				{PRODS.map((p) => (
					<View key={p.id} style={styles.card}>
						<View style={styles.cardHeader}>
							<Ionicons name="repeat-outline" size={18} color={colors.cyan} />
							<View style={{ flex: 1 }}>
								<Text style={styles.name}>{p.name}</Text>
								<Text style={styles.freq}>{p.freq}</Text>
							</View>
							<Pressable>
								<Ionicons name="notifications-outline" size={20} color="#9CA3A8" />
							</Pressable>
						</View>
						<View style={styles.bestRow}>
							<View style={styles.bestChip}>
								<Ionicons name="trophy" size={11} color="#fff" />
								<Text style={styles.bestText}>Mejor en {p.bestStore}</Text>
							</View>
							<Text style={styles.price}>{p.price}</Text>
						</View>
					</View>
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
	intro: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: "#E5E7EB" },
	cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	freq: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	bestChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#22C55E", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	bestText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 11 },
	price: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 15 },
});
