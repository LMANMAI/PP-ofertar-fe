import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, PasswordStrengthBar, BottomNav, ScreenHeader, type TabKey } from "../components";
import type { Session } from "../auth/session";
import { useBiometricInfo } from "../auth/biometricAuth";
import { changePassword } from "../services/authApi";

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

// The backend does not return a field code, so a message about the current
// password is matched by wording to put it under that field.
const CURRENT_PASSWORD_ERROR = /actual|incorrect|inválid|invalid/i;

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

type Props = {
	session: Session;
	biometricEnabled: boolean;
	onBack: (message?: string) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function ChangePasswordAuthScreen({ session, biometricEnabled, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const biometric = useBiometricInfo();
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentServerError, setCurrentServerError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const currentRef = useRef<TextInput>(null);
	const newRef = useRef<TextInput>(null);
	const confirmRef = useRef<TextInput>(null);

	const checks = useMemo(
		() => ({
			minLength: newPw.length >= 8,
			uppercase: /[A-Z]/.test(newPw),
			number: /[0-9]/.test(newPw),
			special: /[^A-Za-z0-9]/.test(newPw),
			matches: newPw.length > 0 && newPw === confirmPw,
		}),
		[newPw, confirmPw],
	);

	const missingRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[])
		.filter((key) => !checks[key])
		.map((key) => RULE_LABELS[key]);
	const canSubmit = missingRules.length === 0 && checks.matches && currentPw.length > 0;

	// Derived, so the messages update (and disappear) as the user fixes things.
	const currentError = currentServerError ?? (submitted && !currentPw ? "Ingresá tu contraseña actual" : undefined);
	const newError = submitted && missingRules.length > 0 ? `Falta: ${joinWithY(missingRules)}` : undefined;
	const confirmError =
		confirmPw.length === 0
			? submitted
				? "Repetí tu nueva contraseña"
				: undefined
			: !checks.matches && (submitted || confirmPw.length >= newPw.length)
				? "Las contraseñas no coinciden"
				: undefined;

	const submitLabel = biometricEnabled ? `Confirmar con ${biometric.hint}` : "Actualizar contraseña";

	const handleSubmit = async () => {
		if (loading) return;
		setError(null);
		setCurrentServerError(null);
		if (!canSubmit) {
			setSubmitted(true);
			if (!currentPw) currentRef.current?.focus();
			else if (missingRules.length > 0) newRef.current?.focus();
			else confirmRef.current?.focus();
			return;
		}
		setLoading(true);

		if (biometricEnabled) {
			try {
				const result = await LocalAuthentication.authenticateAsync({
					promptMessage: "Confirmá tu identidad para cambiar la contraseña",
					fallbackLabel: "Usar contraseña",
					disableDeviceFallback: false,
				});
				if (!result.success) {
					if (result.error === "lockout") {
						setError("Demasiados intentos. No se puede cambiar la contraseña ahora.");
					} else {
						setError("No se pudo verificar tu identidad. Intentá de nuevo.");
					}
					setLoading(false);
					return;
				}
			} catch {
				setError("Error al verificar biometría. Intentá de nuevo.");
				setLoading(false);
				return;
			}
		}

		try {
			await changePassword(session.token, currentPw, newPw);
			onBack("Contraseña actualizada correctamente");
		} catch (err) {
			const message = err instanceof Error ? err.message : "";
			if (message && CURRENT_PASSWORD_ERROR.test(message)) {
				setCurrentServerError(message);
				currentRef.current?.focus();
			} else {
				setError(message || "No pudimos cambiar la contraseña. Probá de nuevo en unos minutos.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Cambiar contraseña" onBack={() => onBack()} />

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
			<ScrollView
					contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxl }}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
				<Text style={styles.description}>
					Elegí una contraseña segura de al menos 8 caracteres con mayúsculas, números y caracteres especiales.
				</Text>

				<InputField
						label="Contraseña actual"
						value={currentPw}
						onChangeText={(t) => {
							setCurrentPw(t);
							setCurrentServerError(null);
						}}
						error={currentError}
						inputRef={currentRef}
						editable={!loading}
						secureTextEntry
						showPasswordToggle
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="current-password"
						textContentType="password"
						returnKeyType="next"
						onSubmitEditing={() => newRef.current?.focus()}
					/>

				<InputField
						label="Nueva contraseña"
						value={newPw}
						onChangeText={setNewPw}
						error={newError}
						inputRef={newRef}
						editable={!loading}
						secureTextEntry
						showPasswordToggle
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						textContentType="newPassword"
						returnKeyType="next"
						onSubmitEditing={() => confirmRef.current?.focus()}
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
						value={confirmPw}
						onChangeText={setConfirmPw}
						error={confirmError}
						inputRef={confirmRef}
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
					<View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
						<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				<Pressable
						onPress={handleSubmit}
						style={(state) => [
							styles.submitBtn,
							loading && styles.submitBtnLoading,
							state.pressed && !loading && { opacity: 0.85 },
							isFocused(state) && styles.focusRing,
						]}
						disabled={loading}
						accessibilityRole="button"
						accessibilityLabel={submitLabel}
						accessibilityState={{ busy: loading, disabled: loading }}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.actionText} />
						) : biometricEnabled ? (
							<>
								<Ionicons name={biometric.icon} size={18} color={colors.actionText} /> <Text style={styles.submitText}>{submitLabel}</Text>
							</>
						) : (
							<Text style={styles.submitText}>{submitLabel}</Text>
						)}
					</Pressable>
			</ScrollView>
			</KeyboardAvoidingView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	description: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.label, lineHeight: typography.lineHeights.label, marginBottom: space.xs },
	submitBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.actionFill,
		height: 52,
		borderRadius: radii.sm + 2,
		marginTop: space.xs,
	},
	submitBtnLoading: { opacity: 0.7 },
		focusRing: { outlineWidth: 2, outlineColor: colors.actionFill, outlineOffset: 2, outlineStyle: "solid" },
	submitText: { color: colors.actionText, fontFamily: typography.family.medium, fontSize: typography.sizes.body, lineHeight: typography.lineHeights.body },
	errorBox: { paddingVertical: space.smPlus, paddingHorizontal: space.md, borderRadius: radii.sm + 2, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
		});
}
