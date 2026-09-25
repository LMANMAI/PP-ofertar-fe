import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { BottomNav, ProductPriceResult, ScreenHeader, type TabKey } from "../components";
import { useShopperContext } from "../hooks/useShopperContext";
import { getProductoPorEan } from "../services";
import type { ProductoDetalleResponse } from "../services";
import type { Session } from "../auth/session";

type Props = {
	productName: string;
	barcode: string | null;
	session: Session;
	onBack: () => void;
	onScanBarcode: () => void;
	/** Opens "Mis tiendas favoritas": the prices are read for those chains. */
	onOpenFavorites: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

type Estado = "sin-codigo" | "buscando" | "resultado" | "error";

export function ComparePricesScreen({
	productName,
	barcode,
	session,
	onBack,
	onScanBarcode,
	onOpenFavorites,
	activeTab,
	onSelectTab,
	onScanPress,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const shopper = useShopperContext(session.token, session.user.id);
	const [estado, setEstado] = useState<Estado>(barcode ? "buscando" : "sin-codigo");
	const [producto, setProducto] = useState<ProductoDetalleResponse | null>(null);
	const [mensajeError, setMensajeError] = useState<string | null>(null);

	const buscar = useCallback(async (ean: string) => {
		setEstado("buscando");
		try {
			setProducto(await getProductoPorEan(ean));
			setEstado("resultado");
		} catch (e) {
			setMensajeError(e instanceof Error ? e.message : "No pudimos consultar el producto.");
			setEstado("error");
		}
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches on mount / when the scanned barcode changes
		if (barcode) buscar(barcode);
	}, [barcode, buscar]);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Comparar precios" onBack={onBack} />

			{estado === "sin-codigo" && (
				<View style={styles.centrado}>
					<Ionicons name="barcode-outline" size={40} color={colors.mutedText2} accessible={false} />
					<Text style={styles.titulo}>No leímos el código de este producto</Text>
					<Text style={styles.texto}>
						El ticket no tenía un código de barras legible para{" "}
						<Text style={{ fontFamily: typography.family.bold }}>{productName}</Text>, así que no tenemos precios
						verificados para compararlo todavía. Escaneá el código del producto para ver precios reales.
					</Text>
					<Pressable
						style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
						onPress={onScanBarcode}
						accessibilityRole="button"
					>
						<Ionicons name="barcode-outline" size={18} color={colors.actionText} accessible={false} />
						<Text style={styles.botonPrimarioTexto}>Escanear código</Text>
					</Pressable>
				</View>
			)}

			{estado === "buscando" && (
				<View style={styles.centrado} accessibilityLiveRegion="polite">
					<ActivityIndicator color={colors.cyan} />
					<Text style={styles.texto}>Buscando precios de {productName}…</Text>
				</View>
			)}

			{estado === "error" && (
				<View style={styles.centrado} accessibilityRole="alert">
					<Ionicons name="cloud-offline-outline" size={40} color={colors.orange} accessible={false} />
					<Text style={styles.titulo}>No pudimos buscarlo</Text>
					<Text style={styles.texto}>{mensajeError}</Text>
					<Pressable
						style={(state) => [styles.botonPrimario, isFocused(state) && styles.focusRing]}
						onPress={() => barcode && buscar(barcode)}
						accessibilityRole="button"
					>
						<Text style={styles.botonPrimarioTexto}>Reintentar</Text>
					</Pressable>
				</View>
			)}

			{estado === "resultado" && producto && (
				<ScrollView contentContainerStyle={styles.resultadoContent} keyboardShouldPersistTaps="handled">
					<ProductPriceResult
						producto={producto}
						fallbackName={productName}
						shopper={shopper}
						onOpenFavorites={onOpenFavorites}
						onRetry={() => barcode && buscar(barcode)}
						onScanTicket={onScanPress}
					/>
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		focusRing: focusRing(colors),
		centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xxl, backgroundColor: colors.background },
		titulo: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.bodyL, textAlign: "center" },
		texto: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.label, lineHeight: lineHeights.label, textAlign: "center" },
		resultadoContent: { padding: space.xl, gap: space.lg },
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
		botonPrimarioTexto: { color: colors.actionText, fontFamily: typography.family.bold, fontSize: sizes.body },
	});
}
