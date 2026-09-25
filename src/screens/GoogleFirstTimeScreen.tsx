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
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";
import { InputField, LegalLink, PrimaryButton } from "../components";

type Props = { onComplete: () => void; onBack: () => void };

export function GoogleFirstTimeScreen({ onComplete, onBack }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [dob, setDob] = useState("");
	const [accepted, setAccepted] = useState(false);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Completá tu perfil</Text>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ScrollView
					contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: insets.bottom + 24 }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.googleAcc}>
						<Ionicons name="logo-google" size={20} color="#4285F4" />
						<View style={{ flex: 1 }}>
							<Text style={styles.googleName}>Martina Álvarez</Text>
							<Text style={styles.googleEmail}>martina.a@gmail.com</Text>
						</View>
						<Ionicons name="checkmark-circle" size={20} color={colors.success} />
					</View>

					<Text style={styles.title}>Casi listo</Text>
					<Text style={styles.subtitle}>
						Completá unos datos más para personalizar tu experiencia.
					</Text>

					<InputField
						label="Fecha de nacimiento"
						value={dob}
						onChangeText={setDob}
					/>

					<Pressable
						onPress={() => setAccepted(!accepted)}
						style={styles.checkRow}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: accepted }}
					>
						<View style={[styles.check, accepted && styles.checkChecked]}>
							{accepted && <Ionicons name="checkmark" size={14} color={colors.buttonText} />}
						</View>
						<Text style={styles.checkText}>
							Acepto los <LegalLink>Términos y la Política de privacidad</LegalLink> de OfertAR.
						</Text>
					</Pressable>

					<PrimaryButton label="Crear cuenta" onPress={onComplete} disabled={!accepted} style={styles.cta} />
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: space.md, height: 56, flexDirection: "row", alignItems: "center", gap: space.sm },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: typography.sizes.bodyL },
	googleAcc: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.card, padding: space.mdPlus, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider },
	googleName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.label },
	googleEmail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, marginTop: 2 },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.h2 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.label, lineHeight: 20, marginTop: -8 },
	checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space.smPlus, marginTop: space.xsPlus },
	check: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.18)", backgroundColor: colors.card, marginTop: 2, alignItems: "center", justifyContent: "center" },
	checkChecked: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	checkText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: 19 },
	cta: { marginTop: space.sm },
	});
}
