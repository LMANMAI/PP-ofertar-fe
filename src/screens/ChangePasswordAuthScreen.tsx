import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, PasswordStrengthBar, BottomNav, ScreenHeader, type TabKey } from "../components";
import type { Session } from "../auth/session";
import { changePassword } from "../services/authApi";

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
	const [currentPw, setCurrentPw] = useState("");
	const [newPw, setNewPw] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	const canSubmit = checks.minLength && checks.uppercase && checks.number && checks.special && checks.matches && currentPw.length > 0;

	const handleSubmit = async () => {
		setError(null);
		if (!canSubmit) return;

		if (!currentPw) {
			setError("Ingresá tu contraseña actual");
			return;
		}

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
					return;
				}
			} catch {
				setError("Error al verificar biometría. Intentá de nuevo.");
				return;
			}
		}

		setLoading(true);
		try {
			await changePassword(session.token, currentPw, newPw);
			onBack("Contraseña actualizada correctamente");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cambiar la contraseña");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Cambiar contraseña" onBack={() => onBack()} />

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
			<ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: insets.bottom + 140 }} keyboardShouldPersistTaps="handled">
				<Text style={styles.description}>
					Elegí una contraseña segura de al menos 8 caracteres con mayúsculas, números y caracteres especiales.
				</Text>

				<InputField label="Contraseña actual" value={currentPw} onChangeText={setCurrentPw} secureTextEntry showPasswordToggle />

				<InputField label="Nueva contraseña" value={newPw} onChangeText={setNewPw} secureTextEntry showPasswordToggle />

				<PasswordStrengthBar
					minLength={checks.minLength}
					uppercase={checks.uppercase}
					number={checks.number}
					special={checks.special}
					matches={checks.matches}
				/>

				<InputField label="Repetí tu nueva contraseña" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry showPasswordToggle />

				{error && (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				<Pressable
						onPress={canSubmit && !loading ? handleSubmit : undefined}
						style={({ pressed }) => [
							styles.submitBtn,
							(!canSubmit || loading) && styles.submitBtnDisabled,
							pressed && canSubmit && !loading && { opacity: 0.85 },
						]}
						disabled={!canSubmit || loading}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.buttonText} />
						) : biometricEnabled && canSubmit ? (
							<>
								<Ionicons name="finger-print-outline" size={18} color={colors.buttonText} />
								<Text style={styles.submitText}>Confirmar con huella</Text>
							</>
						) : (
							<Text style={styles.submitText}>Actualizar contraseña</Text>
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
	description: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20, marginBottom: space.xs },
	submitBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 12,
		marginTop: space.xs,
	},
	submitBtnDisabled: { opacity: 0.5 },
	submitText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	errorBox: { paddingVertical: 10, paddingHorizontal: space.md, borderRadius: 10, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	});
}
