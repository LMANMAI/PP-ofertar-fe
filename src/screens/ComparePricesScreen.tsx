import { useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type Store = {
	id: string;
	code: string;
	color: string;
	name: string;
	price: string;
	rank: string;
	rawPrice: number;
	delta: string | null;
	deltaTone: "good" | "bad" | null;
	best?: boolean;
};

const STORES: Store[] = [
	{ id: "dia", code: "DI", color: "#0D80CC", name: "Día", price: "$2.010", rawPrice: 2010, rank: "🥇 Más barato", delta: "-18%", deltaTone: "good", best: true },
	{ id: "coto", code: "CO", color: "#CC1A1A", name: "Coto", price: "$2.450", rawPrice: 2450, rank: "2°  $2.450", delta: null, deltaTone: null },
	{ id: "carrefour", code: "CA", color: "#0059A6", name: "Carrefour", price: "$2.580", rawPrice: 2580, rank: "3°  $2.580", delta: "+5%", deltaTone: "bad" },
	{ id: "jumbo", code: "JU", color: "#00804D", name: "Jumbo", price: "$2.640", rawPrice: 2640, rank: "4°  $2.640", delta: "+8%", deltaTone: "bad" },
	{ id: "vea", code: "VE", color: "#990000", name: "Vea", price: "$2.720", rawPrice: 2720, rank: "5°  $2.720", delta: "+11%", deltaTone: "bad" },
];

const FILTERS = ["Cerca tuyo", "Precio", "Disponibilidad", "Marca"] as const;

type Props = {
	productName?: string;
	productBrand?: string;
	lastPrice?: string;
	onBack: () => void;
	onSelectStore: (storeId: string) => void;
	onSave?: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function ComparePricesScreen({
	productName = "Aceite Natura girasol 1.5L",
	productBrand = "NATURA",
	lastPrice = "Último precio: $2.450",
	onBack,
	onSelectStore,
	onSave,
	activeTab,
	onSelectTab,
	onScanPress,
}: Props) {
	const insets = useSafeAreaInsets();
	const [filter, setFilter] = useState<string>("Precio");
	const [saved, setSaved] = useState(false);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Comparar</Text>
				<Pressable onPress={() => setSaved((s) => !s)} style={styles.favButton}>
					<Ionicons
						name={saved ? "heart" : "heart-outline"}
						size={22}
						color={saved ? "#EF4444" : colors.cyan}
					/>
				</Pressable>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 20 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.productCard}>
					<View style={styles.productThumb}>
						<Ionicons name="cube-outline" size={28} color="#9CA3A8" />
					</View>
					<View style={{ flex: 1, gap: 4 }}>
						<Text style={styles.productBrand}>{productBrand}</Text>
						<Text style={styles.productName}>{productName}</Text>
						<Text style={styles.productLastPrice}>{lastPrice}</Text>
					</View>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filtersRow}
				>
					{FILTERS.map((f) => {
						const active = f === filter;
						return (
							<Pressable
								key={f}
								onPress={() => setFilter(f)}
								style={[styles.filterChip, active && styles.filterChipActive]}
							>
								<Text
									style={[
										styles.filterChipText,
										active && styles.filterChipTextActive,
									]}
								>
									{f}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>

				<Text style={styles.sectionLabel}>ORDENADO POR PRECIO ↑</Text>

				{STORES.map((s) => (
					<Pressable
						key={s.id}
						onPress={() => onSelectStore(s.id)}
						style={[styles.storeRow, s.best && styles.storeRowBest]}
					>
						<View style={styles.storeLeft}>
							<View style={[styles.storeBadge, { backgroundColor: s.color }]}>
								<Text style={styles.storeBadgeText}>{s.code}</Text>
							</View>
							<View style={{ gap: 3 }}>
								<Text style={styles.storeName}>{s.name}</Text>
								<View style={styles.storeMetaRow}>
									<Ionicons name="location-sharp" size={11} color="#9CA3A8" />
									<Text
										style={[
											styles.storeMetaText,
											s.deltaTone === "bad" && s.id === "vea" && { color: "#EF4444" },
											s.best && styles.storeMetaTextBest,
										]}
									>
										{s.rank}
									</Text>
								</View>
								{s.best && (
									<View style={styles.bestChip}>
										<Text style={styles.bestChipText}>Mejor precio</Text>
									</View>
								)}
							</View>
						</View>
						<View style={styles.storeRight}>
							<Text style={styles.storePrice}>{s.price}</Text>
							{s.delta && (
								<Text
									style={[
										styles.storeDelta,
										s.deltaTone === "good"
											? styles.storeDeltaGood
											: styles.storeDeltaBad,
									]}
								>
									{s.delta}
								</Text>
							)}
						</View>
					</Pressable>
				))}

				<View style={styles.summaryRow}>
					<View style={styles.summaryCard}>
						<Text style={styles.summaryLabel}>PRECIO PROMEDIO</Text>
						<Text style={styles.summaryValue}>$2.480</Text>
					</View>
					<View style={styles.summaryCard}>
						<Text style={styles.summaryLabel}>AHORRO VS. MÁS CARO</Text>
						<Text style={[styles.summaryValue, { color: "#1D9E75" }]}>26%</Text>
						<Text style={styles.summaryHint}>↓ -$710 vs Vea</Text>
					</View>
				</View>

				<Pressable
					style={styles.saveButton}
					onPress={() => {
						setSaved(true);
						onSave?.();
					}}
				>
					<Text style={styles.saveButtonText}>{saved ? "Guardado ✓" : "Guardar"}</Text>
				</Pressable>
				<Pressable style={styles.cancelButton} onPress={onBack}>
					<Text style={styles.cancelButtonText}>Cancelar</Text>
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
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	favButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 12 },
	productCard: {
		backgroundColor: colors.card,
		borderRadius: 16,
		padding: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	productThumb: {
		width: 58,
		height: 58,
		borderRadius: 10,
		backgroundColor: colors.background,
		alignItems: "center",
		justifyContent: "center",
	},
	productBrand: {
		color: "#9CA3A8",
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1,
	},
	productName: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
	productLastPrice: {
		color: "#6B7280",
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	filtersRow: { gap: 8, paddingRight: 16 },
	filterChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	filterChipText: {
		color: "#6B7280",
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.3,
	},
	filterChipTextActive: { color: colors.buttonText },
	sectionLabel: {
		color: "#9CA3A8",
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1.2,
		marginTop: 4,
	},
	storeRow: {
		backgroundColor: colors.card,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	storeRowBest: { borderColor: "#1D9E75", borderWidth: 1.5 },
	storeLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
	storeBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	storeBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 12,
	},
	storeName: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	storeMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	storeMetaText: {
		color: "#9CA3A8",
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	storeMetaTextBest: { color: "#22C55E" },
	bestChip: {
		alignSelf: "flex-start",
		backgroundColor: "#E0F5EF",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 4,
	},
	bestChipText: {
		color: "#1D9E75",
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.3,
	},
	storeRight: { alignItems: "flex-end", gap: 3 },
	storePrice: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	storeDelta: { fontFamily: typography.family.medium, fontSize: 12 },
	storeDeltaGood: { color: "#1D9E75" },
	storeDeltaBad: { color: "#EF4444" },
	summaryRow: { flexDirection: "row", gap: 12, marginTop: 4 },
	summaryCard: {
		flex: 1,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 12,
		padding: 14,
		gap: 4,
	},
	summaryLabel: {
		color: "#9CA3A8",
		fontFamily: typography.family.medium,
		fontSize: 9,
		letterSpacing: 0.8,
	},
	summaryValue: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 22,
	},
	summaryHint: {
		color: "#1D9E75",
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	saveButton: {
		marginTop: 12,
		backgroundColor: colors.navy,
		height: 48,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	saveButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
	cancelButton: {
		borderWidth: 2,
		borderColor: "#1D3557",
		height: 48,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.card,
	},
	cancelButtonText: {
		color: "#1D3557",
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
});
