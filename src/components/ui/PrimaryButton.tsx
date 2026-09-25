import { useMemo, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { focusRing, isFocused, radii, space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	label: string;
	onPress: () => void;
	/** Spinner in place of the label. The label stays as the accessible name, so
	 * a screen reader still hears what the button is while it works. */
	loading?: boolean;
	disabled?: boolean;
	icon?: ComponentProps<typeof Ionicons>["name"];
	/** Icon after the label (arrows) instead of before it. */
	iconAfter?: boolean;
	/** large 52 (the main action of a screen), medium 48 (inside a card),
	 * compact 44 (inline, sizes to its label). */
	size?: "large" | "medium" | "compact";
	/** Overrides the accessible name when the visible label is not enough. */
	accessibilityLabel?: string;
	style?: StyleProp<ViewStyle>;
};

/**
 * The one filled action button: the action color (navy in light, cyan in dark,
 * so it never disappears into the page), the button radius, a focus ring, and
 * busy/disabled state announced. Screens used to each rebuild it — with a
 * fixed navy that vanished in dark mode.
 */
export function PrimaryButton({
	label,
	onPress,
	loading = false,
	disabled = false,
	icon,
	iconAfter = false,
	size = "large",
	accessibilityLabel,
	style,
}: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const inactive = loading || disabled;
	const iconView = icon ? <Ionicons name={icon} size={size === "large" ? 16 : 18} color={colors.actionText} /> : null;

	return (
		<Pressable
			onPress={inactive ? undefined : onPress}
			disabled={inactive}
			style={(state) => [
				styles.base,
				size === "large" && styles.large,
				size === "medium" && styles.medium,
				size === "compact" && styles.compact,
				inactive && styles.inactive,
				state.pressed && !inactive && styles.pressed,
				isFocused(state) && styles.focusRing,
				style,
			]}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ busy: loading, disabled: inactive }}
		>
			{loading ? (
				<ActivityIndicator size="small" color={colors.actionText} />
			) : (
				<>
					{!iconAfter && iconView}
					<Text style={styles.text}>{label}</Text>
					{iconAfter && iconView}
				</>
			)}
		</Pressable>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		base: {
			backgroundColor: colors.actionFill,
			borderRadius: radii.button,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.sm,
		},
		large: { height: 52 },
		medium: { height: 48 },
		compact: { minHeight: 44, paddingHorizontal: space.xl },
		inactive: { opacity: 0.7 },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		text: {
			color: colors.actionText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
	});
}
