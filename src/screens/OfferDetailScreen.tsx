import { useMemo } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { BottomNav, ScreenHeader, type TabKey } from "../components";
import { offerBadge } from "../services";
import type { Offer } from "../services";
import { formatLongDate } from "../utils/format";

type Props = {
	offer: Offer;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function OfferDetailScreen({ offer, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatLongDate(offer.activeTo, { year: true });

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Detalle de oferta" onBack={onBack} />

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={{ paddingBottom: space.lg }}
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

					{/* Always shown: the stock caveat below applies to every offer, not
					    just the ones the retailer published legal text for. */}
					<View style={styles.divider} />
					<Text style={styles.sectionTitle}>Condiciones</Text>
					{offer.legalText && <Text style={styles.conditionText}>{offer.legalText}</Text>}
					{offer.percentagesUnverified && (
						<Text style={styles.conditionText}>
							El porcentaje se leyó de la imagen de la promoción y puede no ser exacto.
							Confirmalo en el local.
						</Text>
					)}
					<Text style={styles.conditionText}>
						Verificá siempre la vigencia antes de ir y consultá el stock en la sucursal: no
						garantizamos que el producto esté disponible en la que elijas.
					</Text>
				</View>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	hero: {
		backgroundColor: colors.navy,
		paddingHorizontal: space.xl,
		paddingTop: 18,
		paddingBottom: 0,
		gap: space.sm,
	},
	heroTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	heroStoreRow: { flexDirection: "row", alignItems: "center", gap: space.smPlus },
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
	heroTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 26,
		marginTop: space.md,
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
		paddingHorizontal: space.xl,
		paddingVertical: space.smPlus,
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
	},
	validityText: {
		color: "#99B2CC",
		fontFamily: typography.family.regular,
		fontSize: 11,
	},
	contentCard: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.divider,
		borderRadius: 16,
		marginHorizontal: space.lg,
		marginTop: space.md,
		padding: space.lg,
	},
	sectionTitle: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 15,
		marginBottom: space.smPlus,
	},
	productRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.smPlus,
		paddingVertical: space.sm,
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
		backgroundColor: colors.divider,
		marginVertical: space.lg,
	},
	conditionText: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 18,
	},
	});
}
