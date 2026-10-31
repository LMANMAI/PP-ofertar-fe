import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { describeCampaignDiscount, retailerSlugFromName } from "../services/productsApi";
import type { RecurringProduct } from "../services/productsApi";
import { formatCurrency } from "../utils/format";
import { StoreBadge } from "./ui/StoreBadge";
import { MAX_CAMPAIGNS_SHOWN, heroSpoken, productOfferHero, type OfferHero } from "./promoConditions";

/** How much less than the last ticket the offer costs, when that is a fair
 * comparison. A weighed product is paid per kilo and offered per package, so a
 * gap that large is a unit mismatch, not a saving. */
export function paidDelta(product: RecurringProduct, price: number): number | null {
	const paid = product.lastPaidPrice;
	if (paid == null || paid <= price || paid > price * 2) return null;
	return paid - price;
}

/**
 * El rótulo chico arriba del nombre de la cadena.
 *
 * "Mejor en" sólo cuando lo grande es un precio que se paga llevando una
 * unidad. Con una promo condicional lo grande es la mecánica o el precio por
 * unidad llevando N, y ahí "Mejor en" es el bug que ya pasó: un producto a
 * precio de góndola presentado como la mejor opción. "Similar en" cuando el
 * precio es de otro producto, como siempre.
 */
function chainKicker(hero: OfferHero, loose: boolean): string {
	if (loose) return "Similar en";
	return hero.kind === "price" ? "Mejor en" : "Promo en";
}

/** The offer in one sentence, for a screen reader that reads a card as a unit. */
export function offerSummary(p: RecurringProduct, loose: boolean): string {
	const offer = p.bestOffer;
	const campaign = p.campaignOffers[0];
	if (offer) {
		const hero = productOfferHero(offer, loose);
		return `${chainKicker(hero, loose)} ${offer.retailerName}, ${heroSpoken(hero)}`;
	}
	if (campaign) return `${describeCampaignDiscount(campaign) ?? "Promoción vigente"} en ${campaign.retailerName}`;
	if (p.alternativeOffers.length > 0) return "Sin oferta de esta marca, otra marca en oferta";
	return "Sin ofertas";
}

type Props = {
	product: RecurringProduct;
	/** The catalog price is probably for a different product than the one bought
	 * (see `isLooseMatch`). It then reads as "similar", with no percentage. */
	loose: boolean;
	/** Drawn under the price lines, inside the offer block. */
	children?: ReactNode;
};

/**
 * What is on offer for a product the user buys: the best catalog price and where
 * it is, the product that price is really for, and the campaign promotion. The
 * one place that says it, so a habitual product reads the same in "Productos
 * recurrentes" and "Tu compra habitual" — the honesty rules (a loose match is
 * never "best", never carries a percentage) live here and not in each screen.
 *
 * El rediseño: el súper se reconoce por su logo (antes era un chip de texto
 * verde), y lo grande es lo que se paga. Una rebaja lisa muestra el precio
 * final con el de lista tachado —sin "-25%": con el tachado a la vista el
 * porcentaje es una cuenta que el usuario no necesita—. Una promo condicional
 * muestra el precio por unidad con su condición pegada, o la mecánica si la
 * cadena no publicó ese precio, y siempre cuánto sale UNA unidad. Qué va en
 * cada caso lo decide `productOfferHero`, que está verificado aparte.
 *
 * Renders nothing when there is neither a catalog offer nor a campaign; what to
 * say about a product with no offer is the screen's call.
 */
