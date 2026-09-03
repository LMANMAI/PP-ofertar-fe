import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";
import { getProductoPorEan } from "../services/sepaApi";
import type { ProductoDetalleResponse } from "../services/sepaApi";

type Props = {
	productName: string;
	barcode: string | null;
	onBack: () => void;
	onScanBarcode: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

type Estado = "sin-codigo" | "buscando" | "resultado" | "error";

const formatearPrecio = (valor: number | null) =>
	valor == null
		? "—"
		: valor.toLocaleString("es-AR", {
				style: "currency",
				currency: "ARS",
				maximumFractionDigits: 0,
			});

export function ComparePricesScreen({
	productName,
	barcode,
	onBack,
	onScanBarcode,
	activeTab,
	onSelectTab,
	onScanPress,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [estado, setEstado] = useState<Estado>(barcode ? "buscando" : "sin-codigo");
	const [producto, setProducto] = useState<ProductoDetalleResponse | null>(null);
	const [mensajeError, setMensajeError] = useState<string | null>(null);

	const buscar = useCallback(async (ean: string) => {
		setEstado("buscando");
		try {
			setProducto(await getProductoPorEan(ean));
			setEstado("resultado");
		} catch (e) {
			setMensajeError(
				e instanceof Error ? e.message : "No pudimos consultar el producto.",
			);
			setEstado("error");
		}
	}, []);

	useEffect(() => {
		if (barcode) buscar(barcode);
	}, [barcode, buscar]);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Comparar</Text>
				<View style={{ width: 32 }} />
			</View>

			{estado === "sin-codigo" ? (
				<View style={styles.centrado}>
					<Ionicons name="barcode-outline" size={40} color={colors.mutedText} />
					<Text style={styles.centradoTitulo}>No leímos el código de este producto</Text>
					<Text style={styles.centradoTexto}>
						El ticket no tenía un código de barras legible para{" "}
						<Text style={{ fontFamily: typography.family.bold }}>{productName}</Text>
						, así que no tenemos precios verificados para compararlo todavía.
						Escaneá el código del producto para ver precios reales.
					</Text>
					<Pressable style={styles.botonPrimario} onPress={onScanBarcode}>
						<Ionicons name="barcode-outline" size={18} color={colors.buttonText} />
						<Text style={styles.botonPrimarioTexto}>Escanear código</Text>
					</Pressable>
				</View>
			) : estado === "buscando" ? (
				<View style={styles.centrado}>
					<ActivityIndicator color={colors.cyan} />
					<Text style={styles.centradoTexto}>Buscando precios de {productName}…</Text>
				</View>
			) : estado === "error" ? (
				<View style={styles.centrado}>
					<Ionicons name="cloud-offline-outline" size={40} color={colors.orange} />
					<Text style={styles.centradoTitulo}>No pudimos buscarlo</Text>
					<Text style={styles.centradoTexto}>{mensajeError}</Text>
					<Pressable style={styles.botonPrimario} onPress={() => barcode && buscar(barcode)}>
						<Text style={styles.botonPrimarioTexto}>Reintentar</Text>
					</Pressable>
				</View>
			) : (
				<Resultado producto={producto!} fallbackNombre={productName} colors={colors} styles={styles} />
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function Resultado({
	producto,
	fallbackNombre,
	colors,
	styles,
}: {
	producto: ProductoDetalleResponse;
	fallbackNombre: string;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<ScrollView style={styles.resultado} contentContainerStyle={styles.resultadoContent}>
			<View style={styles.productoCard}>
				{producto.imagenUrl ? (
					<Image source={{ uri: producto.imagenUrl }} style={styles.productoImagen} resizeMode="contain" />
				) : (
					<View style={[styles.productoImagen, styles.imagenPlaceholder]}>
						<Ionicons name="cube-outline" size={28} color={colors.mutedText} />
					</View>
				)}
				<View style={styles.productoInfo}>
					<Text style={styles.productoNombre} numberOfLines={3}>
						{producto.descripcion ?? fallbackNombre}
					</Text>
					{producto.marca ? <Text style={styles.productoMarca}>{producto.marca}</Text> : null}
					<Text style={styles.productoEan}>EAN {producto.ean}</Text>
				</View>
			</View>

			{producto.sinPrecios ? (
				<View style={styles.avisoSinPrecios}>
					<Ionicons name="information-circle-outline" size={20} color={colors.infoSoftText} />
					<Text style={styles.avisoTexto}>
						{producto.fuenteDatos === "ninguna"
							? "No encontramos este producto. Puede ser un código interno del comercio."
							: "SEPA todavía no publica precios de este producto."}
					</Text>
				</View>
			) : (
				<>
					<View style={styles.precioCard}>
						<Text style={styles.precioLabel}>Precio más bajo</Text>
						<Text style={styles.precioDestacado}>{formatearPrecio(producto.precioMinimo)}</Text>
						<Text style={styles.precioRango}>
							Promedio {formatearPrecio(producto.precioPromedio)} · Máximo{" "}
							{formatearPrecio(producto.precioMaximo)}
						</Text>
					</View>

					{producto.comercios.length > 0 ? (
						<View style={styles.comerciosWrap}>
							<Text style={styles.seccionTitulo}>Dónde comprarlo</Text>
							{producto.comercios.map((comercio, index) => (
								<View
									key={`${comercio.comercioId}-${index}`}
									style={[styles.comercioFila, index === 0 && styles.comercioMasBarato]}
								>
									<View style={styles.comercioInfo}>
										<Text style={styles.comercioNombre} numberOfLines={1}>
											{comercio.bandera || comercio.razonSocial || "Comercio"}
										</Text>
										<Text style={styles.comercioSucursales}>
											{comercio.cantidadSucursales === 1
												? "1 sucursal"
												: `${comercio.cantidadSucursales} sucursales`}
										</Text>
									</View>
									<View style={styles.comercioPrecioWrap}>
										{index === 0 ? (
											<View style={styles.badgeBarato}>
												<Text style={styles.badgeBaratoTexto}>Más barato</Text>
											</View>
										) : null}
										<Text style={styles.comercioPrecio}>{formatearPrecio(comercio.precioMinimo)}</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					{producto.fechaDataset ? (
						<Text style={styles.pieDatos}>Datos de SEPA al {producto.fechaDataset}</Text>
					) : null}
				</>
			)}
		</ScrollView>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: space.md,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: space.sm,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		textAlign: "center",
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	centrado: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: space.md,
		paddingHorizontal: 32,
		backgroundColor: colors.background,
	},
	centradoTitulo: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.bodyL,
		textAlign: "center",
	},
	centradoTexto: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
		textAlign: "center",
	},
	resultado: { flex: 1 },
	resultadoContent: { padding: space.xl, gap: space.lg },
	productoCard: {
		flexDirection: "row",
		gap: space.mdPlus,
		backgroundColor: colors.card,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		padding: space.mdPlus,
	},
	productoImagen: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.softWarm },
	imagenPlaceholder: { alignItems: "center", justifyContent: "center" },
	productoInfo: { flex: 1, justifyContent: "center", gap: 3 },
	productoNombre: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.body,
	},
	productoMarca: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
	},
	productoEan: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.overline,
		marginTop: 2,
	},
	avisoSinPrecios: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: space.smPlus,
		backgroundColor: colors.infoSoft,
		borderRadius: 14,
		padding: space.mdPlus,
	},
	avisoTexto: {
		flex: 1,
		color: colors.infoSoftText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
	},
	precioCard: {
		backgroundColor: colors.softCyan,
		borderRadius: 16,
		padding: 18,
		gap: 2,
	},
	precioLabel: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	precioDestacado: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
	},
	precioRango: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
	},
	comerciosWrap: { gap: space.sm },
	seccionTitulo: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
		marginBottom: 2,
	},
	comercioFila: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.card,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: space.mdPlus,
		paddingVertical: space.md,
	},
	comercioMasBarato: { borderColor: colors.cyan, backgroundColor: colors.softCyan },
	comercioInfo: { flex: 1, gap: 2 },
	comercioNombre: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
	},
	comercioSucursales: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.overline,
	},
	comercioPrecioWrap: { alignItems: "flex-end", gap: 3 },
	comercioPrecio: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
	},
	badgeBarato: {
		backgroundColor: colors.navy,
		paddingHorizontal: space.sm,
		paddingVertical: 2,
		borderRadius: 6,
	},
	badgeBaratoTexto: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 10,
	},
	pieDatos: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.overline,
		textAlign: "center",
	},
	botonPrimario: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.navy,
		borderRadius: 14,
		paddingVertical: 15,
		paddingHorizontal: space.xxl,
		marginTop: space.xs,
	},
	botonPrimarioTexto: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
	},
	});
}
