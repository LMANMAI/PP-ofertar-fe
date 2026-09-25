import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	message: string;
	/** When given, the banner offers a way out instead of just reporting. */
	onRetry?: () => void;
};

/** The inline "something failed" banner used across every data-fetching
 * screen: warning icon + message on a dangerSoft pill. */
export function ErrorBanner({ message, onRetry }: Props) {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
			<Ionicons name="warning-outline" size={18} color={colors.orange} />
			<Text style={styles.text}>{message}</Text>
			{onRetry && (
				<Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel="Reintentar">
					<Text style={styles.retryText}>Reintentar</Text>
				</Pressable>
			)}
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
		text: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
		retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm },
		retryText: { color: colors.dangerSoftText, fontFamily: typography.family.bold, fontSize: typography.sizes.caption, textDecorationLine: "underline" },
	});
}
