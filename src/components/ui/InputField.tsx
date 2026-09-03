import { useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors } from "../../theme/designSystem";

type IoniconName = keyof typeof Ionicons.glyphMap;

type InputFieldProps = {
	label: string;
	leftIcon?: IoniconName;
	value: string;
	onChangeText: (text: string) => void;
	keyboardType?: KeyboardTypeOptions;
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	secureTextEntry?: boolean;
	rightIcon?: IoniconName;
	showPasswordToggle?: boolean;
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
	showPasswordToggle,
}: InputFieldProps) {
	const colors = useThemeColors();
	const [focused, setFocused] = useState(false);
	const [passwordVisible, setPasswordVisible] = useState(false);

	const isSecure = showPasswordToggle ? !passwordVisible : secureTextEntry;

	return (
		<View style={styles.wrapper}>
			<Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
			<View
				style={[
					styles.inputRow,
					{ borderColor: colors.border, backgroundColor: colors.card },
					focused && {
						borderColor: colors.cyan,
						backgroundColor: colors.softCyan,
					},
				]}
			>
				{leftIcon ? (
					<Ionicons
						name={leftIcon}
						size={18}
						color={colors.mutedText}
						style={styles.leftIcon}
					/>
				) : null}
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder=""
					placeholderTextColor={colors.mutedText}
					style={[styles.input, { color: colors.defaultText }]}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					secureTextEntry={isSecure}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					accessibilityLabel={label}
				/>
				{showPasswordToggle ? (
					<Pressable
						onPress={() => setPasswordVisible((prev) => !prev)}
						style={styles.eyeButton}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel={
							passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
						}
					>
						<Ionicons
							name={passwordVisible ? "eye-outline" : "eye-off-outline"}
							size={20}
							color={colors.mutedText}
						/>
					</Pressable>
				) : rightIcon ? (
					<Ionicons name={rightIcon} size={16} color={colors.mutedText} />
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		gap: space.sm,
	},
	label: {
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 16,
	},
	inputRow: {
		height: 52,
		borderWidth: 1,
		borderRadius: 10,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		gap: 10,
	},
	leftIcon: {
		width: 18,
	},
	input: {
		flex: 1,
		height: 52,
		fontFamily: typography.family.regular,
		fontSize: 15,
	},
	eyeButton: {
		width: 32,
		height: 32,
		alignItems: "center",
		justifyContent: "center",
	},
});
