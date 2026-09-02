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
import type { ComponentProps } from "react";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type IonName = ComponentProps<typeof Ionicons>["name"];

type Props = {
	storeId?: string;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

type StoreInfo = {
	code: string;
	color: string;
	name: string;
	address: string;
	distance: string;
	product: string;
	price: string;
	priceDelta: string;
	isBest: boolean;
};

const STORES: Record<string, StoreInfo> = {
	dia: {
		code: "DI", color: "#0D80CC", name: "Día — Av. Corrientes 1234",
		address: "Av. Corrientes 1234", distance: "0.6 km de vos",
		product: "Aceite Natura girasol 1.5L", price: "$2.010", priceDelta: "−18% vs Vea", isBest: true,
	},
	coto: {
		code: "CO", color: "#CC1A1A", name: "Coto — Av. Cabildo 4500",
		address: "Av. Cabildo 4500", distance: "1.1 km de vos",
		product: "Aceite Natura girasol 1.5L", price: "$2.450", priceDelta: "Precio promedio", isBest: false,
	},
	carrefour: {
		code: "CA", color: "#0059A6", name: "Carrefour — Maipú 800",
		address: "Maipú 800", distance: "1.2 km de vos",
		product: "Aceite Natura girasol 1.5L", price: "$2.580", priceDelta: "+5% vs mejor", isBest: false,
	},
	jumbo: {
		code: "JU", color: "#00804D", name: "Jumbo — Pueyrredón 200",
		address: "Pueyrredón 200", distance: "2.1 km de vos",
		product: "Aceite Natura girasol 1.5L", price: "$2.640", priceDelta: "+8% vs mejor", isBest: false,
	},
	vea: {
		code: "VE", color: "#990000", name: "Vea — Las Heras 2900",
		address: "Las Heras 2900", distance: "1.8 km de vos",
		product: "Aceite Natura girasol 1.5L", price: "$2.720", priceDelta: "+11% vs mejor", isBest: false,
	},
};

type InfoRow = { icon: IonName; label: string; value: string };

const INFO: InfoRow[] = [
	{ icon: "time-outline", label: "Horario de hoy", value: "8:00 – 22:00 · Abierto ahora" },
	{ icon: "call-outline", label: "Teléfono", value: "+54 11 4000-1234" },
	{ icon: "car-outline", label: "Estacionamiento", value: "Disponible · Gratis" },
	{ icon: "card-outline", label: "Medios de pago", value: "Efectivo, débito, crédito, MODO" },
];

export function StoreDetailScreen({ storeId = "dia", onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const store = STORES[storeId] ?? STORES.dia;

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Supermercado {store.name.split(" — ")[0]}</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={{ paddingBottom: 16 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Mock de mapa con grid */}
				<View style={styles.mapMock}>
					<MapGrid />
					<View style={styles.mapPin}>
						<Ionicons name="location" size={18} color={colors.buttonText} />
					</View>
					<Text style={styles.mapLabel}>{store.name.split(" — ")[0]} · {store.address}</Text>
				</View>

				<View style={styles.content}>
					<View style={styles.summaryCard}>
						<View style={styles.summaryHeader}>
							<View style={[styles.storeBadge, { backgroundColor: store.color }]}>
								<Text style={styles.storeBadgeText}>{store.code}</Text>
							</View>
							<View style={{ flex: 1, gap: 2 }}>
								<Text style={styles.storeName}>{store.name}</Text>
								<View style={styles.distanceRow}>
									<Ionicons name="location-sharp" size={12} color={colors.subtleText} />
									<Text style={styles.distanceText}>{store.distance}</Text>
								</View>
							</View>
						</View>
						<View style={styles.summaryPriceRow}>
							<Text style={styles.summaryProduct}>{store.product}</Text>
							<View style={{ alignItems: "flex-end" }}>
								<Text
									style={[
										styles.summaryPrice,
										store.isBest && { color: colors.success },
									]}
								>
									{store.price}
								</Text>
								<Text
									style={[
										styles.summaryPriceDelta,
										store.isBest && { color: colors.success },
									]}
								>
									{store.priceDelta}
								</Text>
							</View>
						</View>
						{store.isBest && (
							<View style={styles.bestChip}>
								<Ionicons name="trophy" size={11} color={colors.buttonText} />
								<Text style={styles.bestChipText}>Mejor precio</Text>
							</View>
						)}
					</View>

					<View style={styles.infoCard}>
						{INFO.map((row, idx) => (
							<View key={row.label}>
								<View style={styles.infoRow}>
									<Ionicons name={row.icon} size={18} color={colors.subtleText} />
									<View style={{ flex: 1 }}>
										<Text style={styles.infoLabel}>{row.label}</Text>
										<Text style={styles.infoValue}>{row.value}</Text>
									</View>
								</View>
								{idx < INFO.length - 1 && <View style={styles.infoDivider} />}
							</View>
						))}
					</View>
				</View>
			</ScrollView>

			<View style={styles.footer}>
				<Pressable style={styles.primaryButton}>
					<Ionicons name="map-outline" size={18} color={colors.cyan} />
					<Text style={styles.primaryButtonText}>Cómo llegar · {store.distance.split(" ")[0]} km</Text>
				</Pressable>
			</View>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function MapGrid() {
	const vLines = [75, 150, 225, 300];
	const hLines = [50, 100, 150];
	return (
		<View style={StyleSheet.absoluteFill}>
			{vLines.map((x) => (
				<View key={`v${x}`} style={[styles.gridLine, { left: x, top: 0, bottom: 0, width: 1 }]} />
			))}
			{hLines.map((y) => (
				<View key={`h${y}`} style={[styles.gridLine, { top: y, left: 0, right: 0, height: 1 }]} />
			))}
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
	scroll: { flex: 1 },
	mapMock: {
		height: 200,
		backgroundColor: "#DCEBDC",
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	gridLine: { position: "absolute", backgroundColor: "#B4D2B4" },
	mapPin: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
	},
	mapLabel: {
		marginTop: 8,
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	content: { padding: 16, gap: 12 },
	summaryCard: {
		backgroundColor: colors.card,
		borderRadius: 16,
		padding: 16,
		gap: 12,
	},
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
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
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	distanceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	distanceText: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	summaryPriceRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	summaryProduct: {
		flex: 1,
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
	summaryPrice: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 18,
	},
	summaryPriceDelta: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 11,
	},
	bestChip: {
		alignSelf: "flex-start",
		backgroundColor: colors.success,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	bestChipText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	infoCard: {
		backgroundColor: colors.card,
		borderRadius: 12,
		paddingHorizontal: 14,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
	},
	infoLabel: {
		color: colors.subtleText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	infoValue: {
		color: colors.navy,
		fontFamily: typography.family.regular,
		fontSize: 14,
		marginTop: 2,
	},
	infoDivider: { height: 1, backgroundColor: colors.divider },
	footer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	primaryButton: {
		backgroundColor: colors.navy,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	primaryButtonText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
});
