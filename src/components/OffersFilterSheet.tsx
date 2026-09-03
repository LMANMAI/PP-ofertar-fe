import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Offer } from "../services";

export type OffersFilterSection = "retailers" | "categories";

export type OffersFilterState = {
	retailerSlugs: Set<string>;
	categories: Set<string>;
};

type Retailer = { slug: string; name: string };

type Props = {
	visible: boolean;
	onClose: () => void;
	/** Which pill opened the sheet — each one edits only its own dimension. */
	section: OffersFilterSection;
	/** The offers left after any filter outside this sheet (e.g. "Cerca
	 * tuyo") already applied, so the live preview count stays honest about
	 * what "Aplicar" will actually show. */
	offers: Offer[];
	retailers: Retailer[];
	categories: string[];
	value: OffersFilterState;
	onApply: (next: OffersFilterState) => void;
};

function matches(o: Offer, draft: OffersFilterState): boolean {
	if (draft.retailerSlugs.size > 0 && (!o.retailerSlug || !draft.retailerSlugs.has(o.retailerSlug))) {
		return false;
	}
	if (draft.categories.size > 0 && (!o.category || !draft.categories.has(o.category))) {
		return false;
	}
	return true;
}

export function OffersFilterSheet({
	visible,
	onClose,
	section,
	offers,
	retailers,
	categories,
	value,
	onApply,
}: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [draft, setDraft] = useState<OffersFilterState>(value);

	// Copies the applied filters into a local draft each time the sheet opens,
	// so toggling checkboxes previews the result count without touching the
	// list underneath until "Aplicar" — and closing without applying discards
	// the draft instead of leaving the list half-filtered.
	useEffect(() => {
		if (visible) setDraft(value);
	}, [visible, value]);

	const previewCount = useMemo(
		() => offers.filter((o) => matches(o, draft)).length,
		[offers, draft],
	);

	const activeCount = section === "retailers" ? draft.retailerSlugs.size : draft.categories.size;

	const toggleRetailer = (slug: string) => {
		setDraft((d) => {
			const next = new Set(d.retailerSlugs);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return { ...d, retailerSlugs: next };
		});
	};

	const toggleCategory = (c: string) => {
		setDraft((d) => {
			const next = new Set(d.categories);
			if (next.has(c)) next.delete(c);
			else next.add(c);
			return { ...d, categories: next };
		});
	};

	const items = section === "retailers" ? retailers.map((r) => ({ key: r.slug, label: r.name })) : categories.map((c) => ({ key: c, label: c }));
	const isOn = (key: string) => (section === "retailers" ? draft.retailerSlugs.has(key) : draft.categories.has(key));
	const toggle = section === "retailers" ? toggleRetailer : toggleCategory;
	const emptyHint =
		section === "retailers"
			? "No hay supermercados distintos en tus ofertas todavía."
			: "No hay categorías identificadas en tus ofertas todavía.";

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<Pressable onPress={onClose} hitSlop={8}>
							<Text style={styles.cancel}>Cerrar</Text>
						</Pressable>
						<Text style={styles.title}>
							{section === "retailers" ? "Supermercados" : "Categorías"}
						</Text>
						<Pressable
							onPress={() =>
								setDraft((d) =>
									section === "retailers"
										? { ...d, retailerSlugs: new Set() }
										: { ...d, categories: new Set() },
								)
							}
							hitSlop={8}
							disabled={activeCount === 0}
						>
							<Text style={[styles.clear, activeCount === 0 && styles.clearDisabled]}>
								Limpiar
							</Text>
						</Pressable>
					</View>

					<ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
						{items.length === 0 ? (
							<Text style={styles.emptyHint}>{emptyHint}</Text>
						) : (
							<View style={styles.list}>
								{items.map((item, idx) => {
									const on = isOn(item.key);
									return (
										<View key={item.key}>
											<Pressable style={styles.listRow} onPress={() => toggle(item.key)}>
												<Text style={styles.listLabel}>{item.label}</Text>
												<View style={[styles.check, on && styles.checkOn]}>
													{on && <Ionicons name="checkmark" size={13} color={colors.navy} />}
												</View>
											</Pressable>
											{idx < items.length - 1 && <View style={styles.listDivider} />}
										</View>
									);
								})}
							</View>
						)}
					</ScrollView>

					<Pressable style={styles.applyButton} onPress={() => onApply(draft)}>
						<Text style={styles.applyText}>
							{previewCount === offers.length
								? `Ver ${previewCount} ofertas`
								: `Ver ${previewCount} de ${offers.length} ofertas`}
						</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: space.xl,
		paddingTop: space.mdPlus,
		paddingBottom: 28,
		maxHeight: "82%",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: space.mdPlus,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	cancel: { color: colors.mutedText, fontFamily: typography.family.medium, fontSize: 14 },
	title: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 16 },
	clear: { color: colors.orange, fontFamily: typography.family.bold, fontSize: 14 },
	clearDisabled: { color: colors.subtleText },
	body: { paddingTop: space.smPlus },
	emptyHint: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
		paddingVertical: space.sm,
	},
	list: {
		backgroundColor: colors.background,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.divider,
		overflow: "hidden",
	},
	listRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: space.mdPlus,
		paddingVertical: 13,
	},
	listLabel: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	listDivider: { height: 1, backgroundColor: colors.divider, marginLeft: space.mdPlus },
	check: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 1.5,
		borderColor: colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	applyButton: {
		marginTop: space.mdPlus,
		backgroundColor: colors.navy,
		height: 50,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	applyText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 15 },
	});
}
