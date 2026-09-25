import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { InputField, ProductPriceResult, ScanModeSwitch, ScreenHeader } from "../components";
import { useShopperContext } from "../hooks/useShopperContext";
import { getProductoPorEan, SepaError } from "../services";
import type { ProductoDetalleResponse } from "../services";
import type { Session } from "../auth/session";

/** The camera keeps seeing the product it just read. Ignoring the same code for
 * this long after coming back to the viewfinder stops it from firing again. */
const RESCAN_IGNORE_MS = 2500;

type Props = {
	onBack: () => void;
	session: Session;
	/** Reading a receipt is the camera's other mode. */
	onChooseTicket: () => void;
	/** Opens "Mis tiendas favoritas": the prices are read for those chains. */
	onOpenFavorites: () => void;
};

type Estado = "escaneando" | "manual" | "buscando" | "resultado" | "error";

const ERROR_ICON: Record<SepaError["kind"], keyof typeof Ionicons.glyphMap> = {
	invalid: "barcode-outline",
	network: "cloud-offline-outline",
	timeout: "hourglass-outline",
	server: "alert-circle-outline",
};

const ERROR_TITLE: Record<SepaError["kind"], string> = {
	invalid: "Revisá el código",
	network: "Sin conexión",
	timeout: "Tardó demasiado",
	server: "No pudimos buscarlo",
};

/** A barcode is 8 to 14 digits. Anything else is a typo, said before asking. */
const isPlausibleCode = (code: string) => /^\d{8,14}$/.test(code);

