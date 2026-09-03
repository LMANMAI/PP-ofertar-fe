import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Offer } from "../services";

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20];

export type OffersFilterSection = "retailers" | "categories" | "nearby" | "all";

export type OffersFilterState = {
	retailerSlugs: Set<string>;
	categories: Set<string>;
	nearbyOnly: boolean;
	nearbyRadiusKm: number;
};

type Retailer = { slug: string; name: string };

type Props = {
	visible: boolean;
	onClose: () => void;
	/** Which section a quick-access pill opened the sheet on — "all" is the
	 * "Filtros avanzados" entry point and shows every section at once. */
	section: OffersFilterSection;
	offers: Offer[];
	retailers: Retailer[];
	categories: string[];
	value: OffersFilterState;
	onApply: (next: OffersFilterState) => void;
	nearbyLoading: boolean;
	nearbyError: string | null;
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
	nearbyLoading,
	nearbyError,
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

	const activeCount =
		draft.retailerSlugs.size + draft.categories.size + (draft.nearbyOnly ? 1 : 0);

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

	const showNearby = section === "all" || section === "nearby";
	const showRetailers = section === "all" || section === "retailers";
	const showCategories = section === "all" || section === "categories";

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.sheet}>
					<View style={styles.header}>
						<Pressable onPress={onClose} hitSlop={8}>
							<Text style={styles.cancel}>Cerrar</Text>
						</Pressable>
						<Text style={styles.title}>
							{section === "all" ? "Filtros avanzados" : "Filtrar"}
						</Text>
						<Pressable
							onPress={() =>
								setDraft({
									retailerSlugs: new Set(),
									categories: new Set(),
									nearbyOnly: false,
									nearbyRadiusKm: draft.nearbyRadiusKm,
								})
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
						{showNearby && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>SUCURSALES CERCANAS</Text>
								<Pressable
									style={[styles.nearbyRow, draft.nearbyOnly && styles.nearbyRowOn]}
									onPress={() => setDraft((d) => ({ ...d, nearbyOnly: !d.nearbyOnly }))}
								>
									<Ionicons
										name="navigate"
										size={16}
										color={draft.nearbyOnly ? colors.buttonText : colors.cyan}
									/>
									<Text style={[styles.nearbyText, draft.nearbyOnly && styles.nearbyTextOn]}>
										Solo ofertas con sucursal cerca tuyo
									</Text>
									<View style={[styles.check, draft.nearbyOnly && styles.checkOn]}>
										{draft.nearbyOnly && <Ionicons name="checkmark" size={13} color={colors.navy} />}
									</View>
								</Pressable>

								{draft.nearbyOnly && (
									<View style={styles.radiusRow}>
										{RADIUS_OPTIONS.map((km) => {
											const active = draft.nearbyRadiusKm === km;
											return (
												<Pressable
													key={km}
													style={[styles.radiusChip, active && styles.radiusChipOn]}
													onPress={() => setDraft((d) => ({ ...d, nearbyRadiusKm: km }))}
												>
													<Text style={[styles.radiusText, active && styles.radiusTextOn]}>
														{km} km
													</Text>
												</Pressable>
											);
										})}
									</View>
								)}

								{draft.nearbyOnly && nearbyLoading && (
									<Text style={styles.nearbyHint}>Buscando sucursales cerca tuyo…</Text>
								)}
								{draft.nearbyOnly && nearbyError && !nearbyLoading && (
									<Text style={styles.nearbyError}>{nearbyError}</Text>
								)}
							</View>
						)}

						{showRetailers && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>SUPERMERCADOS</Text>
								{retailers.length === 0 ? (
									<Text style={styles.emptyHint}>
										No hay supermercados distintos en tus ofertas todavía.
									</Text>
								) : (
									<View style={styles.list}>
										{retailers.map((r, idx) => {
											const on = draft.retailerSlugs.has(r.slug);
											return (
												<View key={r.slug}>
													<Pressable style={styles.listRow} onPress={() => toggleRetailer(r.slug)}>
														<Text style={styles.listLabel}>{r.name}</Text>
														<View style={[styles.check, on && styles.checkOn]}>
															{on && <Ionicons name="checkmark" size={13} color={colors.navy} />}
														</View>
													</Pressable>
													{idx < retailers.length - 1 && <View style={styles.listDivider} />}
												</View>
											);
										})}
									</View>
								)}
							</View>
						)}

						{showCategories && (
							<View style={styles.section}>
								<Text style={styles.sectionTitle}>CATEGORÍAS</Text>
								{categories.length === 0 ? (
									<Text style={styles.emptyHint}>
										No hay categorías identificadas en tus ofertas todavía.
									</Text>
								) : (
									<View style={styles.list}>
										{categories.map((c, idx) => {
											const on = draft.categories.has(c);
											return (
												<View key={c}>
													<Pressable style={styles.listRow} onPress={() => toggleCategory(c)}>
														<Text style={styles.listLabel}>{c}</Text>
														<View style={[styles.check, on && styles.checkOn]}>
															{on && <Ionicons name="checkmark" size={13} color={colors.navy} />}
														</View>
													</Pressable>
													{idx < categories.length - 1 && <View style={styles.listDivider} />}
												</View>
											);
										})}
									</View>
								)}
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
		paddingHorizontal: 20,
		paddingTop: 14,
		paddingBottom: 28,
		maxHeight: "82%",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	cancel: { color: colors.mutedText, fontFamily: typography.family.medium, fontSize: 14 },
	title: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 16 },
	clear: { color: colors.orange, fontFamily: typography.family.bold, fontSize: 14 },
	clearDisabled: { color: colors.subtleText },
	body: { paddingTop: 6 },
	section: { paddingVertical: 14, gap: 10 },
	sectionTitle: {
		color: colors.subtleText,
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1.2,
	},
	emptyHint: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
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
		paddingHorizontal: 14,
		paddingVertical: 13,
	},
	listLabel: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	listDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 14 },
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
	nearbyRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.divider,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 13,
	},
	nearbyRowOn: { backgroundColor: colors.navy, borderColor: colors.navy },
	nearbyText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	nearbyTextOn: { color: colors.buttonText },
	radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	radiusChip: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.divider,
		backgroundColor: colors.background,
	},
	radiusChipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
	radiusText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	radiusTextOn: { color: colors.buttonText },
	nearbyHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12 },
	nearbyError: { color: colors.dangerSoftText, fontFamily: typography.family.regular, fontSize: 12 },
	applyButton: {
		marginTop: 14,
		backgroundColor: colors.navy,
		height: 50,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	applyText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 15 },
	});
}
