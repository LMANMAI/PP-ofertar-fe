import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useIsDarkMode, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { DARK_MAP_STYLE } from "../theme/darkMapStyle";
import { BottomNav, type TabKey } from "../components";
import type { NearbyStore } from "../services";

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

	const openInMaps = () => {
		if (!store) return;
		const label = encodeURIComponent(store.name);
		Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}&query_place_id=${label}`);
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle} numberOfLines={1}>
					{store?.chainName ?? "Sucursal"}
				</Text>
			</View>

			{!store ? (
				<View style={styles.emptyWrap}>
					<Ionicons name="storefront-outline" size={40} color={colors.mutedText} />
					<Text style={styles.emptyText}>No encontramos esta sucursal.</Text>
				</View>
			) : (
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={{ paddingBottom: 16 }}
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
							<Marker coordinate={{ latitude: store.lat, longitude: store.lng }} title={store.name} />
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

							{(store.address || store.city) && (
								<View style={styles.infoRow}>
									<Ionicons name="location-outline" size={16} color={colors.subtleText} />
									<Text style={styles.infoText}>
										{[store.address, store.city].filter(Boolean).join(", ")}
									</Text>
								</View>
							)}
							<View style={styles.infoRow}>
								<Ionicons name="navigate-outline" size={16} color={colors.subtleText} />
								<Text style={styles.infoText}>{store.distanceKm.toFixed(1)} km de vos</Text>
							</View>
						</View>

						<Text style={styles.disclaimer}>
							No tenemos horarios, teléfono ni medios de pago cargados para
							esta sucursal todavía — solo la ubicación que reporta el súper.
						</Text>
					</View>
				</ScrollView>
			)}

			{store && (
				<View style={styles.footer}>
					<Pressable style={styles.primaryButton} onPress={openInMaps}>
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
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	scroll: { flex: 1 },
	emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
	emptyText: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, textAlign: "center" },
	mapWrap: { height: 200, backgroundColor: colors.divider },
	content: { padding: 16, gap: 12 },
	summaryCard: {
		backgroundColor: colors.card,
		borderRadius: 16,
		padding: 16,
		gap: 12,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
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
		fontSize: 15,
	},
	storeChain: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	infoText: {
		flex: 1,
		color: colors.defaultText,
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
	disclaimer: {
		color: colors.subtleText,
		fontFamily: typography.family.regular,
		fontSize: 12,
		lineHeight: 17,
	},
	footer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
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
		gap: 8,
	},
	primaryButtonText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	});
}
