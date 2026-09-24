import { useMemo, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { InputField, PasswordStrengthBar, ScreenHeader, InlineNotice, PrimaryButton } from "../components";
import { friendlyAuthError, resetPassword } from "../services/authApi";

type Props = {
	email: string;
	/** Already accepted by the server on the previous step; sent again here to authorize the change. */
	code: string;
	/** Goes back to the code step. */
	onBack: () => void;
	onSuccess: () => void;
};

const RULE_LABELS = {
	minLength: "8 caracteres como mínimo",
	uppercase: "una mayúscula",
	number: "un número",
	special: "un carácter especial",
} as const;

function joinWithY(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function ChangePasswordScreen({ email, code, onBack, onSuccess }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [pw, setPw] = useState("");
	const [pw2, setPw2] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const pwRef = useRef<TextInput>(null);
	const pw2Ref = useRef<TextInput>(null);

	const checks = useMemo(
		() => ({
			minLength: pw.length >= 8,
			uppercase: /[A-Z]/.test(pw),
			number: /[0-9]/.test(pw),
			special: /[^A-Za-z0-9]/.test(pw),
			matches: pw.length > 0 && pw === pw2,
		}),
		[pw, pw2],
	);
	const missingRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[])
		.filter((key) => !checks[key])
		.map((key) => RULE_LABELS[key]);
	const canSubmit = missingRules.length === 0 && checks.matches;

	// Derived, so the messages update (and disappear) as the user fixes things.
	const pwError = submitted && missingRules.length > 0 ? `Falta: ${joinWithY(missingRules)}` : undefined;
	const pw2Error =
		pw2.length === 0
			? submitted
				? "Repetí tu nueva contraseña"
				: undefined
			: !checks.matches && (submitted || pw2.length >= pw.length)
				? "Las contraseñas no coinciden"
				: undefined;

	const handleSubmit = async () => {
		if (loading) return;
		if (!canSubmit) {
			setSubmitted(true);
			if (missingRules.length > 0) pwRef.current?.focus();
			else pw2Ref.current?.focus();
			return;
		}
		setError(null);
		setLoading(true);
		try {
			await resetPassword(email, code, pw);
			onSuccess();
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Nueva contraseña" onBack={loading ? () => {} : onBack} />

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={{ padding: space.xxl, gap: space.lg, paddingBottom: insets.bottom + space.xxl }}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					<View style={styles.intro}>
						<Text style={styles.title} accessibilityRole="header">Elegí una contraseña nueva</Text>
						<Text style={styles.body}>Es la que vas a usar para ingresar a OfertAR desde ahora.</Text>
					</View>

					<InputField
						label="Nueva contraseña"
						value={pw}
						onChangeText={(t) => {
							setPw(t);
							setError(null);
						}}
						error={pwError}
						inputRef={pwRef}
						editable={!loading}
						secureTextEntry
						showPasswordToggle
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						textContentType="newPassword"
						returnKeyType="next"
						onSubmitEditing={() => pw2Ref.current?.focus()}
					/>

					<PasswordStrengthBar
						minLength={checks.minLength}
						uppercase={checks.uppercase}
						number={checks.number}
						special={checks.special}
						matches={checks.matches}
					/>

					<InputField
						label="Repetí tu nueva contraseña"
						value={pw2}
						onChangeText={(t) => {
							setPw2(t);
							setError(null);
						}}
						error={pw2Error}
						inputRef={pw2Ref}
						editable={!loading}
						secureTextEntry
						showPasswordToggle
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						textContentType="newPassword"
						returnKeyType="done"
						onSubmitEditing={handleSubmit}
					/>

					{error && (
						<InlineNotice message={error}>
						{/* The code is the only thing that can be wrong here, and only a new one fixes it. */}
						{/código/i.test(error) && (
								<Pressable
									onPress={onBack}
									style={(state) => [styles.errorAction, isFocused(state) && styles.focusRing]}
									accessibilityRole="button"
									accessibilityLabel="Volver a ingresar el código"
								>
									<Text style={styles.errorActionText}>Volver a ingresar el código</Text>
								</Pressable>
							)}
					</InlineNotice>
					)}

					<PrimaryButton label="Cambiar contraseña" onPress={handleSubmit} loading={loading} />
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.card },
		intro: { gap: space.xsPlus },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.h1,
			lineHeight: typography.lineHeights.h1,
		},
		body: {
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.bodyL,
			lineHeight: typography.lineHeights.bodyL,
		},
		errorAction: { minHeight: 44, justifyContent: "center" },
		errorActionText: {
			color: colors.dangerSoftText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.caption,
			textDecorationLine: "underline",
		},
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
	});
}
