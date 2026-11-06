import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chainLogo } from "../theme/chainLogos";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { readPaymentPromo } from "../services/paymentPromo";
import { retailerSlugFromName } from "../services/productsApi";
import { formatCurrency } from "../utils/format";

type Props = { labels: string[]; retailerName: string; price: number };

/**
 * Promos de tarjeta o programa de la cadena, con el precio final ya calculado.
 * Las etiquetas sin un porcentaje claro quedan como texto.
 */
export function PaymentPromos({ labels, retailerName, price }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const slug = retailerSlugFromName(retailerName);
	const logo = slug ? chainLogo(slug) : null;

	const readings = labels.map((label) => ({ label, promo: readPaymentPromo(label, price) }));
	const calculated = readings.some((r) => r.promo);

	return (
		<View style={styles.block}>
			<View style={styles.heading}>
				{logo ? (
					<Image source={logo} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
				) : (
					<Ionicons name="card-outline" size={13} color={colors.infoSoftText} />
				)}
				<Text style={styles.headingText}>Con tarjeta o programa de {retailerName}:</Text>
			</View>

			{readings.map(({ label, promo }) =>
				promo ? (
					<View
						key={label}
						style={styles.row}
						accessible
						accessibilityLabel={`${promo.capped ? "Hasta " : ""}${promo.percent}% con ${promo.name}${
							promo.day ? `, ${promo.day}` : ""
						}: ${promo.capped ? "desde " : ""}${formatCurrency(promo.finalPrice)}`}
					>
						<Text style={styles.detail}>
							<Text style={styles.percent}>
								{promo.capped ? "hasta " : ""}
								{promo.percent}%
							</Text>{" "}
							{promo.name}
							{promo.day ? ` · ${promo.day}` : ""}
						</Text>
						<Text style={styles.price}>
							{promo.capped ? "desde " : ""}
							{formatCurrency(promo.finalPrice)}
						</Text>
					</View>
				) : (
					<Text key={label} style={styles.detail}>
						{label}
					</Text>
				),
			)}

			{calculated && (
				<Text style={styles.note}>
					Calculado sobre {formatCurrency(price)}. Confirmá en caja si se suma a otras promos.
				</Text>
			)}
		</View>
	);
}

const { sizes } = typography;

const createStyles = (colors: ColorTokens) =>
	StyleSheet.create({
		block: { gap: space.xs },
		heading: { flexDirection: "row", alignItems: "center", gap: space.xsPlus },
		headingText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.micro },
		logo: { width: 18, height: 18, borderRadius: radii.sm },
		row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
		detail: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: sizes.micro },
		percent: { fontFamily: typography.family.bold },
		price: { color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: sizes.caption },
		note: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: sizes.micro },
	});
