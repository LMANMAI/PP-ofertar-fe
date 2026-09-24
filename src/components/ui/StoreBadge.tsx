import { Image, StyleSheet, Text, View } from "react-native";

import { offerBadge } from "../../services/offersApi";
import { chainLogo } from "../../theme/chainLogos";
import { typography, useThemeColors } from "../../theme/designSystem";

const SIZE = 28;

/**
 * Un cuadrado inscripto en un círculo mide 1/√2 ≈ 0.707 de su diámetro. Los
 * logos son cuadrados y el badge es redondo, así que por encima de esa
 * proporción las esquinas del archivo caen fuera del círculo y se recortan.
 * Quedarse justo por debajo garantiza que no se corte nada, venga el logo con
 * fondo blanco o con transparencia.
 */
const LOGO_SCALE = 0.7;

type Props = {
	retailerSlug: string | null;
	retailerName: string | null;
};

/**
 * El círculo que identifica al súper en una tarjeta de oferta.
 *
 * Con logo: fondo blanco y aro del color de la cadena. El fondo tiene que ser
 * claro porque casi todos los archivos son opacos sobre blanco — sobre el
 * relleno de color se verían como un parche — y el aro es lo que mantiene el
 * color como señal, igual que en los pines del mapa.
 *
 * Sin logo: el relleno de color con las dos iniciales, que es como venía.
 */
export function StoreBadge({ retailerSlug, retailerName }: Props) {
	const colors = useThemeColors();
	const { badge, color } = offerBadge(retailerName);
	const logo = chainLogo(retailerSlug);

	return (
		<View
			style={[
				styles.badge,
				logo ? [styles.withLogo, { borderColor: color }] : { backgroundColor: color },
			]}
		>
			{logo ? (
				<Image
					source={logo}
					style={styles.logo}
					resizeMode="contain"
					// El nombre del súper está al lado en texto: anunciar también
					// la imagen haría que la tarjeta se lea dos veces.
					accessible={false}
				/>
			) : (
				<Text style={[styles.initials, { color: colors.buttonText }]}>{badge}</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		width: SIZE,
		height: SIZE,
		borderRadius: SIZE / 2,
		alignItems: "center",
		justifyContent: "center",
		// Red de contención: si alguien sube LOGO_SCALE, el logo se recorta al
		// círculo en vez de desbordarlo en cuadrado.
		overflow: "hidden",
	},
	withLogo: {
		backgroundColor: "#FFFFFF",
		borderWidth: 1.5,
	},
	logo: {
		width: SIZE * LOGO_SCALE,
		height: SIZE * LOGO_SCALE,
	},
	initials: {
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.tiny,
	},
});
