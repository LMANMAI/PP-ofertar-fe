import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors } from "../../theme/designSystem";

type IonName = ComponentProps<typeof Ionicons>["name"];

type Variant = "error" | "success" | "info" | "warning";

type Props = {
	variant?: Variant;
	/** Replaces the variant's default icon when another one says it better. */
	icon?: IonName;
	message: string;
	/** Actions or extra lines under the message (a recovery link, for example). */
	children?: ReactNode;
	/** Announced to screen readers when it appears. On for errors and results
	 * the user just caused; off for a notice that is always there. */
	live?: boolean;
	style?: StyleProp<ViewStyle>;
};

const ICONS: Record<Variant, IonName> = {
	error: "alert-circle",
	success: "checkmark-circle",
	info: "information-circle-outline",
	warning: "warning-outline",
};

/**
 * A rounded box with an icon and a message, in the soft background and text
 * pair of its meaning. It sits inside a form or a card; the full-width banner
 * with a retry is `ErrorBanner`.
 */
export function InlineNotice({ variant = "error", icon, message, children, live = variant === "error", style }: Props) {
	const colors = useThemeColors();
	const tone = {
		error: { bg: colors.dangerSoft, fg: colors.dangerSoftText },
		success: { bg: colors.successSoft, fg: colors.successSoftText },
		info: { bg: colors.infoSoft, fg: colors.infoSoftText },
		warning: { bg: colors.warningSoft, fg: colors.warningSoftText },
	}[variant];

	return (
		<View
			style={[styles.box, { backgroundColor: tone.bg }, style]}
			accessibilityRole={live ? "alert" : undefined}
			accessibilityLiveRegion={live ? "polite" : undefined}
		>
			<View style={styles.line}>
				<Ionicons name={icon ?? ICONS[variant]} size={16} color={tone.fg} />
				<Text style={[styles.text, { color: tone.fg }]}>{message}</Text>
			</View>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	box: {
		paddingVertical: space.smPlus,
		paddingHorizontal: space.md,
		borderRadius: radii.button,
		gap: space.xs,
	},
	line: { flexDirection: "row", alignItems: "center", gap: space.sm },
	text: {
		flex: 1,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
});
