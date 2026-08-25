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
import { offerBadge } from "../services";
import type { Offer } from "../services";

type Props = {
	offer: Offer;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

function formatUntil(iso: string | null): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export function OfferDetailScreen({ offer, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatUntil(offer.activeTo);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Detalle de oferta</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={{ paddingBottom: 16 }}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<View style={styles.heroTop}>
						<View style={styles.heroStoreRow}>
							<View style={[styles.storeBadge, { backgroundColor: color }]}>
								<Text style={styles.storeBadgeText}>{badge}</Text>
							</View>
							<Text style={styles.heroStoreName}>
								{offer.retailerName}
								{offer.province ? ` · ${offer.province}` : ""}
							</Text>
						</View>
					</View>
					<Text style={styles.heroTitle}>{offer.headline}</Text>
					{offer.kind === "catalog" && offer.productName && (
						<Text style={styles.heroSubtitle}>
							{offer.productName}
							{offer.price != null
								? ` · $${Math.round(offer.price).toLocaleString("es-AR")}`
								: ""}
						</Text>
					)}
					{until && (
						<View style={styles.validityBanner}>
							<Ionicons name="calendar-outline" size={13} color="#99B2CC" />
							<Text style={styles.validityText}>Vigente hasta el {until}</Text>
						</View>
					)}
				</View>

				<View style={styles.contentCard}>
					<Text style={styles.sectionTitle}>Detalle</Text>
					{[
						offer.brand ? `Marca: ${offer.brand}` : null,
						offer.category ? `Categoría: ${offer.category}` : null,
						offer.retailerName ? `Supermercado: ${offer.retailerName}` : null,
					]
						.filter((line): line is string => line !== null)
						.map((line) => (
							<View key={line} style={styles.productRow}>
								<View style={styles.bullet} />
								<Text style={styles.productText}>{line}</Text>
							</View>
						))}

					{offer.kind === "catalog" && offer.listPrice != null && offer.price != null && (
						<>
							<View style={styles.divider} />
							<Text style={styles.sectionTitle}>Precio</Text>
							<Text style={styles.conditionText}>
								Precio de lista ${Math.round(offer.listPrice).toLocaleString("es-AR")} · con la
								oferta ${Math.round(offer.price).toLocaleString("es-AR")}
							</Text>
							<Text style={styles.conditionText}>
								Precio del último relevamiento del catálogo, no necesariamente de hoy.
							</Text>
						</>
					)}

					{(offer.legalText || offer.percentagesUnverified) && (
						<>
							<View style={styles.divider} />
							<Text style={styles.sectionTitle}>Condiciones</Text>
							{offer.legalText && <Text style={styles.conditionText}>{offer.legalText}</Text>}
							{offer.percentagesUnverified && (
								<Text style={styles.conditionText}>
									El porcentaje se leyó de la imagen de la promoción y puede no ser exacto.
									Confirmalo en el local.
								</Text>
							)}
						</>
					)}
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
	hero: {
		backgroundColor: colors.navy,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 0,
		gap: 8,
	},
	heroTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	heroStoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	storeBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 9,
	},
	heroStoreName: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	pointsBadge: {
		backgroundColor: colors.cyan,
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 20,
	},
	pointsBadgeText: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	heroTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 26,
		marginTop: 12,
	},
	heroSubtitle: {
		color: "#99B2CC",
		fontFamily: typography.family.regular,
		fontSize: 14,
	},
	validityBanner: {
		backgroundColor: "#071632",
		marginHorizontal: -20,
		marginTop: 18,
		paddingHorizontal: 20,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	validityText: {
		color: "#99B2CC",
		fontFamily: typography.family.regular,
		fontSize: 11,
	},
	contentCard: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 16,
		marginHorizontal: 16,
		marginTop: 12,
		padding: 16,
	},
	sectionTitle: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 15,
		marginBottom: 10,
	},
	productRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 8,
	},
	bullet: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.cyan,
	},
	productText: {
		color: "#374151",
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
	divider: {
		height: 1,
		backgroundColor: "#E5E7EB",
		marginVertical: 16,
	},
	conditionText: {
		color: "#6B7280",
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 18,
	},
	footer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	activateButton: {
		backgroundColor: colors.navy,
		height: 48,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	activateButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
});
