import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InputField } from "../components";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "../theme/designSystem";

type Props = {
	onNext: () => void;
	onBack: () => void;
	onGoToLogin?: () => void;
};

export default function RegisterStep1({ onNext, onBack, onGoToLogin }: Props) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [accepted, setAccepted] = useState(false);

	if (!fontsLoaded) return null;

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top }]}>
			<StatusBar style="light" />

			<View style={styles.header}>
				<View style={styles.headerLine}>
					<View style={styles.headerLeft}>
						<Pressable onPress={onBack} style={styles.backButton}>
							<Ionicons name="chevron-back" size={20} color={colors.buttonText} />
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 1 de 3</Text>
				</View>
			</View>
			<View style={styles.progressWrap}>
				<View style={styles.progressTrack}>
					<View style={styles.progressFill} />
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.title}>Creá tu cuenta</Text>
				<Text style={styles.subtitle}>
					Completá tus datos para empezar a ahorrar.
				</Text>

				<View style={styles.form}>
					<InputField
						label="Nombre"
						leftIcon=""
						value={firstName}
						onChangeText={setFirstName}
					/>
					<InputField
						label="Apellido"
						leftIcon=""
						value={lastName}
						onChangeText={setLastName}
					/>
					<InputField
						label="Correo electrónico"
						leftIcon=""
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
					/>
					<InputField
						label="Teléfono (opcional)"
						leftIcon=""
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
					/>
				</View>

				<Pressable
					onPress={() => setAccepted(!accepted)}
					style={styles.checkboxRow}
				>
					<View
						style={[styles.checkbox, accepted && styles.checkboxChecked]}
					>
						{accepted && (
							<Ionicons name="checkmark" size={14} color={colors.buttonText} />
						)}
					</View>
					<Text style={styles.checkboxText}>
						Acepto los Términos y condiciones y la Política de privacidad de
						OfertAR.
					</Text>
				</Pressable>

				<Pressable onPress={onNext} style={styles.primaryButton}>
					<Text style={styles.primaryButtonText}>Continuar</Text>
					<Ionicons name="arrow-forward" size={16} color={colors.buttonText} />
				</Pressable>

				<Pressable onPress={onGoToLogin} style={styles.footerLinkWrap}>
					<Text style={styles.footerText}>
						¿Ya tenés cuenta?{" "}
						<Text style={styles.footerLink}>Iniciá sesión</Text>
					</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	progressWrap: { backgroundColor: colors.navy },
	progressTrack: { height: 6, backgroundColor: colors.softCyan, width: "100%" },
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "33%" },
	header: {
		paddingHorizontal: 12,
		paddingTop: 12,
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
	container: {
		paddingHorizontal: 20,
		paddingTop: 24,
		paddingBottom: 24,
		backgroundColor: colors.background,
		flexGrow: 1,
	},
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 28,
		lineHeight: 36,
		marginBottom: 6,
	},
	subtitle: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 17,
		lineHeight: 26,
		marginBottom: 22,
	},
	form: { gap: 16 },
	checkboxRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		marginTop: 18,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.18)",
		backgroundColor: colors.card,
		marginTop: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	checkboxText: {
		flex: 1,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 19,
	},
	primaryButton: {
		marginTop: 22,
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		lineHeight: 18,
	},
	footerLinkWrap: { marginTop: 18, alignItems: "center" },
	footerText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
	},
	footerLink: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		textDecorationLine: "underline",
	},
});
