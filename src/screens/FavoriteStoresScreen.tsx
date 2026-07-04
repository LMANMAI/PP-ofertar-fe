import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type Store = { id: string; code: string; color: string; name: string; address: string; distance: string };

const STORES: Store[] = [
	{ id: "dia", code: "DI", color: "#0D80CC", name: "Día — Av. Corrientes 1234", address: "Recoleta", distance: "0.6 km" },
	{ id: "coto", code: "CO", color: "#CC1A1A", name: "Coto — Av. Cabildo 4500", address: "Belgrano", distance: "1.1 km" },
	{ id: "carrefour", code: "CA", color: "#0059A6", name: "Carrefour — Maipú 800", address: "Vicente López", distance: "1.2 km" },
	{ id: "jumbo", code: "JU", color: "#008040", name: "Jumbo — Pueyrredón 200", address: "Recoleta", distance: "2.1 km" },
	{ id: "vea", code: "VE", color: "#990000", name: "Vea — Las Heras 2900", address: "Recoleta", distance: "1.8 km" },
];

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function FavoriteStoresScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [favs, setFavs] = useState<Set<string>>(new Set(["dia", "coto"]));
	const toggle = (id: string) => {
		setFavs((prev) => {
			const n = new Set(prev);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Mis tiendas favoritas</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 24 }}>
				<Text style={styles.hint}>
					Las tiendas favoritas aparecen primero cuando comparás precios.
				</Text>

				{STORES.map((s) => {
					const isFav = favs.has(s.id);
					return (
						<Pressable key={s.id} style={styles.row} onPress={() => toggle(s.id)}>
							<View style={[styles.badge, { backgroundColor: s.color }]}>
								<Text style={styles.badgeText}>{s.code}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.name}>{s.name}</Text>
								<Text style={styles.meta}>{s.address} · {s.distance}</Text>
							</View>
							<Ionicons
								name={isFav ? "heart" : "heart-outline"}
								size={22}
								color={isFav ? "#EF4444" : "#9CA3A8"}
							/>
						</Pressable>
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
	hint: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 13, marginBottom: 4 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
	badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	badgeText: { color: "#fff", fontFamily: typography.family.bold, fontSize: 12 },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	meta: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
});
