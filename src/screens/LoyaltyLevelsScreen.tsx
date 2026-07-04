import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type Level = {
	id: string;
	name: string;
	threshold: number;
	color: string;
	perks: string[];
};

const LEVELS: Level[] = [
	{ id: "bronze", name: "Bronce", threshold: 0, color: "#B45A14", perks: ["Acumulación básica", "Acceso a ofertas"] },
	{ id: "silver", name: "Plata", threshold: 1500, color: "#9CA3A8", perks: ["+25% en puntos", "Ofertas exclusivas", "Soporte prioritario"] },
	{ id: "gold", name: "Oro", threshold: 3000, color: "#F2B61D", perks: ["+50% en puntos", "Envíos gratis", "Eventos VIP"] },
	{ id: "platinum", name: "Platino", threshold: 6000, color: "#7DD4F5", perks: ["+100% en puntos", "Atención exclusiva", "Beneficios premium"] },
];

const CURRENT_PTS = 2430;

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function LoyaltyLevelsScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Niveles de fidelidad</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.currentCard}>
					<Text style={styles.currentLabel}>TU NIVEL ACTUAL</Text>
					<View style={styles.currentRow}>
						<Ionicons name="medal" size={28} color="#9CA3A8" />
						<View style={{ flex: 1 }}>
							<Text style={styles.currentName}>Nivel Plata</Text>
							<Text style={styles.currentPts}>{CURRENT_PTS.toLocaleString("es-AR")} pts</Text>
						</View>
					</View>
					<View style={styles.progressTrack}>
						<View style={[styles.progressFill, { width: `${Math.min(100, (CURRENT_PTS / 3000) * 100)}%` }]} />
					</View>
					<Text style={styles.progressHint}>
						Te faltan <Text style={styles.bold}>{(3000 - CURRENT_PTS).toLocaleString("es-AR")} pts</Text> para llegar a Oro
					</Text>
				</View>

				{LEVELS.map((l) => {
					const reached = CURRENT_PTS >= l.threshold;
					return (
						<View key={l.id} style={[styles.levelCard, reached && styles.levelCardReached]}>
							<View style={styles.levelHeader}>
								<View style={[styles.levelBadge, { backgroundColor: l.color + "22" }]}>
									<Ionicons name="medal-outline" size={20} color={l.color} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.levelName}>{l.name}</Text>
									<Text style={styles.levelThreshold}>
										{l.threshold === 0 ? "Sin mínimo" : `Desde ${l.threshold.toLocaleString("es-AR")} pts`}
									</Text>
								</View>
								{reached && (
									<View style={styles.reachedBadge}>
										<Ionicons name="checkmark" size={12} color="#22C55E" />
										<Text style={styles.reachedText}>Alcanzado</Text>
									</View>
								)}
							</View>
							{l.perks.map((p) => (
								<View key={p} style={styles.perkRow}>
									<Ionicons name="checkmark" size={14} color={colors.cyan} />
									<Text style={styles.perkText}>{p}</Text>
								</View>
							))}
						</View>
					);
				})}
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
	currentCard: { backgroundColor: colors.navy, borderRadius: 16, padding: 18, gap: 10 },
	currentLabel: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	currentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	currentName: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 20 },
	currentPts: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	progressTrack: { height: 6, backgroundColor: "#142954", borderRadius: 3, overflow: "hidden" },
	progressFill: { height: 6, backgroundColor: colors.cyan, borderRadius: 3 },
	progressHint: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 12 },
	bold: { color: colors.cyan, fontFamily: typography.family.medium },
	levelCard: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: "#E5E7EB" },
	levelCardReached: { borderColor: "#22C55E", borderWidth: 1.5 },
	levelHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
	levelBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
	levelName: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 15 },
	levelThreshold: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	reachedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E0F5EF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
	reachedText: { color: "#22C55E", fontFamily: typography.family.medium, fontSize: 11 },
	perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	perkText: { color: "#374151", fontFamily: typography.family.regular, fontSize: 13 },
});
