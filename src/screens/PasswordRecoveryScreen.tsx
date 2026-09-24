import { useMemo, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { InputField, InlineNotice, PrimaryButton } from "../components";
import { PASSWORD_RECOVERY_ENABLED } from "../constants/features";
import { friendlyAuthError, requestPasswordReset } from "../services/authApi";

type Props = { onBack: () => void; onSent: (email: string) => void };

// Only catches typos before the round trip; the backend is the authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function PasswordRecoveryScreen({ onBack, onSent }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState<string | undefined>();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		if (loading) return;
		const trimmed = email.trim();
		if (!EMAIL_PATTERN.test(trimmed)) {
			setEmailError(trimmed ? "Revisá el correo: tiene que ser algo como nombre@correo.com" : "Ingresá tu correo electrónico");
			return;
		}
		setError(null);
		setLoading(true);
		try {
			await requestPasswordReset(trimmed);
			onSent(trimmed);
		} catch (err) {
			setError(friendlyAuthError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />
			<View style={styles.header}>
				<Pressable
					onPress={loading ? undefined : onBack}
					style={(state) => [styles.backButton, isFocused(state) && styles.focusRing]}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Volver"
					accessibilityState={{ disabled: loading }}
				>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={0}
			>
				<ScrollView
					contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					<Text style={styles.title} accessibilityRole="header">Recuperá tu contraseña</Text>
					{!PASSWORD_RECOVERY_ENABLED ? (
						<>
							<View style={styles.soonBox} accessibilityRole="alert">
								<Ionicons name="time-outline" size={18} color={colors.infoSoftText} />
								<View style={styles.soonCopy}>
									<Text style={styles.soonTitle}>Disponible próximamente</Text>
									<Text style={styles.soonText}>
										Muy pronto vas a poder recuperar tu contraseña desde acá. Todavía no está disponible.
									</Text>
								</View>
							</View>
							<PrimaryButton label="Volver a iniciar sesión" onPress={onBack} style={styles.cta} />
						</>
					) : (
					<>
					<Text style={styles.subtitle}>
						Ingresá tu correo y, si tiene una cuenta, te enviamos un código de 6 dígitos para cambiarla.
					</Text>

					<View style={styles.form}>
						<InputField
							label="Correo electrónico"
							value={email}
							onChangeText={(t) => {
								setEmail(t);
								setEmailError(undefined);
							}}
							error={emailError}
							editable={!loading}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
							autoComplete="email"
							textContentType="emailAddress"
							returnKeyType="done"
							onSubmitEditing={handleSubmit}
						/>
					</View>

					{error && (
						<InlineNotice message={error} style={styles.errorBox} />
					)}

					<PrimaryButton label="Enviar código" onPress={handleSubmit} loading={loading} style={styles.cta} />
					</>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.card },
		statusBarBg: { backgroundColor: colors.navy },
		header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: space.md, justifyContent: "center" },
		backButton: { width: 32, height: 32, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
		content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.xxl },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.h1,
			lineHeight: typography.lineHeights.h1,
		},
		subtitle: {
			marginTop: space.xs,
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.bodyL,
			lineHeight: typography.lineHeights.bodyL,
		},
		form: { marginTop: space.xxl },
		errorBox: { marginTop: space.md },
		cta: { marginTop: space.lg },
		soonBox: {
			marginTop: space.xl,
			padding: space.md,
			borderRadius: radii.button,
			backgroundColor: colors.infoSoft,
			flexDirection: "row",
			alignItems: "flex-start",
			gap: space.sm,
		},
		soonCopy: { flex: 1, gap: 2 },
		soonTitle: {
			color: colors.infoSoftText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		soonText: {
			color: colors.infoSoftText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
	});
}
