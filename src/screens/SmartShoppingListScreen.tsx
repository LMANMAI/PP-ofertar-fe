import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { getSavingsReport } from "../services";
import type { SavingsReportResponse } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, type TabKey } from "../components";

type Item = { id: string; name: string; suggested?: boolean; price: string; discount: number };

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${Math.round(value).toLocaleString("es-AR")}`;
}

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function SmartShoppingListScreen({ onBack, session, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [checked, setChecked] = useState<Set<string>>(new Set());

	useEffect(() => {
		setLoading(true);
		getSavingsReport(session.token)
			.then((report) => {
				const mapped = report.topProducts.map((p) => ({
					id: p.barcode || p.description,
					name: p.description,
					suggested: p.totalDiscounts > 0 || p.purchaseCount > 1,
					price: formatCurrency(p.totalDiscounts),
					discount: p.totalDiscounts,
				}));
				setItems(mapped);
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al cargar la lista");
			})
			.finally(() => setLoading(false));
	}, [session.token]);

	const toggle = (id: string) =>
		setChecked((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});

	const totalDiscount = items
		.filter((i) => !checked.has(i.id))
		.reduce((acc, i) => acc + i.discount, 0);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Lista inteligente</Text>
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

			{!loading && !error && items.length === 0 && (
				<View style={styles.emptyWrap}>
					<Ionicons name="receipt-outline" size={56} color={colors.border} />
					<Text style={styles.emptyTitle}>Sin productos aún</Text>
					<Text style={styles.emptyHint}>Escaneá tickets para generar tu lista inteligente</Text>
				</View>
			)}

			{!loading && !error && items.length > 0 && (
				<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}>
					<View style={styles.heroCard}>
						<Ionicons name="bulb-outline" size={20} color={colors.cyan} />
						<View style={{ flex: 1 }}>
							<Text style={styles.heroTitle}>Lista para tu próxima compra</Text>
							<Text style={styles.heroBody}>
								Generada según tus compras frecuentes y ofertas activas.
							</Text>
						</View>
					</View>

					<Text style={styles.sectionLabel}>PRODUCTOS FRECUENTES ({items.length})</Text>
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
													<Text style={styles.suggestedText}>Compra frecuente</Text>
												</View>
											)}
										</View>
										<Text style={[styles.price, isChecked && styles.priceChecked]}>
											Ahorro {i.price}
										</Text>
									</Pressable>
									{idx < items.length - 1 && <View style={styles.divider} />}
								</View>
							);
						})}
					</View>
				</ScrollView>
			)}

			{!loading && !error && items.length > 0 && (
				<View style={styles.footer}>
					<View>
						<Text style={styles.footerLabel}>AHORRO POTENCIAL</Text>
						<Text style={styles.footerValue}>{formatCurrency(totalDiscount)}</Text>
					</View>
					<Pressable style={styles.cta}>
						<Text style={styles.ctaText}>Ver dónde comprar</Text>
					</Pressable>
				</View>
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
	emptyHint: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
	heroCard: { flexDirection: "row", gap: 12, backgroundColor: "#E8F6FC", borderRadius: 14, padding: 16, alignItems: "center" },
	heroTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	heroBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2, lineHeight: 16 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	list: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
	check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#D8E1EE", alignItems: "center", justifyContent: "center" },
	checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	nameChecked: { color: colors.subtleText, textDecorationLine: "line-through" },
	suggestedChip: { alignSelf: "flex-start", backgroundColor: "#FFF7ED", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
	suggestedText: { color: "#B45A14", fontFamily: typography.family.medium, fontSize: 10 },
	price: { color: colors.success, fontFamily: typography.family.medium, fontSize: 12 },
	priceChecked: { color: colors.subtleText },
	divider: { height: 1, backgroundColor: colors.divider, marginLeft: 48 },
	footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	footerLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	footerValue: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, marginTop: 2 },
	cta: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
	ctaText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 14 },
});
