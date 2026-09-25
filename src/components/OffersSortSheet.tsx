import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";

type Option<K extends string> = { key: K; label: string };

type Props<K extends string> = {
	visible: boolean;
	onClose: () => void;
	options: Option<K>[];
	value: K;
	onSelect: (key: K) => void;
	/** Said under the title when the order only covers what is already loaded. */
	note?: string;
};

/** Every way to order the list, visible at once, instead of one chip that
 * cycles through them blind. Picking one applies it and closes. */
export function OffersSortSheet<K extends string>({ visible, onClose, options, value, onSelect, note }: Props<K>) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<Pressable
					style={styles.backdropTap}
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Cerrar orden"
				/>
				<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.md }]}>
					<Text style={styles.title} accessibilityRole="header">
						Ordenar por
					</Text>
					{note ? <Text style={styles.note}>{note}</Text> : null}
					<View style={styles.list} accessibilityRole="radiogroup">
						{options.map((o, idx) => {
							const on = o.key === value;
							return (
								<View key={o.key}>
									<Pressable
										style={(state) => [styles.row, isFocused(state) && styles.focusRing]}
										onPress={() => onSelect(o.key)}
										accessibilityRole="radio"
										accessibilityLabel={o.label}
										accessibilityState={{ selected: on }}
									>
										<Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
										{on && <Ionicons name="checkmark" size={18} color={colors.actionFill} />}
									</Pressable>
									{idx < options.length - 1 && <View style={styles.divider} />}
								</View>
							);
						})}
					</View>
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
			paddingTop: space.lg,
			gap: space.sm,
		},
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.subtitle,
			lineHeight: typography.lineHeights.subtitle,
		},
		note: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		list: {
			marginTop: space.xs,
			backgroundColor: colors.background,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			overflow: "hidden",
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			minHeight: 48,
			paddingHorizontal: space.mdPlus,
			paddingVertical: space.md,
		},
		label: {
			flex: 1,
			color: colors.defaultText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		labelOn: { fontFamily: typography.family.bold },
		divider: { height: 1, backgroundColor: colors.divider, marginLeft: space.mdPlus },
		focusRing: focusRing(colors),
	});
}
