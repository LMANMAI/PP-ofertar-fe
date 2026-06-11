import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { InputField } from "../components";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "../theme/designSystem";

type Props = {
	onNext: () => void;
	onBack: () => void;
};

export default function RegisterStep1({ onNext, onBack }: Props) {
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
							<Text style={styles.backText}>←</Text>
						</Pressable>
						<Text style={styles.headerTitle}>Registrarse</Text>
					</View>
					<Text style={styles.stepLabel}>Paso 1 de 2</Text>
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

				<Pressable
					onPress={() => setAccepted(!accepted)}
					style={styles.checkboxRow}
				>
					<View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
					<Text style={styles.checkboxText}>
						Acepto los Términos y condiciones y la Política de privacidad de
						OfertAR.
					</Text>
				</Pressable>

				<Pressable onPress={onNext} style={styles.primaryButton}>
					<Text style={styles.primaryButtonText}>Continuar →</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	progressWrap: { backgroundColor: colors.navy },
	progressTrack: { height: 6, backgroundColor: colors.softCyan, width: "100%" },
	progressFill: { height: 6, backgroundColor: colors.cyan, width: "50%" },
	header: {
		paddingHorizontal: 16,
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
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
	backButton: { paddingVertical: 8, paddingRight: 4, paddingLeft: 0 },
	backText: { color: colors.buttonText, fontSize: 16 },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	stepLabel: { color: colors.cyan, fontSize: 11, lineHeight: 14 },
	container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
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
		marginBottom: 18,
	},
	label: { color: colors.mutedText, fontSize: 12, marginTop: 8 },
	input: {
		backgroundColor: colors.card,
		padding: 12,
		borderRadius: 8,
		marginTop: 6,
	},
	checkboxRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 12,
	},
	checkbox: {
		width: 18,
		height: 18,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.12)",
		backgroundColor: colors.card,
	},
	checkboxChecked: { backgroundColor: colors.cyan },
	checkboxText: { flex: 1, color: colors.defaultText, marginLeft: 8 },
	primaryButton: {
		marginTop: 18,
		backgroundColor: colors.navy,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
	},
});
