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
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField } from "../components";

type Props = { onComplete: () => void; onBack: () => void };

export function GoogleFirstTimeScreen({ onComplete, onBack }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [phone, setPhone] = useState("");
	const [dob, setDob] = useState("");
	const [accepted, setAccepted] = useState(false);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
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
					contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }}
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
						label="Teléfono (opcional)"
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
					/>
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
							{accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
						</View>
						<Text style={styles.checkText}>
							Acepto los Términos y la Política de privacidad de OfertAR.
						</Text>
					</Pressable>

					<Pressable
						style={[styles.cta, !accepted && { opacity: 0.5 }]}
						onPress={accepted ? onComplete : undefined}
						accessibilityRole="button"
						accessibilityState={{ disabled: !accepted }}
					>
						<Text style={styles.ctaText}>Crear cuenta</Text>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	googleAcc: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
	googleName: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	googleEmail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 22 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20, marginTop: -8 },
	checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 6 },
	check: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.18)", backgroundColor: colors.card, marginTop: 2, alignItems: "center", justifyContent: "center" },
	checkChecked: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	checkText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19 },
	cta: { marginTop: 8, backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	});
}
