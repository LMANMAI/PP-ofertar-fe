import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Item = { id: string; name: string; suggested?: boolean; price: string };

const INITIAL: Item[] = [
	{ id: "1", name: "Leche 1L", price: "$1.420" },
	{ id: "2", name: "Pan lactal", price: "$1.850" },
	{ id: "3", name: "Yerba 1kg", price: "$2.880" },
	{ id: "4", name: "Aceite 1.5L", suggested: true, price: "$2.010" },
	{ id: "5", name: "Detergente", suggested: true, price: "$1.380" },
];

type Props = { onBack: () => void };

export function SmartShoppingListScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
	const [items, setItems] = useState(INITIAL);
	const [checked, setChecked] = useState<Set<string>>(new Set());

	const toggle = (id: string) =>
		setChecked((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});

	const total = items
		.filter((i) => !checked.has(i.id))
		.reduce((acc, i) => acc + Number(i.price.replace(/[^0-9]/g, "")) / 100, 0);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Lista inteligente</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 100 }}>
				<View style={styles.heroCard}>
					<Ionicons name="bulb-outline" size={20} color={colors.cyan} />
					<View style={{ flex: 1 }}>
						<Text style={styles.heroTitle}>Lista para tu próxima compra</Text>
						<Text style={styles.heroBody}>
							Generada según tus compras frecuentes y ofertas activas.
						</Text>
					</View>
				</View>

				<Text style={styles.sectionLabel}>ITEMS ({items.length})</Text>
				<View style={styles.list}>
					{items.map((i, idx) => {
						const isChecked = checked.has(i.id);
						return (
							<View key={i.id}>
								<Pressable style={styles.row} onPress={() => toggle(i.id)}>
									<View style={[styles.check, isChecked && styles.checkOn]}>
										{isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
									</View>
									<View style={{ flex: 1 }}>
										<Text style={[styles.name, isChecked && styles.nameChecked]}>
											{i.name}
										</Text>
										{i.suggested && !isChecked && (
											<View style={styles.suggestedChip}>
												<Text style={styles.suggestedText}>Sugerido</Text>
											</View>
										)}
									</View>
									<Text style={[styles.price, isChecked && styles.priceChecked]}>{i.price}</Text>
								</Pressable>
								{idx < items.length - 1 && <View style={styles.divider} />}
							</View>
						);
					})}
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
				<View>
					<Text style={styles.footerLabel}>TOTAL ESTIMADO</Text>
					<Text style={styles.footerValue}>${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</Text>
				</View>
				<Pressable style={styles.cta}>
					<Text style={styles.ctaText}>Ver dónde comprar</Text>
				</Pressable>
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
	heroCard: { flexDirection: "row", gap: 12, backgroundColor: "#E8F6FC", borderRadius: 14, padding: 16, alignItems: "center" },
	heroTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	heroBody: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2, lineHeight: 16 },
	sectionLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	list: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
	check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#D8E1EE", alignItems: "center", justifyContent: "center" },
	checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	nameChecked: { color: "#9CA3A8", textDecorationLine: "line-through" },
	suggestedChip: { alignSelf: "flex-start", backgroundColor: "#FFF7ED", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
	suggestedText: { color: "#B45A14", fontFamily: typography.family.medium, fontSize: 10 },
	price: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	priceChecked: { color: "#9CA3A8" },
	divider: { height: 1, backgroundColor: "#E5E7EB", marginLeft: 48 },
	footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	footerLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	footerValue: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, marginTop: 2 },
	cta: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
	ctaText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 14 },
});
