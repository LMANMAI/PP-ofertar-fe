import { useCallback, useEffect, useState } from "react";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, typography } from "../theme/designSystem";
import { getProductoPorEan } from "../services/sepaApi";
import type { ProductoDetalleResponse } from "../services/sepaApi";

type Props = {
	onBack: () => void;
};

type Estado = "escaneando" | "buscando" | "resultado" | "error";

const formatearPrecio = (valor: number | null) =>
	valor == null
		? "—"
		: valor.toLocaleString("es-AR", {
				style: "currency",
				currency: "ARS",
				maximumFractionDigits: 0,
			});

export function ScanBarcodeScreen({ onBack }: Props) {
	const insets = useSafeAreaInsets();
	const [permission, requestPermission] = useCameraPermissions();
	const [estado, setEstado] = useState<Estado>("escaneando");
	const [producto, setProducto] = useState<ProductoDetalleResponse | null>(null);
	const [mensajeError, setMensajeError] = useState<string | null>(null);

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			requestPermission();
		}
	}, [permission, requestPermission]);

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

	const volverAEscanear = useCallback(() => {
		setProducto(null);
		setMensajeError(null);
		setEstado("escaneando");
	}, []);

	if (!permission) {
		return (
			<View style={styles.centrado}>
				<ActivityIndicator color={colors.cyan} />
			</View>
		);
	}

	if (!permission.granted) {
		return (
			<View style={styles.centrado}>
				<Ionicons name="camera-outline" size={40} color={colors.mutedText} />
				<Text style={styles.permisoTitulo}>Necesitamos la cámara</Text>
				<Text style={styles.permisoTexto}>
					Para escanear el código de barras de un producto y buscarte los
					precios, tenemos que poder usar la cámara.
				</Text>
				<Pressable style={styles.botonPrimario} onPress={requestPermission}>
					<Text style={styles.botonPrimarioTexto}>Permitir cámara</Text>
				</Pressable>
				<Pressable onPress={onBack}>
					<Text style={styles.linkSecundario}>Volver</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Escanear producto</Text>
				<View style={{ width: 32 }} />
			</View>

			{estado === "escaneando" || estado === "buscando" ? (
				<View style={styles.camaraWrap}>
					<CameraView
						style={StyleSheet.absoluteFill}
						facing="back"
						barcodeScannerSettings={{
							barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
						}}
						// Pasar undefined desactiva el escáner: sin esto la cámara
						// dispara el mismo código decenas de veces por segundo.
						onBarcodeScanned={
							estado === "escaneando"
								? ({ data }) => buscar(data)
								: undefined
						}
					/>

					<View style={styles.mira} pointerEvents="none" />

					<View style={styles.ayudaWrap} pointerEvents="none">
						{estado === "buscando" ? (
							<View style={styles.ayudaCargando}>
								<ActivityIndicator color={colors.buttonText} />
								<Text style={styles.ayudaTexto}>Buscando precios…</Text>
							</View>
						) : (
							<Text style={styles.ayudaTexto}>
								Apuntá al código de barras del producto
							</Text>
						)}
					</View>
				</View>
			) : estado === "error" ? (
				<View style={styles.centrado}>
					<Ionicons name="cloud-offline-outline" size={40} color={colors.orange} />
					<Text style={styles.permisoTitulo}>No pudimos buscarlo</Text>
					<Text style={styles.permisoTexto}>{mensajeError}</Text>
					<Pressable style={styles.botonPrimario} onPress={volverAEscanear}>
						<Text style={styles.botonPrimarioTexto}>Reintentar</Text>
					</Pressable>
				</View>
			) : (
				<Resultado producto={producto!} onEscanearOtro={volverAEscanear} />
			)}
		</View>
	);
}

function Resultado({
	producto,
	onEscanearOtro,
}: {
	producto: ProductoDetalleResponse;
	onEscanearOtro: () => void;
}) {
	return (
		<ScrollView
			style={styles.resultado}
			contentContainerStyle={styles.resultadoContent}
		>
			<View style={styles.productoCard}>
				{producto.imagenUrl ? (
					<Image
						source={{ uri: producto.imagenUrl }}
						style={styles.productoImagen}
						resizeMode="contain"
					/>
				) : (
					<View style={[styles.productoImagen, styles.imagenPlaceholder]}>
						<Ionicons name="image-outline" size={28} color={colors.mutedText} />
					</View>
				)}

				<View style={styles.productoInfo}>
					<Text style={styles.productoNombre} numberOfLines={3}>
						{producto.descripcion ?? "Producto sin nombre"}
					</Text>
					{producto.marca ? (
						<Text style={styles.productoMarca}>{producto.marca}</Text>
					) : null}
					<Text style={styles.productoEan}>EAN {producto.ean}</Text>
				</View>
			</View>

			{producto.sinPrecios ? (
				<View style={styles.avisoSinPrecios}>
					<Ionicons name="information-circle-outline" size={20} color={colors.orange} />
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
						<Text style={styles.precioDestacado}>
							{formatearPrecio(producto.precioMinimo)}
						</Text>
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
										<Text style={styles.comercioPrecio}>
											{formatearPrecio(comercio.precioMinimo)}
										</Text>
									</View>
								</View>
							))}
						</View>
					) : null}

					{producto.fechaDataset ? (
						<Text style={styles.pieDatos}>
							Datos de SEPA al {producto.fechaDataset}
						</Text>
					) : null}
				</>
			)}

			<Pressable style={styles.botonPrimario} onPress={onEscanearOtro}>
				<Ionicons name="barcode-outline" size={18} color={colors.buttonText} />
				<Text style={styles.botonPrimarioTexto}>Escanear otro</Text>
			</Pressable>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.navy,
		paddingHorizontal: 16,
		paddingBottom: 14,
	},
	backButton: { width: 32, height: 32, justifyContent: "center" },
	headerTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.bodyL,
	},

	camaraWrap: { flex: 1, backgroundColor: "#000" },
	mira: {
		position: "absolute",
		top: "30%",
		left: "10%",
		right: "10%",
		height: 160,
		borderWidth: 2,
		borderColor: colors.cyan,
		borderRadius: 16,
	},
	ayudaWrap: { position: "absolute", bottom: 48, left: 24, right: 24, alignItems: "center" },
	ayudaCargando: { flexDirection: "row", alignItems: "center", gap: 10 },
	ayudaTexto: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
		textAlign: "center",
	},

	centrado: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingHorizontal: 32,
		backgroundColor: colors.background,
	},
	permisoTitulo: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.bodyL,
	},
	permisoTexto: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		lineHeight: typography.lineHeights.caption,
		textAlign: "center",
	},
	linkSecundario: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.caption,
		marginTop: 4,
	},

	resultado: { flex: 1 },
	resultadoContent: { padding: 20, gap: 16 },
	productoCard: {
		flexDirection: "row",
		gap: 14,
		backgroundColor: colors.card,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 14,
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
		gap: 10,
		backgroundColor: "#FDF1EC",
		borderRadius: 14,
		padding: 14,
	},
	avisoTexto: {
		flex: 1,
		color: colors.orange,
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
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	precioDestacado: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
	},
	precioRango: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
	},

	comerciosWrap: { gap: 8 },
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
		paddingHorizontal: 14,
		paddingVertical: 12,
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
		paddingHorizontal: 8,
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
		gap: 8,
		backgroundColor: colors.navy,
		borderRadius: 14,
		paddingVertical: 15,
		paddingHorizontal: 24,
		marginTop: 4,
	},
	botonPrimarioTexto: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
	},
});
