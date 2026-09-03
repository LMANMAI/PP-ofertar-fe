import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, PasswordStrengthBar } from "../components";
import { register } from "../services/authApi";
import type { Session } from "../auth/session";

type Props = {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	onNext: (session: Session) => void;
	onBack: () => void;
};

export default function RegisterStep2({ firstName, lastName, email, phone: _phone, onNext, onBack }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [password, setPassword] = useState("");
	const [repeatPassword, setRepeatPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const passwordChecks = useMemo(
		() => ({
			minLength: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			number: /[0-9]/.test(password),
			special: /[^A-Za-z0-9]/.test(password),
			matches: password.length > 0 && password === repeatPassword,
		}),
		[password, repeatPassword],
	);

	const canContinue =
		passwordChecks.minLength &&
		passwordChecks.uppercase &&
		passwordChecks.number &&
		passwordChecks.special &&
		passwordChecks.matches;

	const handleRegister = async () => {
		if (!canContinue) return;
		setError(null);
		setLoading(true);
		try {
			const name = `${firstName} ${lastName}`.trim();
			const authResponse = await register(name, email.trim(), password);
			onNext({ token: authResponse.token, user: authResponse.user });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear la cuenta");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<View style={styles.headerLine}>
					<View style={styles.headerLeft}>
						<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
							<Ionicons name="chevron-back" size={20} color={colors.buttonText} />
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 2 de 2</Text>
				</View>
			</View>
			<View style={styles.progressWrap}>
				<View style={styles.progressTrack}>
					<View style={styles.progressFill} />
				</View>
			</View>

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
			<ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
				<View style={styles.intro}>
					<Text style={styles.title}>Elegí una contraseña</Text>
					<Text style={styles.subtitle}>
						Usá al menos 8 caracteres, una mayúscula y un número.
					</Text>
				</View>

				<View style={styles.form}>
					<InputField
						label="Contraseña"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						showPasswordToggle
					/>

					<PasswordStrengthBar
						minLength={passwordChecks.minLength}
						uppercase={passwordChecks.uppercase}
						number={passwordChecks.number}
						special={passwordChecks.special}
					/>

					<InputField
						label="Repetí tu contraseña"
						value={repeatPassword}
						onChangeText={setRepeatPassword}
						secureTextEntry
						showPasswordToggle
					/>
				</View>

				{error && (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle" size={16} color="#A8341E" />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				<Pressable
					onPress={canContinue && !loading ? handleRegister : undefined}
					style={({ pressed }) => [
						styles.primaryButton,
						pressed && canContinue && !loading && styles.primaryButtonPressed,
						(!canContinue || loading) && styles.primaryButtonDisabled,
					]}
				>
					{loading ? (
						<ActivityIndicator size="small" color={colors.buttonText} />
					) : (
						<Text style={styles.primaryButtonText}>Crear cuenta</Text>
					)}
				</Pressable>
			</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	header: {
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 0,
		backgroundColor: colors.navy,
	},
	headerLine: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	headerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
	backButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	stepLabel: { color: colors.cyan, fontSize: 11, lineHeight: 14, paddingRight: 4 },
	progressWrap: { backgroundColor: colors.navy },
	progressTrack: { height: 6, backgroundColor: colors.softCyan, width: "100%" },
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "100%" },
	container: {
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 24,
		backgroundColor: colors.background,
		flexGrow: 1,
	},
	intro: { gap: 6, paddingBottom: 18 },
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 28,
		lineHeight: 36,
	},
	subtitle: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 17,
		lineHeight: 26,
	},
	form: { gap: 16 },
	primaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 20,
	},
	primaryButtonPressed: { opacity: 0.9 },
	primaryButtonDisabled: { opacity: 0.55 },
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		lineHeight: 18,
	},
	errorBox: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FDECEA", borderWidth: 1, borderColor: "#F5C1B8", flexDirection: "row", alignItems: "center", gap: 8 },
	errorText: { flex: 1, color: "#A8341E", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	});
}
