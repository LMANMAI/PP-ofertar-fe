import { useMemo, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "../components/ui/AppMapView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useIsDarkMode, useThemeColors, type ColorTokens, radii, focusRing, isFocused } from "../theme/designSystem";
import { DARK_MAP_STYLE } from "../theme/darkMapStyle";
import { BottomNav, ChainMarkerPin, ScreenHeader, type TabKey } from "../components";
import { getChainMarker, markerAccessibilityLabel } from "../theme/chainMarkers";
import type { NearbyStore } from "../services";
import { StoreStatusLine } from "../components/StoreStatusLine";
import { useNow } from "../hooks/useNow";
import { directionsUrl } from "../utils/directions";
import { describeWeek, openingStatus } from "../utils/openingHours";

type Props = {
	store: NearbyStore | null;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function StoreDetailScreen({ store, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const now = useNow(60_000);
	const [mapError, setMapError] = useState(false);

	// Una ruta hasta la sucursal y no una búsqueda: antes abría Google Maps
	// buscando las coordenadas, y había que tocar "Cómo llegar" otra vez ahí.
	// El mismo enlace que la lista de precios (Apple Maps en iOS, Google Maps en
	// el resto).
	const openInMaps = () => {
		if (!store) return;
		setMapError(false);
		Linking.openURL(directionsUrl(Platform.OS, store.lat, store.lng)).catch(() => setMapError(true));
	};

	const address = store ? [store.address, store.city].filter(Boolean).join(", ") : "";
	const status = store ? openingStatus(store.horarios, now) : null;
	const week = store ? describeWeek(store.horarios, now) : null;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title={store?.chainName ?? "Sucursal"} onBack={onBack} />

			{!store ? (
				<View style={styles.emptyWrap}>
					<Ionicons name="storefront-outline" size={40} color={colors.mutedText} />
					<Text style={styles.emptyText}>No encontramos esta sucursal.</Text>
				</View>
			) : (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={{ paddingBottom: space.lg }}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.mapWrap}>
						<MapView
							provider={PROVIDER_DEFAULT}
							customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
							style={StyleSheet.absoluteFill}
							region={{
								latitude: store.lat,
								longitude: store.lng,
								latitudeDelta: 0.01,
								longitudeDelta: 0.01,
							}}
							scrollEnabled={false}
							zoomEnabled={false}
						>
							<Marker
								coordinate={{ latitude: store.lat, longitude: store.lng }}
								title={store.name}
								description={store.chainName}
								anchor={{ x: 0.5, y: 1 }}
								accessibilityLabel={markerAccessibilityLabel(
									getChainMarker(store.chainSlug, store.chainName),
									store.chainName,
									store.name,
								)}
							>
								{/* Un pin suelto también tiene que decir de qué cadena es. */}
								<ChainMarkerPin chainSlug={store.chainSlug} chainName={store.chainName} withPointer />
							</Marker>
						</MapView>
					</View>

					<View style={styles.content}>
						<View style={styles.summaryCard}>
							<View style={styles.summaryHeader}>
								<View style={styles.storeBadge}>
									<Ionicons name="storefront" size={18} color={colors.buttonText} />
								</View>
								<View style={{ flex: 1, gap: 2 }}>
									<Text style={styles.storeName}>{store.name}</Text>
									<Text style={styles.storeChain}>{store.chainName}</Text>
								</View>
							</View>

							{status && <StoreStatusLine status={status} />}

							{address ? (
								<Pressable
									style={(state) => [styles.infoRow, styles.addressLink, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
									onPress={openInMaps}
									accessibilityRole="link"
									accessibilityLabel={`Cómo llegar a ${store.chainName}, ${address}`}
								>
									<Ionicons name="location-outline" size={16} color={colors.actionFill} />
									<Text style={[styles.infoText, styles.addressText]}>{address}</Text>
								</Pressable>
							) : null}
							<View style={styles.infoRow}>
								<Ionicons name="navigate-outline" size={16} color={colors.subtleText} />
								{/* Del punto de búsqueda, que puede ser Casa o Trabajo y no donde estás. */}
								<Text style={styles.infoText}>
									A {store.distanceKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km del lugar de búsqueda
								</Text>
							</View>
							{mapError && (
								<Text style={styles.errorText} accessibilityRole="alert">
									No pudimos abrir el mapa. Buscá la dirección en tu app de mapas.
								</Text>
							)}
						</View>

						{week && (
							<View style={styles.summaryCard}>
								<Text style={styles.hoursTitle} accessibilityRole="header">
									Horarios
								</Text>
								{week.map((line) => (
									<View key={line.dia} style={styles.hoursRow} accessible accessibilityLabel={`${line.nombre}${line.hoy ? ", hoy" : ""}: ${line.texto.replace("24 h", "las 24 horas")}`}>
										<Text style={[styles.hoursDay, line.hoy && styles.hoursToday]}>
											{line.nombre}
											{line.hoy ? " (hoy)" : ""}
										</Text>
										<Text style={[styles.hoursText, line.hoy && styles.hoursToday]}>{line.texto}</Text>
									</View>
								))}
								<Text style={styles.disclaimer}>Horarios informados por la cadena; en feriados pueden cambiar.</Text>
							</View>
						)}

						<Text style={styles.disclaimer}>
							{week
								? "No tenemos teléfono ni medios de pago cargados para esta sucursal todavía."
								: "No tenemos horarios, teléfono ni medios de pago cargados para esta sucursal todavía — solo la ubicación que reporta el súper."}
						</Text>
					</View>
				</ScrollView>
			)}

			{store && (
				<View style={styles.footer}>
					<Pressable
						style={(state) => [styles.primaryButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
						onPress={openInMaps}
						accessibilityRole="button"
						accessibilityLabel={`Cómo llegar a ${store.chainName}${address ? `, ${address}` : ""}`}
					>
						<Ionicons name="map-outline" size={18} color={colors.cyan} />
						<Text style={styles.primaryButtonText}>Cómo llegar</Text>
					</Pressable>
				</View>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.smPlus, paddingHorizontal: 32 },
	emptyText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.label, textAlign: "center" },
	mapWrap: { height: 200, backgroundColor: colors.divider },
	content: { padding: space.lg, gap: space.md },
	summaryCard: {
		backgroundColor: colors.card,
		borderRadius: radii.lg,
		padding: space.lg,
		gap: space.md,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: space.md },
	storeBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
	},
	storeName: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.body,
	},
	storeChain: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
	},
	infoRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
	addressLink: { minHeight: 44 },
	addressText: { color: colors.actionFill, fontFamily: typography.family.medium, textDecorationLine: "underline" },
	errorText: { color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	hoursTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.body },
	hoursRow: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
	hoursDay: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	hoursText: { flexShrink: 1, textAlign: "right", color: colors.defaultText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	hoursToday: { color: colors.defaultText, fontFamily: typography.family.bold },
	pressed: { opacity: 0.88 },
	focusRing: focusRing(colors),
	infoText: {
		flex: 1,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
	},
	disclaimer: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: 17,
	},
	footer: {
		paddingHorizontal: space.lg,
		paddingTop: space.md,
		paddingBottom: space.md,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	primaryButton: {
		backgroundColor: colors.navy,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: space.sm,
	},
	primaryButtonText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.subtitle,
	},
	});
}
