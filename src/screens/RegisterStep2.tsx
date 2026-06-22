import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { InputField } from "../components";

type Props = { onNext: () => void; onBack: () => void };

export default function RegisterStep2({ onNext, onBack }: Props) {
	const insets = useSafeAreaInsets();
	const [password, setPassword] = useState("");
	const [repeatPassword, setRepeatPassword] = useState("");

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

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<View style={styles.headerLine}>
					<View style={styles.headerLeft}>
						<Pressable onPress={onBack} style={styles.backButton}>
							<Ionicons name="chevron-back" size={20} color={colors.buttonText} />
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 2 de 3</Text>
				</View>
			</View>
			<View style={styles.progressWrap}>
				<View style={styles.progressTrack}>
					<View style={styles.progressFill} />
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.intro}>
					<Text style={styles.title}>Elegí una contraseña</Text>
					<Text style={styles.subtitle}>
						Usá al menos 8 caracteres, una mayúscula y un número.
					</Text>
				</View>

				<View style={styles.form}>
					<InputField
						label="Contraseña"
						leftIcon=""
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>

					<View style={styles.passwordFeedbackRow}>
						<Text
							style={[
								styles.feedbackText,
								passwordChecks.minLength && styles.feedbackTextActive,
							]}
						>
							Fortaleza: Buena
						</Text>
						<Text
							style={[
								styles.feedbackText,
								passwordChecks.special && styles.feedbackTextActive,
								styles.feedbackRight,
							]}
						>
							Falta un caracter especial
						</Text>
					</View>

					<InputField
						label="Repetí contraseña"
						leftIcon=""
						value={repeatPassword}
						onChangeText={setRepeatPassword}
						secureTextEntry
					/>

					<View style={styles.requirementsList}>
						<RequirementItem
							active={passwordChecks.minLength}
							text="Mínimo 8 caracteres"
						/>
						<RequirementItem
							active={passwordChecks.uppercase}
							text="Una letra mayúscula"
						/>
						<RequirementItem active={passwordChecks.number} text="Un número" />
						<RequirementItem
							active={passwordChecks.special}
							text="Un carácter especial (!@#$)"
						/>
					</View>
				</View>

				<View style={styles.footer}>
					<Pressable
						onPress={canContinue ? onNext : undefined}
						style={({ pressed }) => [
							styles.primaryButton,
							pressed && canContinue && styles.primaryButtonPressed,
							!canContinue && styles.primaryButtonDisabled,
						]}
					>
						<Text style={styles.primaryButtonText}>Crear cuenta</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}

function RequirementItem({ active, text }: { active: boolean; text: string }) {
	return (
		<View style={styles.requirementRow}>
			<Ionicons
				name={active ? "checkmark-circle" : "ellipse-outline"}
				size={14}
				color={active ? colors.cyan : colors.mutedText}
			/>
			<Text
				style={[styles.requirementText, active && styles.requirementTextActive]}
			>
				{text}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
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
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "66%" },
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
	passwordFeedbackRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: 8,
		marginTop: -2,
	},
	feedbackText: {
		flex: 1,
		fontSize: 10,
		lineHeight: 13,
		color: colors.mutedText,
	},
	feedbackRight: { textAlign: "right" },
	feedbackTextActive: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
	},
	requirementsList: { gap: 6, marginTop: 4 },
	requirementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	requirementText: { color: colors.mutedText, fontSize: 12, lineHeight: 16 },
	requirementTextActive: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
	},
	footer: { paddingTop: 22 },
	primaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonPressed: { opacity: 0.9 },
	primaryButtonDisabled: { opacity: 0.55 },
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		lineHeight: 18,
	},
});