export function ProductOfferLine({ product: p, loose, children }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const offer = p.bestOffer;
	const hero = offer ? productOfferHero(offer, loose) : null;
	const campaigns = p.campaignOffers.slice(0, MAX_CAMPAIGNS_SHOWN);
	const delta = offer && !loose ? paidDelta(p, offer.price) : null;

	return (
		<>
			{offer && hero && (
				<View style={styles.offerBlock}>
					<View style={styles.chainRow}>
						{/* El nombre está al lado en texto: el badge es sólo la marca. */}
						<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
							<StoreBadge
								retailerSlug={retailerSlugFromName(offer.retailerName)}
								retailerName={offer.retailerName}
							/>
						</View>
						<View style={styles.chainText}>
							<Text
								style={[styles.chainKicker, hero.kind === "price" && !loose && styles.chainKickerBest]}
								numberOfLines={1}
							>
								{chainKicker(hero, loose)}
							</Text>
							<Text style={styles.chainName} numberOfLines={1}>
								{offer.retailerName}
							</Text>
						</View>
						{hero.kind === "price" && (
							<View style={styles.priceCol}>
								<Text style={styles.priceBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
									{formatCurrency(hero.price)}
								</Text>
								{hero.listPrice != null && (
									<Text style={styles.priceWas} numberOfLines={1}>
										{formatCurrency(hero.listPrice)}
									</Text>
								)}
								{/* Sólo sin precio de lista: es lo único que queda para
								    decir que hay rebaja. */}
								{hero.discountPct != null && <Text style={styles.pctNote}>-{hero.discountPct}%</Text>}
							</View>
						)}
					</View>
					{hero.kind !== "price" && <PromoHero hero={hero} />}
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
			    matter; a campaign with no catalog price is still an offer. La
			    condición va en el propio titular ("70% en la 2da unidad"); la
			    vigencia y los legales, en la hoja de condiciones. */}
			{campaigns.length > 0 && (
				<View style={styles.campaignRow}>
					<View style={styles.campaignChip}>
						<Ionicons name="megaphone" size={12} color={colors.buttonText} />
						<Text style={styles.campaignChipText} numberOfLines={2}>
							{describeCampaignDiscount(campaigns[0]) ?? "Promoción vigente"} en {campaigns[0].retailerName}
							{campaigns.length > 1 ? ` y ${campaigns.length - 1} más` : ""}
						</Text>
					</View>
				</View>
			)}
		</>
	);
}

/**
 * Lo grande de una promo condicional: el precio por unidad con su condición
 * en el mismo bloque, o la mecánica en el tile de siempre con el chip de "a
 * qué se aplica". Debajo, el precio de una sola unidad, que en una promo
 * condicional nunca se esconde.
 *
 * Exportado porque "Productos recurrentes" lo usa también adentro del detalle,
 * para la promo de un precio que es de otro producto.
 */
export function PromoHero({ hero }: { hero: Exclude<OfferHero, { kind: "price" }> }) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	if (hero.kind === "unitPrice") {
		return (
			<View style={styles.heroGroup}>
				{/* Una sola unidad visual: el número y "c/u llevando 3" nunca se
				    separan, ni siquiera cuando el monto es largo y la línea parte. */}
				<View style={styles.unitBox}>
					<Text style={styles.unitPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
						{formatCurrency(hero.unitPrice)}
					</Text>
					<Text style={styles.unitCondition}>c/u {hero.condition}</Text>
				</View>
				<Text style={styles.singleText}>{hero.single.text}</Text>
			</View>
		);
	}

	return (
		<View style={styles.promoBody}>
			{hero.amount ? (
				<View style={styles.amountTile}>
					<View style={styles.amountKickerRow}>
						<Ionicons name={hero.icon} size={11} color={colors.cyan} />
						{hero.capped && <Text style={styles.amountKicker}>HASTA</Text>}
					</View>
					<Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
						{hero.amount}
					</Text>
				</View>
			) : (
				<View style={[styles.amountTile, styles.amountTileFlat]}>
					<Ionicons name={hero.icon} size={24} color={colors.cyan} />
				</View>
			)}
			<View style={styles.promoBodyRight}>
				{hero.applies ? (
					<View style={[styles.appliesChip, hero.conditional && styles.appliesChipWarm]}>
						<Text style={[styles.appliesText, hero.conditional && styles.appliesTextWarm]}>{hero.applies}</Text>
					</View>
				) : null}
				{hero.single ? <Text style={styles.singleText}>{hero.single.text}</Text> : null}
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		offerBlock: { gap: space.sm },
		chainRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
		chainText: { flex: 1, minWidth: 0 },
		chainKicker: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		// "Mejor" reads as a verified claim, so it keeps the success tint; "similar"
		// and "promo" are neutral on purpose.
		chainKickerBest: { color: colors.successSoftText, fontFamily: typography.family.medium },
		chainName: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.label, lineHeight: lineHeights.label },
		// Tope de ancho para que un "$ 1.234.567" no le coma el nombre de la
		// cadena a 360 dp; si igual no entra, el texto se achica antes de partir.
		priceCol: { alignItems: "flex-end", maxWidth: "55%" },
		priceBig: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.h3, lineHeight: lineHeights.h3 },
		priceWas: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro, textDecorationLine: "line-through" },
		pctNote: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		offerProduct: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		offerProductLoose: { color: colors.defaultText, fontFamily: typography.family.medium },
		deltaRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
		deltaText: { flexShrink: 1, color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		campaignRow: { flexDirection: "row" },
		campaignChip: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: space.xs, backgroundColor: colors.navy, paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm },
		campaignChipText: { flexShrink: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		heroGroup: { gap: space.xs },
		// Cálido como el chip de "aplica a": es el mismo aviso —esto no es una
		// rebaja lisa— dicho con el número adentro.
		unitBox: {
			flexDirection: "row",
			flexWrap: "wrap",
			alignItems: "baseline",
			columnGap: space.sm,
			alignSelf: "flex-start",
			maxWidth: "100%",
			backgroundColor: colors.warmChip,
			borderRadius: radii.md,
			paddingHorizontal: space.md,
			paddingVertical: space.sm,
		},
		unitPrice: { flexShrink: 1, color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.h3, lineHeight: lineHeights.h3 },
		unitCondition: { color: colors.warmChipText, fontFamily: typography.family.bold, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		singleText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		// Misma anatomía que las cards de oferta (OffersScreen/HomeScreen): el número
		// en su propio bloque y el "a qué se aplica" en un chip, para que la promo se
		// lea igual en las dos pantallas.
		promoBody: { flexDirection: "row", alignItems: "stretch", gap: space.smPlus },
		amountTile: {
			width: 68,
			borderRadius: radii.md,
			paddingVertical: space.sm,
			paddingHorizontal: space.xs,
			alignItems: "center",
			justifyContent: "center",
			gap: space.xs / 2,
			backgroundColor: colors.navy,
			// The tile is a fixed navy: on a dark card it needs an edge to be seen.
			borderWidth: 1,
			borderColor: colors.navyHairline,
		},
		amountTileFlat: { paddingVertical: space.smPlus },
		amountKickerRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
		amountKicker: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: sizes.overline },
		amountValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: sizes.h3 },
		promoBodyRight: { flex: 1, justifyContent: "center", gap: space.xs },
		appliesChip: { alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: space.smPlus, paddingVertical: space.xs, borderRadius: radii.sm, backgroundColor: colors.softNavy },
		// Cálido para todo lo que no sea una rebaja lisa sobre el precio, así un
		// "70% en la 2da unidad" nunca parece un 70% a secas.
		appliesChipWarm: { backgroundColor: colors.warmChip },
		appliesText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		appliesTextWarm: { color: colors.warmChipText },
	});
}
