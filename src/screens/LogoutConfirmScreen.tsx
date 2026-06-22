import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = { onCancel: () => void; onConfirm: () => void };

export function LogoutConfirmScreen({ onCancel, onConfirm }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.backdrop, { paddingTop: insets.top }]}>
			<StatusBar style="light" translucent />
			<View style={styles.sheet}>
				<View style={styles.iconCircle}>
					<Ionicons name="log-out-outline" size={28} color="#EF4444" />
				</View>
				<Text style={styles.title}>¿Cerrar sesión?</Text>
				<Text style={styles.subtitle}>
					Vas a tener que volver a ingresar tu correo y contraseña para acceder.
				</Text>

				<Pressable style={styles.confirmBtn} onPress={onConfirm}>
					<Text style={styles.confirmText}>Sí, cerrar sesión</Text>
				</Pressable>
				<Pressable style={styles.cancelBtn} onPress={onCancel}>
					<Text style={styles.cancelText}>Cancelar</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(10,31,68,0.7)", justifyContent: "center", paddingHorizontal: 24 },
	sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 22, gap: 10, alignItems: "stretch" },
	iconCircle: { alignSelf: "center", width: 60, height: 60, borderRadius: 30, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
	title: { textAlign: "center", color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, marginTop: 4 },
	subtitle: { textAlign: "center", color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	confirmBtn: { backgroundColor: "#EF4444", height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 12 },
	confirmText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 15 },
	cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
	cancelText: { color: "#6B7280", fontFamily: typography.family.medium, fontSize: 14 },
});
