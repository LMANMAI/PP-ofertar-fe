import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = { name?: string; onStart: () => void };

export function AccountCreatedScreen({ name = "Martina", onStart }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.safeArea, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
			<StatusBar style="dark" translucent />
			<View style={styles.content}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={48} color="#22C55E" />
				</View>
				<Text style={styles.title}>¡Bienvenida, {name}!</Text>
				<Text style={styles.body}>
					Tu cuenta se creó con éxito. Empezá a escanear tickets y ahorrar.
				</Text>

				<View style={styles.statsCard}>
					<View style={styles.stat}>
						<Text style={styles.statValue}>+100</Text>
						<Text style={styles.statLabel}>pts bonus de bienvenida</Text>
					</View>
				</View>
			</View>

			<Pressable style={styles.primaryBtn} onPress={onStart}>
				<Text style={styles.primaryText}>Empezar a ahorrar</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
	checkCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#22C55E", alignItems: "center", justifyContent: "center" },
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 26, textAlign: "center", marginTop: 12 },
	body: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 15, textAlign: "center", lineHeight: 22 },
	statsCard: { marginTop: 18, backgroundColor: "#E8F6FC", borderRadius: 14, padding: 18, alignItems: "center" },
	stat: { alignItems: "center", gap: 4 },
	statValue: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 32 },
	statLabel: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	primaryBtn: { backgroundColor: colors.navy, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	primaryText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
});
