import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
	icon: IconName;
	title: string;
	hint?: string;
	/** e.g. OffersScreen's "no offers match these filters" state, which offers
	 * a way out ("Limpiar filtros") rather than just explaining the dead end. */
	action?: { label: string; onPress: () => void };
	/** Most empty states sit inside a screen that's otherwise scrollable and
	 * take the full remaining height (`flex: 1`). A couple (the filtered-empty
	 * state above a still-rendered list) need to size to their content instead. */
	fill?: boolean;
};

/**
 * Icon + title + optional hint (+ optional recovery action), centered. The
 * shape every "nothing here yet" screen in the app already used — extracted
 * so the spacing/sizing/color choices live in one place instead of eight.
 */
export function EmptyState({ icon, title, hint, action, fill = true }: Props) {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<View style={[styles.wrap, fill && styles.fill]}>
			<Ionicons name={icon} size={56} color={colors.border} />
			<Text style={styles.title}>{title}</Text>
			{hint && <Text style={styles.hint}>{hint}</Text>}
			{action && (
				<Pressable style={styles.action} onPress={action.onPress}>
					<Text style={styles.actionText}>{action.label}</Text>
				</Pressable>
			)}
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		wrap: {
			alignItems: "center",
			justifyContent: "center",
			gap: 12,
			paddingVertical: 60,
			paddingHorizontal: 40,
		},
		fill: { flex: 1 },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: 16,
			textAlign: "center",
		},
		hint: {
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: 13,
			textAlign: "center",
			lineHeight: 18,
		},
		action: {
			marginTop: 6,
			backgroundColor: colors.navy,
			paddingHorizontal: 18,
			paddingVertical: 10,
			borderRadius: 10,
		},
		actionText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 13 },
	});
}
