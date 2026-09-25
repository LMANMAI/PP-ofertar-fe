import type { ReactNode } from "react";
import { Linking, Text, type StyleProp, type TextStyle } from "react-native";
import { TERMS_URL } from "../../constants/legal";

type Props = {
	children: ReactNode;
	style?: StyleProp<TextStyle>;
};

/** Inline link to the terms PDF. Inherits the parent's color (no fixed color
 * on purpose: the same link sits on navy and on the light background) and
 * uses the underline as the affordance. */
export function LegalLink({ children, style }: Props) {
	return (
		<Text
			accessibilityRole="link"
			onPress={() => {
				Linking.openURL(TERMS_URL).catch(() => {});
			}}
			style={[{ textDecorationLine: "underline" }, style]}
		>
			{children}
		</Text>
	);
}
