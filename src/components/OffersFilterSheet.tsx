import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";

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
	retailers: Retailer[];
	categories: string[];
	value: OffersFilterState;
	onApply: (next: OffersFilterState) => void;
};

export function OffersFilterSheet({
	visible,
	onClose,
	section,
	retailers,
	categories,
	value,
	onApply,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [draft, setDraft] = useState<OffersFilterState>(value);

	// Copies the applied filters into a local draft each time the sheet opens,
	// so toggling checkboxes does not touch the list underneath until "Aplicar"
	// — and closing without applying discards the draft instead of leaving the
	// list half-filtered.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs the draft to the applied filters whenever the sheet reopens
		if (visible) setDraft(value);
	}, [visible, value]);

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

	const title = section === "retailers" ? "Supermercados" : "Categorías";
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
				{/* Tapping the dimmed area closes the sheet without applying. */}
				<Pressable
					style={styles.backdropTap}
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel={`Cerrar ${title}`}
				/>
				<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.md }]}>
					<View style={styles.header}>
						<Pressable
							onPress={onClose}
							style={(state) => [styles.headerButton, isFocused(state) && styles.focusRing]}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel="Cerrar sin aplicar"
						>
							<Text style={styles.cancel}>Cerrar</Text>
						</Pressable>
						<Text style={styles.title} accessibilityRole="header">
							{title}
						</Text>
						<Pressable
							onPress={() =>
								setDraft((d) =>
									section === "retailers"
										? { ...d, retailerSlugs: new Set() }
										: { ...d, categories: new Set() },
								)
							}
							style={(state) => [styles.headerButton, isFocused(state) && styles.focusRing]}
							hitSlop={8}
							disabled={activeCount === 0}
							accessibilityRole="button"
							accessibilityLabel={`Limpiar ${title}`}
							accessibilityState={{ disabled: activeCount === 0 }}
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
											<Pressable
												style={(state) => [styles.listRow, isFocused(state) && styles.focusRing]}
												onPress={() => toggle(item.key)}
												accessibilityRole="checkbox"
												accessibilityLabel={item.label}
												accessibilityState={{ checked: on }}
											>
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

					{/* No result count here: the offers on screen are only the pages loaded
					    so far, and applying re-queries the server, so a number computed
					    from them would not be what the user ends up seeing. */}
					<Pressable
						style={(state) => [styles.applyButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
						onPress={() => onApply(draft)}
						accessibilityRole="button"
						accessibilityLabel="Aplicar filtros"
					>
						<Text style={styles.applyText}>Aplicar filtros</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
		backdropTap: { flex: 1 },
		sheet: {
			backgroundColor: colors.card,
			borderTopLeftRadius: radii.xl,
			borderTopRightRadius: radii.xl,
			paddingHorizontal: space.xl,
			paddingTop: space.mdPlus,
			maxHeight: "82%",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingBottom: space.sm,
			borderBottomWidth: 1,
			borderBottomColor: colors.border,
		},
		headerButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs },
		cancel: {
			color: colors.mutedText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.subtitle,
			lineHeight: typography.lineHeights.subtitle,
		},
		// The action color, not the coral: coral on the white sheet is ~3:1.
		clear: {
			color: colors.actionFill,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		clearDisabled: { color: colors.subtleText },
		body: { paddingTop: space.smPlus },
		emptyHint: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
			paddingVertical: space.sm,
		},
		list: {
			backgroundColor: colors.background,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			overflow: "hidden",
		},
		listRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			minHeight: 48,
			paddingHorizontal: space.mdPlus,
			paddingVertical: space.md,
		},
		listLabel: {
			flex: 1,
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		listDivider: { height: 1, backgroundColor: colors.divider, marginLeft: space.mdPlus },
		// inputBorder, not border: an unchecked box has to read at ~3:1.
		check: {
			width: 22,
			height: 22,
			borderRadius: radii.full,
			borderWidth: 1.5,
			borderColor: colors.inputBorder,
			alignItems: "center",
			justifyContent: "center",
		},
		checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
		applyButton: {
			marginTop: space.mdPlus,
			backgroundColor: colors.actionFill,
			height: 52,
			borderRadius: radii.md,
			alignItems: "center",
			justifyContent: "center",
		},
		applyText: {
			color: colors.actionText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
	});
}
