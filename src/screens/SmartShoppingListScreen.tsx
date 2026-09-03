import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { describeCampaignDiscount, getRecurringProducts } from "../services";
import type { RecurringProduct } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, EmptyState, ErrorBanner, LoadingState, ScreenHeader, type TabKey } from "../components";

/** Products bought on fewer separate trips than this are one-offs, not part of
 * the recurring shop — keeping them out avoids a list full of noise. */
const MIN_TRIPS_TO_BE_HABITUAL = 2;

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
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [products, setProducts] = useState<RecurringProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [checked, setChecked] = useState<Set<string>>(new Set());

	useEffect(() => {
		setLoading(true);
		getRecurringProducts(session.token)
			.then((all) => {
				setProducts(all.filter((p) => p.ticketCount >= MIN_TRIPS_TO_BE_HABITUAL));
				setError(null);
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : "Error al cargar la lista");
			})
			.finally(() => setLoading(false));
	}, [session.token]);

	const idOf = (p: RecurringProduct) => p.barcode || p.description;
	const toggle = (id: string) =>
		setChecked((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});

	// Anything already in the last ticket counts as bought; the rest is what's
	// still pending for this shop, minus whatever the user ticked off manually.
	const missing = products.filter((p) => !p.inReferenceTicket && !checked.has(idOf(p)));
	const bought = products.filter((p) => p.inReferenceTicket || checked.has(idOf(p)));
	// What you'd save buying the pending items at their current offer price,
	// not what you saved historically — those are different numbers.
	const potentialSavings = missing.reduce((acc, p) => {
		const offer = p.bestOffer;
		if (!offer || offer.listPrice == null) return acc;
		return acc + Math.max(0, offer.listPrice - offer.price);
	}, 0);

	const renderRow = (p: RecurringProduct, isLast: boolean, done: boolean) => {
		const id = idOf(p);
		return (
			<View key={id}>
				<Pressable style={styles.row} onPress={() => toggle(id)}>
					<View style={[styles.check, done && styles.checkOn]}>
						{done && <Ionicons name="checkmark" size={14} color="#fff" />}
					</View>
					<View style={{ flex: 1 }}>
						<Text style={[styles.name, done && styles.nameChecked]}>{p.description}</Text>
						<Text style={styles.meta}>En {p.ticketCount} de tus compras</Text>
						{/* The chip's price comes from a same-brand, same-type catalog
						    product that may be another size — naming it here stops the
						    discount from reading as a discount on this exact item. */}
						{!done && p.bestOffer?.productName && (
							<Text style={styles.offerFor} numberOfLines={1}>
								Oferta sobre: {p.bestOffer.productName}
							</Text>
						)}
					</View>
					{!done && p.bestOffer && (
						<View style={styles.offerChip}>
							<Ionicons name="pricetag" size={10} color="#fff" />
							<Text style={styles.offerChipText}>
								{p.bestOffer.discountPct != null
									? `${Math.round(p.bestOffer.discountPct)}% ${p.bestOffer.retailerName}`
									: p.bestOffer.retailerName}
							</Text>
						</View>
					)}
					{/* Same gap the home carousel had: a product whose only offer is a
					    campaign promotion showed no chip at all here. */}
					{!done && !p.bestOffer && p.campaignOffers.length > 0 && (
						<View style={styles.promoChip}>
							<Ionicons name="megaphone" size={10} color="#fff" />
							<Text style={styles.offerChipText} numberOfLines={1}>
								{describeCampaignDiscount(p.campaignOffers[0]) ?? "Promoción"}
							</Text>
						</View>
					)}
				</Pressable>
				{!isLast && <View style={styles.divider} />}
			</View>
		);
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Consumo inteligente" onBack={onBack} />

			{loading && <LoadingState />}

			{error && !loading && <ErrorBanner message={error} />}

			{!loading && !error && products.length === 0 && (
				<EmptyState
					icon="receipt-outline"
					title="Todavía no hay compra recurrente"
					hint="Escaneá al menos dos tickets para que detectemos qué comprás habitualmente"
				/>
			)}

			{!loading && !error && products.length > 0 && (
				<ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}>
					<View style={styles.heroCard}>
						<Ionicons name="bulb-outline" size={20} color={colors.cyan} />
						<View style={{ flex: 1 }}>
							<Text style={styles.heroTitle}>Tu compra habitual</Text>
							<Text style={styles.heroBody}>
								Basada en lo que más se repite en tus tickets. Lo que ya compraste en tu
								último ticket aparece tildado.
							</Text>
						</View>
					</View>

					{missing.length > 0 && (
						<>
							<Text style={styles.sectionLabel}>TE FALTA COMPRAR ({missing.length})</Text>
							<View style={styles.list}>
								{missing.map((p, idx) => renderRow(p, idx === missing.length - 1, false))}
							</View>
						</>
					)}

					{bought.length > 0 && (
						<>
							{/* Green here, not the neutral gray the "pending" label above
							    uses: this section is the payoff, not another to-do — the
							    color is the difference between "done" and "the rest of the
							    list, but grayed out". */}
							<View style={styles.sectionLabelDoneRow}>
								<Ionicons name="checkmark-circle" size={13} color={colors.successSoftText} />
								<Text style={styles.sectionLabelDone}>YA COMPRASTE ({bought.length})</Text>
							</View>
							<View style={styles.list}>
								{bought.map((p, idx) => renderRow(p, idx === bought.length - 1, true))}
							</View>
						</>
					)}
				</ScrollView>
			)}

			{!loading && !error && products.length > 0 && (
				<View style={styles.footer}>
					<View>
						<Text style={styles.footerLabel}>
							{missing.length > 0 ? "TE FALTAN" : "LISTA COMPLETA"}
						</Text>
						{/* The one moment this screen has to pay off "you finished your
						    shop" — everywhere else on the footer is neutral, this is the
						    single place that earns the accent color. */}
						<Text style={[styles.footerValue, missing.length === 0 && styles.footerValueDone]}>
							{missing.length > 0 ? `${missing.length} productos` : "¡Todo listo!"}
						</Text>
					</View>
					{potentialSavings > 0 && (
						// "Estimado" on purpose: this adds up list-vs-offer gaps across
						// products whose sizes we do not know are the ones the user buys,
						// so it is an order of magnitude, not a figure they will see at
						// the register.
						<View style={styles.savingsWrap}>
							<Text style={styles.footerLabel}>AHORRO ESTIMADO</Text>
							<Text style={styles.savingsValue}>{formatCurrency(potentialSavings)}</Text>
						</View>
					)}
				</View>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	heroCard: { flexDirection: "row", gap: 12, backgroundColor: colors.infoSoft, borderRadius: 14, padding: 16, alignItems: "center" },
	heroTitle: { color: colors.infoSoftText, fontFamily: typography.family.bold, fontSize: 14 },
	heroBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2, lineHeight: 16 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
	sectionLabelDoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
	sectionLabelDone: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	list: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
	check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
	// Green, not the brand cyan: cyan is this app's generic interactive/link
	// accent (focus rings, the scan button, "ver más" links) — completion is a
	// different meaning, and the app already has a color for it (savings,
	// discount badges). Reusing it here is what makes it read as "done" and
	// not just "selected".
	checkOn: { backgroundColor: colors.success, borderColor: colors.success },
	name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	nameChecked: { color: colors.mutedText2, textDecorationLine: "line-through" },
	meta: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	offerFor: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 10, lineHeight: 14, marginTop: 2 },
	promoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, maxWidth: 150 },
	offerChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
	offerChipText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 10 },
	divider: { height: 1, backgroundColor: colors.divider, marginLeft: 48 },
	footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	footerLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	footerValue: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 20, marginTop: 2 },
	footerValueDone: { color: colors.successSoftText },
	savingsWrap: { alignItems: "flex-end" },
	savingsValue: { color: colors.success, fontFamily: typography.family.bold, fontSize: 20, marginTop: 2 },
	});
}
