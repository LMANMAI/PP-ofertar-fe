import React, { useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";


import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Keyboard,
	Linking,
	Platform,
	type TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../components";
import { TERMS_URL } from "../constants/legal";
import { FieldError } from "../components/ui/InputField";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

export type RegisterStep1Data = {
	firstName: string;
	lastName: string;
	email: string;
	referralCode: string;
};

type Props = {
	onNext: (data: RegisterStep1Data) => void;
	onBack: () => void;
	onGoToLogin?: () => void;
	/** What the user had typed before going to step 2 and coming back. */
	initialData?: RegisterStep1Data | null;
};

type Errors = { firstName?: string; email?: string; terms?: string };

// Needs something after the "@" and a dot with a real ending; the backend is
// still the authority, this only catches typos before the round trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_ERROR = "Revisá el correo: tiene que ser algo como nombre@correo.com";

// Keyboard focus ring (web); native ignores `focused`.
const isFocused = (state: unknown) => !!(state as { focused?: boolean }).focused;

export default function RegisterStep1({ onNext, onBack, onGoToLogin, initialData }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	
	const styles = useMemo(() => createStyles(colors), [colors]);
	

	const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
	const [lastName, setLastName] = useState(initialData?.lastName ?? "");
	const [email, setEmail] = useState(initialData?.email ?? "");
	const [referralCode, setReferralCode] = useState(initialData?.referralCode ?? "");
	const [referralOpen, setReferralOpen] = useState(Boolean(initialData?.referralCode));
	// Coming back from step 2 means they already accepted to get there.
	const [accepted, setAccepted] = useState(Boolean(initialData));
	const [errors, setErrors] = useState<Errors>({});

	const lastNameRef = useRef<TextInput>(null);
	const emailRef = useRef<TextInput>(null);
	const firstNameRef = useRef<TextInput>(null);
	const referralRef = useRef<TextInput>(null);
	const scrollRef = useRef<ScrollView>(null);

	const clearError = (key: keyof Errors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

	const handleContinue = () => {
		const next: Errors = {};
		if (!firstName.trim()) next.firstName = "Ingresá tu nombre";
		if (!EMAIL_PATTERN.test(email.trim())) next.email = email.trim() ? EMAIL_ERROR : "Ingresá tu correo electrónico";
		if (!accepted) next.terms = "Aceptá los términos y la política de privacidad para continuar";
		setErrors(next);

		if (next.firstName) {
			firstNameRef.current?.focus();
			return;
		}
		if (next.email) {
			emailRef.current?.focus();
			return;
		}
		if (next.terms) {
				Keyboard.dismiss();
				setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
				return;
			}

		onNext({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			email: email.trim(),
			referralCode: referralCode.trim(),
		});
	};

	const formReady = firstName.trim() !== "" && EMAIL_PATTERN.test(email.trim()) && accepted;
	const submitIfReady = () => (formReady ? handleContinue() : Keyboard.dismiss());

	const openReferral = () => {
		setReferralOpen(true);
		setTimeout(() => referralRef.current?.focus(), 50);
	};

	

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top }]}>
			<StatusBar style="light" />

			<View style={styles.header}>
				<View style={styles.headerLine}>
					<View style={styles.headerLeft}>
						<Pressable onPress={onBack} style={(state) => [styles.backButton, isFocused(state) && styles.focusRing]} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
							<Ionicons name="chevron-back" size={20} color={colors.buttonText} />
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 1 de 2</Text>
				</View>
			</View>
			<View
				style={styles.progressWrap}
				accessibilityRole="progressbar"
				accessibilityLabel="Progreso del registro"
				accessibilityValue={{ min: 0, max: 2, now: 1, text: "Paso 1 de 2" }}
				aria-valuemin={0}
				aria-valuemax={2}
				aria-valuenow={1}
			>
				<View style={styles.progressTrack}>
					<View style={styles.progressFill} />
				</View>
			</View>

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
			<ScrollView
					ref={scrollRef}
					contentContainerStyle={[styles.container, { paddingBottom: space.xl }]}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
				<Text style={styles.title} accessibilityRole="header">Creá tu cuenta</Text>
				<Text style={styles.subtitle}>
					Con tu cuenta guardamos tus tickets para decirte qué te conviene.
				</Text>

				<View style={styles.form}>
					<InputField
						label="Nombre"
						value={firstName}
						onChangeText={(t) => {
							setFirstName(t);
							clearError("firstName");
						}}
						error={errors.firstName}
						inputRef={firstNameRef}
						autoComplete="given-name"
						textContentType="givenName"
						autoCapitalize="words"
						returnKeyType="next"
						onSubmitEditing={() => lastNameRef.current?.focus()}
					/>
					<InputField
						label="Apellido (opcional)"
						value={lastName}
						onChangeText={setLastName}
						inputRef={lastNameRef}
						autoComplete="family-name"
						textContentType="familyName"
						autoCapitalize="words"
						returnKeyType="next"
						onSubmitEditing={() => emailRef.current?.focus()}
					/>
					<InputField
						label="Correo electrónico"
						value={email}
						onChangeText={(t) => {
							setEmail(t);
							clearError("email");
						}}
						onBlur={() => {
							if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
								setErrors((prev) => ({ ...prev, email: EMAIL_ERROR }));
							}
						}}
						error={errors.email}
						inputRef={emailRef}
						keyboardType="email-address"
						autoComplete="email"
						textContentType="emailAddress"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType={referralOpen ? "next" : "done"}
						onSubmitEditing={() => (referralOpen ? referralRef.current?.focus() : submitIfReady())}
					/>
					{referralOpen ? (
						<InputField
							label="Código de invitación (opcional)"
							value={referralCode}
							onChangeText={(t) => setReferralCode(t.toUpperCase())}
							inputRef={referralRef}
							autoCapitalize="characters"
							autoCorrect={false}
							autoComplete="off"
							returnKeyType="done"
							onSubmitEditing={submitIfReady}
							leftIcon="people-outline"
						/>
					) : (
						<Pressable
							onPress={openReferral}
							style={(state) => [styles.referralToggle, isFocused(state) && styles.focusRing]}
							accessibilityRole="button"
							accessibilityState={{ expanded: false }}
							aria-expanded={false}
							accessibilityLabel="¿Tenés un código de invitación? Si te invitó alguien, los dos suman puntos"
						>
							<Ionicons name="people-outline" size={18} color={colors.mutedText} />
							<View style={styles.referralToggleCopy}>
								<Text style={styles.referralToggleText}>¿Tenés un código de invitación?</Text>
								<Text style={styles.referralToggleHint}>Si te invitó alguien, los dos suman puntos</Text>
							</View>
							<Ionicons name="chevron-down" size={16} color={colors.mutedText} />
						</Pressable>
					)}
				</View>

				<View style={styles.checkboxRow}>
					<Pressable
						onPress={() => {
							setAccepted(!accepted);
							clearError("terms");
						}}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: accepted }}
						aria-checked={accepted}
						accessibilityLabel="Acepto los términos y condiciones y la política de privacidad"
						accessibilityHint={errors.terms}
						style={(state) => [styles.checkboxTarget, isFocused(state) && styles.focusRing]}
					>
						<View style={[styles.checkbox, accepted && styles.checkboxChecked, errors.terms ? styles.checkboxError : null]}>
							{accepted && <Ionicons name="checkmark" size={16} color={colors.navy} />}
						</View>
					</Pressable>
					<Text
						style={styles.checkboxText}
						onPress={() => {
							setAccepted(!accepted);
							clearError("terms");
						}}
					>
						Acepto los términos y condiciones y la política de privacidad de OfertAR.
					</Text>
				</View>
				<Pressable
						onPress={() => {
							Linking.openURL(TERMS_URL).catch(() => {});
						}}
						style={(state) => [styles.legalLink, isFocused(state) && styles.focusRing]}
						accessibilityRole="link"
						accessibilityLabel="Leer los términos y condiciones y la política de privacidad"
					>
						<Text style={styles.legalLinkText}>Leer los términos y la política de privacidad</Text>
					</Pressable>
					{errors.terms ? <View style={styles.termsError}><FieldError message={errors.terms} /></View> : null}

			</ScrollView>
			<View style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}>
					<Pressable
						onPress={handleContinue}
						style={(state) => [styles.primaryButton, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel="Continuar"
					>
						<Text style={styles.primaryButtonText}>Continuar</Text>
						<Ionicons name="arrow-forward" size={16} color={colors.actionText} />
					</Pressable>

					<Pressable onPress={onGoToLogin} style={(state) => [styles.footerLinkWrap, isFocused(state) && styles.focusRing]} accessibilityRole="button" accessibilityLabel="¿Ya tenés cuenta? Iniciá sesión">
						<Text style={styles.footerText}>
							¿Ya tenés cuenta?{" "}
							<Text style={styles.footerLink}>Iniciá sesión</Text>
						</Text>
					</Pressable>
			</View>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	progressWrap: { backgroundColor: colors.navy },
	progressTrack: { height: 6, backgroundColor: colors.navyHairline, width: "100%" },
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "50%" },
	header: {
		paddingHorizontal: space.md,
		paddingTop: space.md,
		paddingBottom: 0,
		backgroundColor: colors.navy,
	},
	headerLine: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: space.sm,
	},
	headerLeft: { flexDirection: "row", alignItems: "center", gap: space.xs },
	backButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.subtitle,
	},
	stepLabel: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		lineHeight: typography.lineHeights.overline,
		paddingRight: space.xs,
	},
	container: {
		paddingHorizontal: space.xl,
		paddingTop: space.xxl,
		paddingBottom: space.xxl,
		backgroundColor: colors.background,
		flexGrow: 1,
	},
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
		lineHeight: typography.lineHeights.h1,
		marginBottom: space.xsPlus,
	},
	subtitle: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.bodyL,
		lineHeight: typography.lineHeights.bodyL,
		marginBottom: space.xl,
	},
	form: { gap: space.lg },
	referralToggle: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		minHeight: 44,
	},
	referralToggleCopy: { flex: 1, gap: 2 },
	referralToggleText: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
		lineHeight: typography.lineHeights.label,
	},
	referralToggleHint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	checkboxTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -space.smPlus },
	checkboxRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		marginTop: space.lg,
		minHeight: 44,
	},
	// Border from a token, not a fixed rgba: the old black-at-18% one
	// disappeared on the dark surface. mutedText2 clears 3:1 in both themes.
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: radii.sm / 2,
		borderWidth: 1.5,
		borderColor: colors.mutedText2,
		backgroundColor: colors.card,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	checkboxError: { borderColor: colors.danger },
	checkboxText: {
		flex: 1,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.body,
	},
	termsError: { marginTop: space.xs },
		legalLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
		legalLinkText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
			textDecorationLine: "underline",
		},
		focusRing: {
			outlineWidth: 2,
			outlineColor: colors.actionFill,
			outlineOffset: 2,
			outlineStyle: "solid",
		},
	footer: {
		paddingHorizontal: space.xl,
		paddingTop: space.md,
		backgroundColor: colors.background,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	primaryButton: {
		backgroundColor: colors.actionFill,
		height: 52,
		borderRadius: radii.sm + 2,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: space.sm,
	},
	primaryButtonText: {
			color: colors.actionText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.label,
	},
	footerLinkWrap: { marginTop: space.lg, alignItems: "center", justifyContent: "center", minHeight: 44 },
	footerText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	footerLink: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		textDecorationLine: "underline",
	},
	});
}
