import { useMemo } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
	getChainMarker,
	markerHaloColor,
	type ChainMarkerShape,
} from "../../theme/chainMarkers";
import { chainLogo } from "../../theme/chainLogos";
import { typography, useIsDarkMode } from "../../theme/designSystem";

type Props = {
	chainSlug: string;
	chainName?: string;
	/** Lado del pin en px. 32 en el mapa, 22 en la lista de cadenas. */
	size?: number;
	/** Punta inferior tipo pin de mapa. Se apaga en listas. */
	withPointer?: boolean;
};

/**
 * Pin de una cadena: **forma + iniciales + color**. Las dos primeras señales
 * sobreviven a cualquier daltonismo y a una captura en escala de grises; el
 * color es sólo refuerzo.
 *
 * Cuando la cadena tenga un logo en `CHAIN_LOGOS`, se
 * dibuja el logo dentro de la misma silueta y las iniciales quedan como
 * fallback. No hace falta tocar las pantallas.
 */
/** Proporción del pin que ocupa el logo. Uno solo para todas las cadenas:
 * es lo que hace que se vean del mismo tamaño pese a venir en resoluciones y
 * relaciones de aspecto distintas. */
const LOGO_SCALE = 0.68;

export function ChainMarkerPin({ chainSlug, chainName, size = 32, withPointer = false }: Props) {
	const isDark = useIsDarkMode();
	const descriptor = useMemo(() => getChainMarker(chainSlug, chainName), [chainSlug, chainName]);
	const logo = chainLogo(chainSlug);
	const halo = markerHaloColor(isDark);
	const borderWidth = Math.max(1.5, size * 0.07);
	const { box, inner } = shapeStyles(descriptor.shape, size);

	return (
		<View style={styles.wrap} pointerEvents="none">
			<View
				style={[
					styles.badge,
					box,
					{
						// Con logo, el relleno pasa a ser el halo claro: la mayoría de
						// los archivos son opacos con fondo blanco, así que sobre un
						// relleno de color se verían como un parche. El color de la
						// cadena se mantiene como aro, para no perder ese canal.
						backgroundColor: logo ? halo : descriptor.background,
						borderColor: logo ? descriptor.background : halo,
						borderWidth,
					},
				]}
			>
				<View style={[styles.inner, inner]}>
					{logo ? (
						<Image
							source={logo}
							// Mismo cuadro para todos y "contain": los archivos van de
							// 200x200 a 1273x909, y sin esto cada logo saldría de un
							// tamaño distinto o estirado.
							style={{ width: size * LOGO_SCALE, height: size * LOGO_SCALE }}
							resizeMode="contain"
							accessible={false}
						/>
					) : (
						<Text
							style={{
								color: descriptor.textColor,
								fontFamily: typography.family.bold,
								fontSize: size * (descriptor.initials.length >= 3 ? 0.3 : 0.38),
								letterSpacing: 0.2,
								includeFontPadding: false,
							}}
							maxFontSizeMultiplier={1.3}
							numberOfLines={1}
							allowFontScaling
						>
							{descriptor.initials}
						</Text>
					)}
				</View>
			</View>
			{withPointer && (
				<View
					style={[
						styles.pointer,
						{
							borderLeftWidth: size * 0.16,
							borderRightWidth: size * 0.16,
							borderTopWidth: size * 0.22,
							borderTopColor: halo,
							marginTop: -borderWidth,
						},
					]}
				/>
			)}
		</View>
	);
}

/**
 * Cada forma sale de bordes/rotaciones sobre un `View`: sin SVG ni
 * dependencias nuevas. El rombo rota la caja 45° y contrarrota el contenido
 * para que las iniciales sigan derechas.
 */
function shapeStyles(shape: ChainMarkerShape, size: number): { box: ViewStyle; inner: ViewStyle } {
	switch (shape) {
		case "circle":
			return { box: { width: size, height: size, borderRadius: size / 2 }, inner: {} };
		case "roundedSquare":
			return { box: { width: size, height: size, borderRadius: size * 0.22 }, inner: {} };
		case "diamond":
			return {
				box: {
					width: size * 0.86,
					height: size * 0.86,
					borderRadius: size * 0.14,
					transform: [{ rotate: "45deg" }],
				},
				inner: { transform: [{ rotate: "-45deg" }] },
			};
		case "pill":
			return {
				box: { width: size * 1.42, height: size * 0.78, borderRadius: size * 0.39 },
				inner: {},
			};
		case "leaf":
			return {
				box: {
					width: size,
					height: size,
					borderTopLeftRadius: size / 2,
					borderTopRightRadius: size / 2,
					borderBottomRightRadius: size / 2,
					borderBottomLeftRadius: size * 0.12,
				},
				inner: {},
			};
	}
}

const styles = StyleSheet.create({
	wrap: { alignItems: "center", justifyContent: "center" },
	badge: { alignItems: "center", justifyContent: "center" },
	inner: { alignItems: "center", justifyContent: "center" },
	pointer: {
		width: 0,
		height: 0,
		borderLeftColor: "transparent",
		borderRightColor: "transparent",
	},
});
