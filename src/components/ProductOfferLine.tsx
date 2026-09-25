import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { describeCampaignDiscount, offerSavings } from "../services";
import type { RecurringProduct } from "../services";
import { formatCurrency } from "../utils/format";

/** How much less than the last ticket the offer costs, when that is a fair
 * comparison. A weighed product is paid per kilo and offered per package, so a
 * gap that large is a unit mismatch, not a saving. */
export function paidDelta(product: RecurringProduct, price: number): number | null {
	const paid = product.lastPaidPrice;
	if (paid == null || paid <= price || paid > price * 2) return null;
	return paid - price;
}

/** The offer in one sentence, for a screen reader that reads a card as a unit. */
export function offerSummary(p: RecurringProduct, loose: boolean): string {
	const offer = p.bestOffer;
	const campaign = p.campaignOffers[0];
	if (offer) return `${loose ? "Similar" : "Mejor"} en ${offer.retailerName}, ${formatCurrency(offer.price)}`;
	if (campaign) return `${describeCampaignDiscount(campaign) ?? "Promoción vigente"} en ${campaign.retailerName}`;
	if (p.alternativeOffers.length > 0) return "Sin oferta de esta marca, otra marca en oferta";
	return "Sin ofertas";
}

type Props = {
	product: RecurringProduct;
	/** The catalog price is probably for a different product than the one bought
	 * (see `isLooseMatch`). It then reads as "similar", with no percentage. */
	loose: boolean;
	/** Drawn under the price lines, inside the offer block: the promotion's own
	 * mechanic, which only the screens that have room for it pass. */
	children?: ReactNode;
};

/**
 * What is on offer for a product the user buys: the best catalog price and where
 * it is, the product that price is really for, and the campaign promotion. The
 * one place that says it, so a habitual product reads the same in "Productos
 * recurrentes" and "Tu compra habitual" — the honesty rules (a loose match is
 * never "best", never carries a percentage) live here and not in each screen.
 *
 * Renders nothing when there is neither a catalog offer nor a campaign; what to
 * say about a product with no offer is the screen's call.
 */
export function ProductOfferLine({ product: p, loose, children }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const offer = p.bestOffer;
	const savings = offer ? offerSavings(offer) : null;
	const discountPct = offer?.discountPct ?? savings?.pct ?? null;
	const campaigns = p.campaignOffers.slice(0, 3);
	const delta = offer && !loose ? paidDelta(p, offer.price) : null;

	return (
		<>
			{offer && (
				<View style={{ gap: space.xs }}>
					<View style={styles.bestRow}>
						<View style={loose ? styles.similarChip : styles.bestChip}>
							<Ionicons
								name={loose ? "swap-horizontal" : "trophy"}
								size={12}
								color={loose ? colors.defaultText : colors.successSoftText}
							/>
							<Text style={loose ? styles.similarText : styles.bestText} numberOfLines={1}>
								{loose ? "Similar en" : "Mejor en"} {offer.retailerName}
							</Text>
						</View>
						<View style={styles.priceGroup}>
							{/* Sin el % cuando el precio es de otro producto: ese descuento no
							    es de lo que compraste. */}
							{!loose && discountPct != null && discountPct >= 1 && (
								<View style={styles.discountBadge}>
									<Text style={styles.discountText}>-{Math.round(discountPct)}%</Text>
								</View>
							)}
							<Text style={styles.price}>{formatCurrency(offer.price)}</Text>
						</View>
					</View>
					{/* Always visible: the match is by brand and kind of product, so the
					    price can belong to another size or variety. */}
					{offer.productName && (
						<Text style={[styles.offerProduct, loose && styles.offerProductLoose]} numberOfLines={2}>
							{loose ? "Precio de otro producto: " : "Precio de: "}
							{offer.productName}
						</Text>
					)}
					{delta != null && (
						<View style={styles.deltaRow}>
							<Ionicons name="arrow-down" size={13} color={colors.successSoftText} />
							<Text style={styles.deltaText}>{formatCurrency(delta)} menos que en tu último ticket</Text>
						</View>
					)}
					{children}
				</View>
			)}

			{/* A catalog price and a campaign are different kinds of offer and both
			    matter; a campaign with no catalog price is still an offer. */}
			{campaigns.length > 0 && (
				<View style={styles.bestRow}>
					<View style={styles.campaignChip}>
						<Ionicons name="megaphone" size={12} color={colors.buttonText} />
						<Text style={styles.campaignChipText} numberOfLines={1}>
							{describeCampaignDiscount(campaigns[0]) ?? "Promoción vigente"} en {campaigns[0].retailerName}
						</Text>
					</View>
				</View>
			)}
		</>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
		// "Mejor" reads as a verified claim, so it keeps the success tint; "similar"
		// is neutral on purpose. Both carry text that clears 4.5:1 — white on the
		// solid success green was 2.3:1.
		bestChip: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.successSoft, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm },
		similarChip: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.softNavy, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm },
		campaignChip: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.navy, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm },
		bestText: { flexShrink: 1, color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		similarText: { flexShrink: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		campaignChipText: { flexShrink: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		priceGroup: { flexDirection: "row", alignItems: "center", gap: space.xsPlus },
		discountBadge: { backgroundColor: colors.successSoft, paddingHorizontal: space.xsPlus, paddingVertical: space.xs / 2, borderRadius: radii.sm },
		discountText: { color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: sizes.micro },
		price: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.body },
		offerProduct: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		offerProductLoose: { color: colors.defaultText, fontFamily: typography.family.medium },
		deltaRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
		deltaText: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro },
	});
}
