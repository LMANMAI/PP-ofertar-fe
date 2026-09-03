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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, ScreenHeader } from "../components";

type Props = { onBack: () => void; onSuccess: () => void };

export function ChangePasswordScreen({ onBack, onSuccess }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [pw, setPw] = useState("");
	const [pw2, setPw2] = useState("");

	const checks = useMemo(() => ({
		min: pw.length >= 8,
		upper: /[A-Z]/.test(pw),
		num: /[0-9]/.test(pw),
		special: /[^A-Za-z0-9]/.test(pw),
		match: pw.length > 0 && pw === pw2,
	}), [pw, pw2]);
	const canSubmit = checks.min && checks.upper && checks.num && checks.special && checks.match;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Nueva contraseña" onBack={onBack} />

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ScrollView
					contentContainerStyle={{ padding: space.xxl, gap: 14, paddingBottom: insets.bottom + 24 }}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.title}>Elegí una contraseña nueva</Text>
					<Text style={styles.body}>
						Usá al menos 8 caracteres, una mayúscula, un número y un carácter especial.
					</Text>

					<InputField label="Nueva contraseña" value={pw} onChangeText={setPw} secureTextEntry showPasswordToggle />
					<InputField label="Repetí contraseña" value={pw2} onChangeText={setPw2} secureTextEntry showPasswordToggle />

					<View style={styles.checks}>
						{[
							{ ok: checks.min, t: "Mínimo 8 caracteres" },
							{ ok: checks.upper, t: "Una letra mayúscula" },
							{ ok: checks.num, t: "Un número" },
							{ ok: checks.special, t: "Un carácter especial" },
							{ ok: checks.match, t: "Las contraseñas coinciden" },
						].map((c) => (
							<View key={c.t} style={styles.checkRow}>
								<Ionicons
									name={c.ok ? "checkmark-circle" : "ellipse-outline"}
									size={14}
									color={c.ok ? colors.cyan : colors.subtleText}
								/>
								<Text style={[styles.checkText, c.ok && { color: colors.defaultText }]}>{c.t}</Text>
							</View>
						))}
					</View>

					<Pressable
						onPress={canSubmit ? onSuccess : undefined}
						style={[styles.cta, !canSubmit && { opacity: 0.5 }]}
						accessibilityRole="button"
						accessibilityState={{ disabled: !canSubmit }}
					>
						<Text style={styles.ctaText}>Cambiar contraseña</Text>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 22 },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20 },
	checks: { gap: 6, marginTop: 6 },
	checkRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
	checkText: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 12 },
	cta: { marginTop: 18, backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	});
}
