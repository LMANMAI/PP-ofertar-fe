import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors } from "../../theme/designSystem";

type Props = {
	/** Spacing only (margins): the look is the chip's own. */
	style?: StyleProp<ViewStyle>;
};

/**
 * "Lo seguís", on a product bought on a ticket that is also one the user
 * follows from the scanner. It is the same product, so it stays one entry and
 * this says where else it lives. Same green and bell as "Siguiendo" in the
 * scanner, so it reads as the same state.
 *
 * Not announced on its own: the card's label says it, so a screen reader does
 * not read it twice.
 */
export function FollowedChip({ style }: Props) {
	const colors = useThemeColors();
	return (
		<View style={[styles.chip, { backgroundColor: colors.successSoft }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
			<Ionicons name="notifications" size={11} color={colors.successSoftText} />
			<Text style={[styles.text, { color: colors.successSoftText }]} numberOfLines={1}>
				Lo seguís
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	chip: {
		alignSelf: "flex-start",
		flexDirection: "row",
		alignItems: "center",
		gap: space.xs,
		paddingHorizontal: space.sm,
		paddingVertical: 2,
		borderRadius: radii.full,
	},
	text: { fontFamily: typography.family.medium, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
});
