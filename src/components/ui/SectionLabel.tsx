import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { typography, useThemeColors } from "../../theme/designSystem";

type Props = {
	children: ReactNode;
	/** Spacing only (margins): the look is the label's own. */
	style?: StyleProp<TextStyle>;
};

/**
 * The small uppercase caption that names a group of rows ("CUENTA",
 * "PREFERENCIAS"). Announced as a heading, so a screen reader can jump between
 * groups. Seven screens each drew it with its own size, from 10px up.
 */
export function SectionLabel({ children, style }: Props) {
	const colors = useThemeColors();
	return (
		<Text accessibilityRole="header" style={[styles.label, { color: colors.subtleText }, style]}>
			{children}
		</Text>
	);
}

const styles = StyleSheet.create({
	label: {
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
		letterSpacing: 1.2,
	},
});
