import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type IonName = ComponentProps<typeof Ionicons>["name"];

type Entry = {
	id: string;
	icon: IonName;
	iconColor: string;
	bg: string;
	title: string;
	date: string;
	pts: string;
	tone: "green" | "red";
};

const ENTRIES: Entry[] = [
	{ id: "1", icon: "receipt-outline", iconColor: "#22C55E", bg: "#E0F5EF", title: "Ticket Coto · Av. Cabildo", date: "12 may · 18:42", pts: "+85", tone: "green" },
	{ id: "2", icon: "gift-outline", iconColor: "#EF4444", bg: "#FEE2E2", title: "Canje: $500 en compras Día", date: "8 may · 14:15", pts: "-1.000", tone: "red" },
	{ id: "3", icon: "receipt-outline", iconColor: "#22C55E", bg: "#E0F5EF", title: "Ticket Carrefour · Maipú", date: "6 may · 11:08", pts: "+120", tone: "green" },
	{ id: "4", icon: "trophy-outline", iconColor: "#22C55E", bg: "#E0F5EF", title: "Bonus subir a Nivel Plata", date: "1 may · 09:00", pts: "+500", tone: "green" },
	{ id: "5", icon: "receipt-outline", iconColor: "#22C55E", bg: "#E0F5EF", title: "Ticket Día · Av. Corrientes", date: "29 abr · 19:24", pts: "+72", tone: "green" },
];

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function PointsHistoryScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Historial de puntos</Text>
			</View>
			<ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.summary}>
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>SUMADOS</Text>
						<Text style={[styles.summaryValue, { color: "#22C55E" }]}>+777 pts</Text>
					</View>
					<View style={styles.summaryDivider} />
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>USADOS</Text>
						<Text style={[styles.summaryValue, { color: "#EF4444" }]}>-1.000 pts</Text>
					</View>
				</View>

				<View style={styles.list}>
					{ENTRIES.map((e, idx) => (
						<View key={e.id}>
							<View style={styles.row}>
								<View style={[styles.iconWrap, { backgroundColor: e.bg }]}>
									<Ionicons name={e.icon} size={18} color={e.iconColor} />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.rowTitle}>{e.title}</Text>
									<Text style={styles.rowDate}>{e.date}</Text>
								</View>
								<Text style={[styles.pts, e.tone === "green" ? styles.ptsGreen : styles.ptsRed]}>
									{e.pts}
								</Text>
							</View>
							{idx < ENTRIES.length - 1 && <View style={styles.divider} />}
						</View>
					))}
				</View>
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
	summary: { backgroundColor: colors.card, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" },
	summaryItem: { flex: 1, alignItems: "center", gap: 4 },
	summaryDivider: { width: 1, height: 32, backgroundColor: "#E5E7EB" },
	summaryLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	summaryValue: { fontFamily: typography.family.bold, fontSize: 16 },
	list: { backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
	iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	rowTitle: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	rowDate: { color: "#9CA3A8", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	pts: { fontFamily: typography.family.bold, fontSize: 14 },
	ptsGreen: { color: "#22C55E" },
	ptsRed: { color: "#EF4444" },
	divider: { height: 1, backgroundColor: "#E5E7EB", marginLeft: 62 },
});
