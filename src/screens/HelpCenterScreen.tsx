import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Faq = { id: string; q: string; a: string };

const FAQS: Faq[] = [
	{ id: "1", q: "¿Cómo escaneo un ticket?", a: "Desde el botón central del bottom nav (ícono ticket). Apuntá la cámara al ticket completo y esperá la confirmación." },
	{ id: "2", q: "¿Cuántos puntos gano por ticket?", a: "Depende del monto y la tienda. Promedio: 1 punto por cada $20 de compra." },
	{ id: "3", q: "¿Mis datos están seguros?", a: "Sí. Usamos encriptación de nivel bancario y nunca compartimos tu información personal con terceros." },
	{ id: "4", q: "¿Cómo activo una oferta?", a: "Desde la pestaña Ofertas, tocá la oferta y luego 'Activar oferta'. Te damos un código para mostrar en caja." },
	{ id: "5", q: "¿Puedo cambiar mi nivel?", a: "Tu nivel sube automáticamente cuando alcanzás los puntos requeridos. Mirá 'Niveles de fidelidad' para ver los umbrales." },
];

type Props = { onBack: () => void };

export function HelpCenterScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState<string | null>(null);
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Centro de ayuda</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.searchBox}>
					<Ionicons name="search" size={16} color="#9CA3A8" />
					<Text style={styles.searchPlaceholder}>Buscar en ayuda</Text>
				</View>

				<Text style={styles.sectionLabel}>PREGUNTAS FRECUENTES</Text>
				<View style={styles.faqCard}>
					{FAQS.map((f, idx) => (
						<View key={f.id}>
							<Pressable
								style={styles.faqRow}
								onPress={() => setOpen(open === f.id ? null : f.id)}
							>
								<Text style={styles.faqQ}>{f.q}</Text>
								<Ionicons
									name={open === f.id ? "chevron-up" : "chevron-down"}
									size={18}
									color="#9CA3A8"
								/>
							</Pressable>
							{open === f.id && <Text style={styles.faqA}>{f.a}</Text>}
							{idx < FAQS.length - 1 && <View style={styles.divider} />}
						</View>
					))}
				</View>

				<Pressable style={styles.contactBtn}>
					<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.buttonText} />
					<Text style={styles.contactText}>Contactar soporte</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
	searchPlaceholder: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 14 },
	sectionLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 8 },
	faqCard: { backgroundColor: colors.card, borderRadius: 12, overflow: "hidden" },
	faqRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
	faqQ: { flex: 1, color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	faqA: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 14 },
	divider: { height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 16 },
	contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.navy, height: 48, borderRadius: 10 },
	contactText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
});
