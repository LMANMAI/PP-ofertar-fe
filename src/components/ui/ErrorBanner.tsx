import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	message: string;
};

/** The inline "something failed" banner used across every data-fetching
 * screen: warning icon + message on a dangerSoft pill. */
export function ErrorBanner({ message }: Props) {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<View style={styles.banner}>
			<Ionicons name="warning-outline" size={18} color={colors.orange} />
			<Text style={styles.text}>{message}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		banner: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
			margin: space.lg,
			backgroundColor: colors.dangerSoft,
			borderRadius: 10,
			padding: space.md,
		},
		text: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 13 },
	});
}
