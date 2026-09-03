import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";
import { POINTS_PER_REFERRAL } from "../data/rewards";

type Faq = { id: string; q: string; a: string };

const FAQS: Faq[] = [
	{ id: "1", q: "¿Cómo escaneo un ticket?", a: "Tocá el botón con el ícono de ticket en el centro de la barra inferior. Apuntá la cámara al ticket completo y esperá la confirmación." },
	{ id: "2", q: "¿Cómo gano puntos?", a: `Si te registrás usando el código de invitación de un amigo, ganás ${POINTS_PER_REFERRAL} puntos. Encontrá tu propio código para compartir en la pestaña Puntos.` },
	{ id: "3", q: "¿Mis datos están seguros?", a: "Guardamos lo mínimo necesario para que funcione tu cuenta y nunca compartimos tu información personal con terceros." },
	{ id: "4", q: "¿Cómo veo el detalle de una oferta?", a: "Desde la pestaña Ofertas, tocá cualquier oferta para ver en qué sucursales aplica, hasta cuándo dura y las condiciones." },
	{ id: "5", q: "¿Para qué sirven los puntos por referidos?", a: "Se canjean por descuentos en tu próxima suscripción a OfertAR, o incluso un mes gratis. Mirá los canjes disponibles en la pestaña Puntos." },
];

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function HelpCenterScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [open, setOpen] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	const filteredFaqs = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return FAQS;
		return FAQS.filter(
			(f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
		);
	}, [query]);

	const handleContactSupport = () => {
		Linking.openURL("mailto:soporte@ofertar.app?subject=Consulta%20desde%20la%20app");
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Centro de ayuda</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.searchBox}>
					<Ionicons name="search" size={16} color={colors.subtleText} />
					<TextInput
						style={styles.searchInput}
						value={query}
						onChangeText={setQuery}
						placeholder="Buscar en ayuda"
						placeholderTextColor={colors.subtleText}
						accessibilityLabel="Buscar en ayuda"
					/>
					{query.length > 0 && (
						<Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
							<Ionicons name="close-circle" size={16} color={colors.subtleText} />
						</Pressable>
					)}
				</View>

				<Text style={styles.sectionLabel}>PREGUNTAS FRECUENTES</Text>
				{filteredFaqs.length === 0 ? (
					<View style={styles.emptyWrap}>
						<Text style={styles.emptyText}>
							No encontramos resultados para &quot;{query}&quot;.
						</Text>
					</View>
				) : (
					<View style={styles.faqCard}>
						{filteredFaqs.map((f, idx) => (
							<View key={f.id}>
								<Pressable
									style={styles.faqRow}
									onPress={() => setOpen(open === f.id ? null : f.id)}
								>
									<Text style={styles.faqQ}>{f.q}</Text>
									<Ionicons
										name={open === f.id ? "chevron-up" : "chevron-down"}
										size={18}
										color={colors.subtleText}
									/>
								</Pressable>
								{open === f.id && <Text style={styles.faqA}>{f.a}</Text>}
								{idx < filteredFaqs.length - 1 && <View style={styles.divider} />}
							</View>
						))}
					</View>
				)}

				<Pressable style={styles.contactBtn} onPress={handleContactSupport}>
					<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.buttonText} />
					<Text style={styles.contactText}>Contactar soporte</Text>
				</Pressable>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
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
	searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.divider },
	searchInput: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: 14, padding: 0 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 8 },
	emptyWrap: { backgroundColor: colors.card, borderRadius: 12, padding: 20, alignItems: "center" },
	emptyText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, textAlign: "center" },
	faqCard: { backgroundColor: colors.card, borderRadius: 12, overflow: "hidden" },
	faqRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
	faqQ: { flex: 1, color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	faqA: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 14 },
	divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 16 },
	contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.navy, height: 48, borderRadius: 10 },
	contactText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
});
