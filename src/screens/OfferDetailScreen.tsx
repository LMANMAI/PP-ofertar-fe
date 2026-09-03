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
import { BottomNav, EmptyState, ScreenHeader, type TabKey } from "../components";
import { offerBadge, offerPromo } from "../services";
import type { Offer, PromoIcon } from "../services";
import { formatCurrency, formatLongDate } from "../utils/format";

type Props = {
	offer: Offer | null;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function OfferDetailScreen({ offer, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	if (!offer) {
		return (
			<View style={styles.safeArea}>
				<ScreenHeader title="Detalle de oferta" onBack={onBack} />
				<EmptyState
					icon="pricetag-outline"
					title="No encontramos esta oferta"
					hint="Puede que ya no esté disponible o que el enlace esté desactualizado."
				/>
				<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
					<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
				</View>
			</View>
		);
	}

	const { badge, color } = offerBadge(offer.retailerName);
	const until = formatLongDate(offer.activeTo, { year: true });
	const expired = offer.activeTo != null && new Date(offer.activeTo).getTime() < Date.now();

	// Same anatomy as the offer cards this screen is opened from (OffersScreen,
	// HomeScreen): the amount-tile + applies-chip treatment, not a plain
	// sentence, so the detail screen answers "how much do I actually get" at
	// least as clearly as the card the user already tapped.
	const promo = offerPromo(offer);
	const catalogPct =
		offer.kind === "catalog" && offer.discountPct != null && offer.discountPct >= 1
			? `${Math.round(offer.discountPct)}%`
			: null;
	const amount = promo ? promo.amount : catalogPct;
	const capped = promo?.capped ?? false;
	const conditional = promo?.conditional ?? false;
	const icon: PromoIcon = promo ? promo.icon : "pricetag-outline";
	// Same filter as describePromo, so this screen can never contradict the
	// ceiling it just showed in the tile above.
	const everyPct = [
		...new Set((offer.discountPercentages ?? []).filter((n) => n > 0 && n <= 100)),
	];

	const detailRows = [
		offer.brand ? { label: "Marca", value: offer.brand } : null,
		offer.category ? { label: "Categoría", value: offer.category } : null,
	].filter((row): row is { label: string; value: string } => row !== null);

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
							<Text style={styles.heroStoreName} numberOfLines={1}>
								{offer.retailerName}
								{offer.province ? ` · ${offer.province}` : ""}
							</Text>
						</View>
					</View>
					<Text style={styles.heroTitle} numberOfLines={3}>{offer.headline}</Text>
					{until && (
						<View style={[styles.validityBanner, expired && styles.validityBannerExpired]}>
							<Ionicons
								name={expired ? "close-circle-outline" : "calendar-outline"}
								size={13}
								color={expired ? colors.dangerSoftText : colors.navyMutedText}
							/>
							<Text style={[styles.validityText, expired && styles.validityTextExpired]}>
								{expired ? `Venció el ${until}` : `Vigente hasta el ${until}`}
							</Text>
						</View>
					)}
				</View>

				<View style={styles.contentCard}>
					<Text style={styles.sectionTitle}>Descuento</Text>
					<View style={styles.offerBody}>
						{amount ? (
							<View style={styles.amountTile}>
								<View style={styles.amountKickerRow}>
									<Ionicons name={icon} size={12} color={colors.cyan} />
									{capped && <Text style={styles.amountKicker}>HASTA</Text>}
								</View>
								<Text
									style={styles.amountValue}
									numberOfLines={1}
									adjustsFontSizeToFit
									minimumFontScale={0.6}
								>
									{amount}
								</Text>
							</View>
						) : (
							<View style={[styles.amountTile, styles.amountTileFlat]}>
								<Ionicons name={icon} size={26} color={colors.cyan} />
							</View>
						)}
						<View style={styles.offerBodyRight}>
							{offer.kind === "catalog" ? (
								<>
									<Text style={styles.offerProduct} numberOfLines={2}>
										{offer.productName ?? offer.headline}
									</Text>
									{offer.price != null && (
										<View style={styles.priceRow}>
											<Text style={styles.priceNow}>{formatCurrency(offer.price)}</Text>
											{offer.listPrice != null && offer.listPrice > offer.price && (
												<Text style={styles.priceWas}>{formatCurrency(offer.listPrice)}</Text>
											)}
										</View>
									)}
								</>
							) : (
								<>
									<View style={[styles.appliesChip, conditional && styles.appliesChipWarm]}>
										<Text style={[styles.appliesText, conditional && styles.appliesTextWarm]}>
											{promo ? promo.applies : offer.headline}
										</Text>
									</View>
									{promo && <Text style={styles.offerDetail}>{promo.detail}</Text>}
								</>
							)}
						</View>
					</View>

					{capped && everyPct.length > 1 && (
						<Text style={styles.offerCaveat}>
							El aviso muestra más de un porcentaje ({everyPct.map((p) => `${p}%`).join(", ")}) y no
							dice a qué producto va cada uno, así que mostramos el mayor.
						</Text>
					)}

					{offer.kind === "catalog" && offer.listPrice != null && offer.price != null && (
						<Text style={styles.offerCaveat}>
							Precio del último relevamiento del catálogo, no necesariamente de hoy.
						</Text>
					)}

					{detailRows.length > 0 && (
						<>
							<View style={styles.divider} />
							<Text style={styles.sectionTitle}>Detalle</Text>
							{detailRows.map((row) => (
								<View key={row.label} style={styles.detailRow}>
									<Text style={styles.detailLabel}>{row.label}</Text>
									<Text style={styles.detailValue}>{row.value}</Text>
								</View>
							))}
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
		paddingTop: space.lg,
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
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	heroTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
		marginTop: space.md,
	},
	validityBanner: {
		// Deliberately fixed, like the rest of this hero — not a token, because
		// it's a deeper inset of colors.navy itself, which doesn't vary by theme.
		backgroundColor: "#071632",
		marginHorizontal: -space.xl,
		marginTop: space.lg,
		paddingHorizontal: space.xl,
		paddingVertical: space.smPlus,
		flexDirection: "row",
		alignItems: "center",
		gap: space.xsPlus,
	},
	validityBannerExpired: { backgroundColor: colors.dangerSoft },
	validityText: {
		color: colors.navyMutedText,
		fontFamily: typography.family.regular,
		fontSize: 11,
	},
	validityTextExpired: { color: colors.dangerSoftText },
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
	offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.mdPlus },
	amountTile: {
		width: 88,
		borderRadius: 14,
		paddingVertical: space.smPlus,
		paddingHorizontal: space.xsPlus,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
		backgroundColor: colors.navy,
	},
	amountTileFlat: { paddingVertical: space.lg },
	amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
	amountKicker: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 0.8,
	},
	amountValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: 27 },
	offerBodyRight: { flex: 1, justifyContent: "center", gap: space.xsPlus },
	appliesChip: {
		alignSelf: "flex-start",
		maxWidth: "100%",
		paddingHorizontal: 9,
		paddingVertical: 5,
		borderRadius: 8,
		backgroundColor: colors.softNavy,
	},
	appliesChipWarm: { backgroundColor: colors.warmChip },
	appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 13, lineHeight: 17 },
	appliesTextWarm: { color: colors.warmChipText },
	offerDetail: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 16,
	},
	offerProduct: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 18,
	},
	priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
	priceNow: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 18 },
	priceWas: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		textDecorationLine: "line-through",
	},
	offerCaveat: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 11,
		lineHeight: 15,
		fontStyle: "italic",
		marginTop: space.sm,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: space.sm,
	},
	detailLabel: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12 },
	detailValue: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
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
