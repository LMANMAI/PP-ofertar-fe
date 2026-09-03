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

type Props = { onBack: () => void; onSubmit: () => void };

export function PasswordRecoveryScreen({ onBack, onSubmit }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [email, setEmail] = useState("");
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.iconCircle}>
						<Ionicons name="lock-closed-outline" size={36} color={colors.cyan} />
					</View>
					<Text style={styles.title}>Recuperá tu contraseña</Text>
					<Text style={styles.body}>
						Ingresá tu correo y te enviamos un enlace para que la cambies.
					</Text>

					<View style={{ marginTop: 18, width: "100%" }}>
						<InputField
							label="Correo electrónico"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
					</View>

					<Pressable
						style={[styles.cta, email.length === 0 && { opacity: 0.5 }]}
						onPress={email.length > 0 ? onSubmit : undefined}
						accessibilityRole="button"
						accessibilityState={{ disabled: email.length === 0 }}
					>
						<Text style={styles.ctaText}>Enviar enlace</Text>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, height: 56, paddingHorizontal: 12, justifyContent: "center" },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	content: { flex: 1, padding: 24, alignItems: "center" },
	iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center", marginTop: 24 },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 24, textAlign: "center", marginTop: 16 },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center", lineHeight: 20, marginTop: 8 },
	cta: { marginTop: 18, backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", width: "100%" },
	ctaText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	});
}