export function ScanBarcodeScreen({ onBack, session, onChooseTicket, onOpenFavorites }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const shopper = useShopperContext(session.token, session.user.id);
	const [permission, requestPermission] = useCameraPermissions();
	const [estado, setEstado] = useState<Estado>("escaneando");
	const [producto, setProducto] = useState<ProductoDetalleResponse | null>(null);
	const [error, setError] = useState<SepaError | null>(null);
	const [ean, setEan] = useState<string | null>(null);
	const [manual, setManual] = useState("");
	const [manualError, setManualError] = useState<string | null>(null);
	const lastScan = useRef<{ ean: string; at: number } | null>(null);

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			requestPermission();
		}
	}, [permission, requestPermission]);

	const buscar = useCallback(async (code: string) => {
		lastScan.current = { ean: code, at: Date.now() };
		setEan(code);
		setEstado("buscando");
		try {
			setProducto(await getProductoPorEan(code));
			setEstado("resultado");
		} catch (e) {
			setError(e instanceof SepaError ? e : new SepaError("server", "No pudimos consultar el producto. Probá de nuevo."));
			setEstado("error");
		}
	}, []);

	const volverAEscanear = useCallback(() => {
		if (lastScan.current) lastScan.current.at = Date.now();
		setProducto(null);
		setError(null);
		setManualError(null);
		setEstado("escaneando");
	}, []);

	const handleScanned = ({ data }: { data: string }) => {
		const last = lastScan.current;
		if (last && last.ean === data && Date.now() - last.at < RESCAN_IGNORE_MS) return;
		buscar(data);
	};

	const submitManual = () => {
		const code = manual.replace(/\D/g, "");
		if (!isPlausibleCode(code)) {
			setManualError("Un código de barras tiene entre 8 y 14 números. Revisá que esté completo.");
			return;
		}
		setManualError(null);
		buscar(code);
	};

	const cameraOn = permission?.granted === true;
	const title = estado === "resultado" ? "Precio del producto" : "Escanear producto";

	// The camera is only needed to scan: typing a code, waiting and reading the
	// result all work without it.
	if (estado === "escaneando" && !permission) {
		return (
			<View style={styles.safeArea}>
				<ScreenHeader title={title} onBack={onBack} />
				<View style={styles.centrado}>
					<ActivityIndicator color={colors.cyan} />
				</View>
			</View>
		);
	}

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title={title} onBack={onBack} />

			{estado === "escaneando" && !cameraOn && (
				<View style={styles.centrado}>
					<Ionicons name="camera-outline" size={40} color={colors.mutedText2} accessible={false} />
					<Text style={styles.titulo}>Necesitamos la cámara</Text>
					<Text style={styles.texto}>
						Para escanear el código de barras de un producto tenemos que poder usar la cámara. También podés
						escribir el código.
					</Text>
					<Pressable
						style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
						onPress={permission?.canAskAgain ? requestPermission : () => Linking.openSettings()}
						accessibilityRole="button"
					>
						<Text style={styles.botonPrimarioTexto}>{permission?.canAskAgain ? "Permitir cámara" : "Abrir ajustes"}</Text>
					</Pressable>
					<Pressable
						style={(state) => [styles.botonSecundario, isFocused(state) && styles.focusRing]}
						onPress={() => setEstado("manual")}
						accessibilityRole="button"
					>
						<Text style={styles.botonSecundarioTexto}>Escribir el código</Text>
					</Pressable>
				</View>
			)}

			{estado === "escaneando" && cameraOn && (
				<View style={styles.camaraWrap}>
					<CameraView
						style={StyleSheet.absoluteFill}
						facing="back"
						barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
						onBarcodeScanned={handleScanned}
					/>
					<View style={styles.mira} pointerEvents="none" />
					<View style={[styles.controles, { bottom: insets.bottom + space.xxl }]} pointerEvents="box-none">
						<View style={styles.ayuda} pointerEvents="none">
							<Text style={styles.ayudaTexto}>Apuntá al código de barras del producto</Text>
						</View>
						<Pressable
							style={(state) => [styles.linkCamara, isFocused(state) && styles.focusRingLight]}
							onPress={() => setEstado("manual")}
							accessibilityRole="button"
						>
							<Text style={styles.linkCamaraTexto}>¿No lo lee? Escribí el código</Text>
						</Pressable>
						<ScanModeSwitch mode="barcode" onSelect={(m) => m === "ticket" && onChooseTicket()} />
					</View>
				</View>
			)}

			{estado === "manual" && (
				<ScrollView contentContainerStyle={styles.manualContent} keyboardShouldPersistTaps="handled">
					<Text style={styles.titulo}>Escribí el código</Text>
					<Text style={styles.texto}>Está debajo de las barras del envase, son entre 8 y 14 números.</Text>
					<InputField
						label="Código de barras"
						leftIcon="barcode-outline"
						value={manual}
						onChangeText={(t) => {
							setManual(t.replace(/\D/g, ""));
							setManualError(null);
						}}
						keyboardType="number-pad"
						returnKeyType="search"
						onSubmitEditing={submitManual}
						error={manualError ?? undefined}
					/>
					<Pressable
						style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
						onPress={submitManual}
						accessibilityRole="button"
					>
						<Text style={styles.botonPrimarioTexto}>Buscar precios</Text>
					</Pressable>
					<Pressable
						style={(state) => [styles.link, isFocused(state) && styles.focusRing]}
						onPress={volverAEscanear}
						accessibilityRole="button"
					>
						<Text style={styles.linkTexto}>{cameraOn ? "Volver a la cámara" : "Cancelar"}</Text>
					</Pressable>
				</ScrollView>
			)}

			{estado === "buscando" && (
				<View style={styles.centrado} accessibilityLiveRegion="polite">
					<ActivityIndicator color={colors.cyan} />
					<Text style={styles.texto}>Buscando precios…</Text>
					{ean && <Text style={styles.codigo}>Código {ean}</Text>}
				</View>
			)}

			{estado === "error" && error && (
				<View style={styles.centrado} accessibilityRole="alert">
					<Ionicons name={ERROR_ICON[error.kind]} size={40} color={colors.orange} accessible={false} />
					<Text style={styles.titulo}>{ERROR_TITLE[error.kind]}</Text>
					<Text style={styles.texto}>{error.message}</Text>
					{error.kind === "invalid" ? (
						<Pressable
							style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
							onPress={() => setEstado("manual")}
							accessibilityRole="button"
						>
							<Text style={styles.botonPrimarioTexto}>Escribir el código</Text>
						</Pressable>
					) : (
						<Pressable
							style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
							onPress={() => ean && buscar(ean)}
							accessibilityRole="button"
						>
							<Text style={styles.botonPrimarioTexto}>Reintentar</Text>
						</Pressable>
					)}
					<Pressable
						style={(state) => [styles.botonSecundario, isFocused(state) && styles.focusRing]}
						onPress={volverAEscanear}
						accessibilityRole="button"
					>
						<Text style={styles.botonSecundarioTexto}>Escanear otro</Text>
					</Pressable>
				</View>
			)}

			{estado === "resultado" && producto && (
				<>
					<ScrollView contentContainerStyle={styles.resultadoContent} keyboardShouldPersistTaps="handled">
						<ProductPriceResult
							producto={producto}
							shopper={shopper}
							onOpenFavorites={onOpenFavorites}
							onRetry={() => ean && buscar(ean)}
							onEnterCode={() => setEstado("manual")}
							onScanTicket={onChooseTicket}
						/>
					</ScrollView>
					{/* Fixed: with a list of stores under the product, "scan another" used to
					    sit a full scroll away, and the next product is what comes next. */}
					<View style={[styles.pie, { paddingBottom: insets.bottom + space.md }]}>
						<Pressable
							style={(state) => [styles.botonPrimario, styles.botonPie, isFocused(state) && styles.focusRing]}
							onPress={volverAEscanear}
							accessibilityRole="button"
						>
							<Ionicons name="barcode-outline" size={18} color={colors.actionText} accessible={false} />
							<Text style={styles.botonPrimarioTexto}>Escanear otro</Text>
						</Pressable>
					</View>
				</>
			)}
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		focusRing: focusRing(colors),
		focusRingLight: { outlineWidth: 2, outlineColor: colors.buttonText, outlineOffset: 2, outlineStyle: "solid" },

		camaraWrap: { flex: 1, backgroundColor: "#000" },
		mira: {
			position: "absolute",
			top: "30%",
			left: "10%",
			right: "10%",
			height: 160,
			borderWidth: 2,
			borderColor: colors.cyan,
			borderRadius: radii.lg,
		},
		controles: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: space.md },
		// A scrim behind the words: they sit over a live camera, so their contrast
		// is whatever the shop's lighting happens to be.
		ayuda: { paddingHorizontal: space.lg, paddingVertical: space.smPlus, borderRadius: radii.md, backgroundColor: "rgba(0,0,0,0.6)" },
		ayudaTexto: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: sizes.body, textAlign: "center" },
		linkCamara: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radii.full, backgroundColor: "rgba(0,0,0,0.6)" },
		linkCamaraTexto: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },

		centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl, backgroundColor: colors.background },
		titulo: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.bodyL, textAlign: "center" },
		texto: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.label, lineHeight: lineHeights.label, textAlign: "center" },
		codigo: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro },

		manualContent: { padding: space.xl, gap: space.lg },
		resultadoContent: { padding: space.xl, gap: space.lg },
		pie: { paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider },

		botonPrimario: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.sm,
			minHeight: 48,
			paddingHorizontal: space.xxl,
			borderRadius: radii.md,
			backgroundColor: colors.actionFill,
		},
		botonPie: { alignSelf: "stretch" },
		botonPrimarioTexto: { color: colors.actionText, fontFamily: typography.family.bold, fontSize: sizes.body },
		botonSecundario: {
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: space.xxl,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
		},
		botonSecundarioTexto: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label },
		link: { minHeight: 44, alignItems: "center", justifyContent: "center" },
		linkTexto: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },
	});
}
