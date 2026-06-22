import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { InputField } from "../components";
import type { MockSession } from "../auth/mockAuth";

type Props = { session: MockSession; onBack: () => void };

export function PersonalDataScreen({ session, onBack }: Props) {
	const insets = useSafeAreaInsets();
	const [first, setFirst] = useState(session.firstName);
	const [last, setLast] = useState(session.lastName);
	const [email] = useState(session.email);
	const [phone, setPhone] = useState("+54 11 5555 1234");
	const [dob, setDob] = useState("12/03/1992");

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Datos personales</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 100 }}>
				<View style={styles.avatarRow}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{session.initials}</Text>
					</View>
					<Pressable style={styles.avatarEdit}>
						<Ionicons name="camera-outline" size={14} color={colors.navy} />
						<Text style={styles.avatarEditText}>Cambiar foto</Text>
					</Pressable>
				</View>

				<InputField label="Nombre" leftIcon="" value={first} onChangeText={setFirst} />
				<InputField label="Apellido" leftIcon="" value={last} onChangeText={setLast} />
				<InputField label="Correo electrónico" leftIcon="" value={email} onChangeText={() => {}} />
				<InputField label="Teléfono" leftIcon="" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
				<InputField label="Fecha de nacimiento" leftIcon="" value={dob} onChangeText={setDob} />
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
				<Pressable style={styles.saveBtn} onPress={onBack}>
					<Text style={styles.saveText}>Guardar cambios</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	avatarRow: { alignItems: "center", gap: 10, paddingVertical: 12 },
	avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 26 },
	avatarEdit: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F6FC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
	avatarEditText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
	saveBtn: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	saveText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
});
