import { useState } from "react";
import {
	StyleSheet,
	Text,
	TextInput,
	View,
	KeyboardTypeOptions,
} from "react-native";
import { colors, typography } from "../../theme/designSystem";

type InputFieldProps = {
	label: string;
	leftIcon: string;
	value: string;
	onChangeText: (text: string) => void;
	keyboardType?: KeyboardTypeOptions;
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	secureTextEntry?: boolean;
	rightIcon?: string;
};

export function InputField({
	label,
	leftIcon,
	value,
	onChangeText,
	keyboardType,
	autoCapitalize,
	secureTextEntry,
	rightIcon,
}: InputFieldProps) {
	const [focused, setFocused] = useState(false);

	return (
		<View style={styles.wrapper}>
			<Text style={styles.label}>{label}</Text>
			<View style={[styles.inputRow, focused && styles.inputRowFocused]}>
				<Text style={styles.leftIcon}>{leftIcon}</Text>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder=""
					placeholderTextColor={colors.mutedText}
					style={styles.input}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					secureTextEntry={secureTextEntry}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
				/>
				{rightIcon && <Text style={styles.rightIcon}>{rightIcon}</Text>}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		gap: 8,
	},
	label: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	inputRow: {
		height: 52,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		backgroundColor: colors.card,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
	},
	inputRowFocused: {
		borderColor: colors.cyan,
		backgroundColor: colors.softCyan,
	},
	leftIcon: {
		width: 26,
		color: colors.mutedText,
		fontSize: 16,
	},
	input: {
		flex: 1,
		height: 52,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: 15,
	},
	rightIcon: {
		color: colors.mutedText,
		fontSize: 16,
	},
});
