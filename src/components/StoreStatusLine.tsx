import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors } from "../theme/designSystem";
import { openingLabel, openingTone, type OpeningStatus } from "../utils/openingHours";

type Props = {
	status: OpeningStatus;
	style?: StyleProp<ViewStyle>;
};

/**
 * "Abierto · cierra 22:00" / "Cierra pronto · 21:30" / "Cerrado · abre 8:00".
 *
 * Sin horario no dibuja nada: un "Horario no disponible" repetido en cada fila
 * sólo agrega ruido, y hoy el backend no manda horarios.
 *
 * Lo dice el texto; el ícono y el color acompañan. El texto de "pronto" y
 * "cerrado" va en el color de texto normal y no en naranja o gris: sobre los
 * fondos suaves de la tarjeta de precios (softCyan, successSoft) esos quedaban
 * por debajo de 4.5:1 a 12 px. El ícono, que alcanza con 3:1, sí lleva el tono.
 * No lleva rol ni etiqueta propia: la fila que lo contiene ya lo lee.
 */
export function StoreStatusLine({ status, style }: Props) {
	const colors = useThemeColors();
	const text = openingLabel(status);
	const tone = openingTone(status);
	if (!text || !tone) return null;
	const iconColor = tone === "open" ? colors.successSoftText : tone === "soon" ? colors.warningSoftText : colors.mutedText2;
	const textColor = tone === "open" ? colors.successSoftText : colors.defaultText;
	return (
		<View style={[styles.row, style]}>
			<Ionicons
				name={tone === "open" ? "time-outline" : tone === "soon" ? "alert-circle-outline" : "moon-outline"}
				size={13}
				color={iconColor}
				accessible={false}
			/>
			<Text style={[styles.text, { color: textColor }]}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 2 },
	text: {
		flexShrink: 1,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
});
