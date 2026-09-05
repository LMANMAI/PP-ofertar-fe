import { StyleSheet, Text, View } from "react-native";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	text: string;
	tone?: "cyan";
};

/** Small pill used on navy surfaces (hero cards, summary rows) — muted by
 * default, cyan for the one stat on the card worth calling out. */
export function Tag({ text, tone }: Props) {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<View style={[styles.tag, tone === "cyan" ? styles.tagCyan : styles.tagMuted]}>
			<Text style={[styles.tagText, tone === "cyan" ? styles.tagTextCyan : styles.tagTextMuted]}>{text}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		tag: { paddingHorizontal: space.smPlus, paddingVertical: 5, borderRadius: 999 },
		tagMuted: { backgroundColor: "rgba(255,255,255,0.12)" },
		tagCyan: { backgroundColor: colors.cyan },
		tagText: { fontFamily: typography.family.medium, fontSize: 11 },
		tagTextMuted: { color: "rgba(255,255,255,0.85)" },
		tagTextCyan: { color: colors.navy },
	});
}
