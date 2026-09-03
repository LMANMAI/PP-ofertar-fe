import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { ensureLocationPermission } from "../location/permission";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useIsDarkMode, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { DARK_MAP_STYLE } from "../theme/darkMapStyle";
import { BottomNav, type TabKey } from "../components";
import type { Session } from "../auth/session";
import { getFavoriteStores, getNearbyStores, getStoreChains, updateFavoriteStores } from "../services";
import type { NearbyStore, StoreChain } from "../services";

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20];

/** Fallback view when location permission is denied — Obelisco, CABA. */
const DEFAULT_REGION = { latitude: -34.6037, longitude: -58.3816 };

/** Distinct pin colours so chains are tellable apart at a glance. */
const CHAIN_COLORS: Record<string, string> = {
	carrefour: "#0E4C96",
	dia: "#E30613",
	coto: "#D52B1E",
	jumbo: "#2E9E43",
	vea: "#F5A623",
	disco: "#C8102E",
	changomas: "#7B2D8B",
	laanonima: "#00539B",
	makro: "#003DA5",
};

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onSelectStore?: (store: NearbyStore) => void;
};

export function FavoriteStoresScreen({ onBack, session, activeTab, onSelectTab, onScanPress, onSelectStore }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [chains, setChains] = useState<StoreChain[]>([]);
	const [favorites, setFavorites] = useState<Set<string>>(new Set());
	const [radiusKm, setRadiusKm] = useState(5);
	const [stores, setStores] = useState<NearbyStore[]>([]);
	const [coords, setCoords] = useState(DEFAULT_REGION);
	const [locationDenied, setLocationDenied] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				// Only prompts when the permission was not already granted during
				// registration; a user who denied it there is asked again here,
				// where the radius search genuinely depends on it.
				const { granted } = await ensureLocationPermission();
				if (granted) {
					const pos = await Location.getCurrentPositionAsync({});
					setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
				} else {
					setLocationDenied(true);
				}
			} catch {
				setLocationDenied(true);
			}

			try {
				const [chainList, fav] = await Promise.all([
					getStoreChains(session.token),
					getFavoriteStores(session.token),
				]);
				setChains(chainList);
				setFavorites(new Set(fav.chainSlugs));
				setRadiusKm(fav.radiusKm);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error al cargar tus tiendas");
			} finally {
				setLoading(false);
			}
		})();
	}, [session.token]);

	const loadStores = useCallback(async () => {
		try {
			const nearby = await getNearbyStores(session.token, coords.latitude, coords.longitude, radiusKm);
			setStores(nearby);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cargar sucursales");
		}
	}, [session.token, coords.latitude, coords.longitude, radiusKm]);

	useEffect(() => {
		if (!loading) loadStores();
	}, [loading, loadStores]);

	const persist = async (nextFavorites: Set<string>, nextRadius: number) => {
		setSaving(true);
		try {
			await updateFavoriteStores(session.token, {
				chainSlugs: [...nextFavorites],
				radiusKm: nextRadius,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo guardar la preferencia");
		} finally {
			setSaving(false);
		}
	};

	const toggleChain = (slug: string) => {
		const next = new Set(favorites);
		if (next.has(slug)) next.delete(slug);
		else next.add(slug);
		setFavorites(next);
		persist(next, radiusKm);
	};

	const changeRadius = (km: number) => {
		setRadiusKm(km);
		persist(favorites, km);
	};

	// With no chain selected the user hasn't filtered yet, so showing every
	// branch matches how the backend treats an empty favourites list.
	const visibleStores = useMemo(
		() => (favorites.size === 0 ? stores : stores.filter((s) => favorites.has(s.chainSlug))),
		[stores, favorites],
	);

	// Rough degrees-per-km so the initial zoom frames the selected radius.
	const latitudeDelta = Math.max(0.02, (radiusKm / 111) * 2.5);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Mis tiendas favoritas</Text>
			</View>

			{loading ? (
				<View style={styles.loaderWrap}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			) : (
				<ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
					<View style={styles.mapWrap}>
						<MapView
							provider={PROVIDER_DEFAULT}
							customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
							style={StyleSheet.absoluteFill}
							region={{
								latitude: coords.latitude,
								longitude: coords.longitude,
								latitudeDelta,
								longitudeDelta: latitudeDelta,
							}}
						>
							<Circle
								center={coords}
								radius={radiusKm * 1000}
								strokeColor="rgba(0,163,224,0.6)"
								fillColor="rgba(0,163,224,0.12)"
							/>
							{visibleStores.map((s) => (
								<Marker
									key={`${s.chainSlug}-${s.externalId}`}
									coordinate={{ latitude: s.lat, longitude: s.lng }}
									title={s.name}
									description={`${s.chainName} · ${s.distanceKm} km`}
									pinColor={CHAIN_COLORS[s.chainSlug] ?? colors.navy}
									onCalloutPress={() => onSelectStore?.(s)}
								/>
							))}
						</MapView>
					</View>

					{locationDenied && (
						<View style={styles.warnBanner}>
							<Ionicons name="location-outline" size={16} color={colors.warningSoftText} />
							<Text style={styles.warnText}>
								Sin permiso de ubicación: mostrando el centro de CABA
							</Text>
						</View>
					)}

					{error && (
						<View style={styles.errorBanner}>
							<Ionicons name="warning-outline" size={16} color={colors.orange} />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					<Text style={styles.sectionLabel}>RADIO DE BÚSQUEDA</Text>
					<View style={styles.radiusRow}>
						{RADIUS_OPTIONS.map((km) => (
							<Pressable
								key={km}
								style={[styles.radiusChip, radiusKm === km && styles.radiusChipOn]}
								onPress={() => changeRadius(km)}
								disabled={saving}
							>
								<Text style={[styles.radiusText, radiusKm === km && styles.radiusTextOn]}>{km} km</Text>
							</Pressable>
						))}
					</View>

					<Text style={styles.sectionLabel}>
						CADENAS {favorites.size > 0 ? `(${favorites.size} elegidas)` : "(todas)"}
					</Text>
					<Text style={styles.sectionHint}>
						Elegí dónde comprás: solo vas a ver ofertas de esas cadenas.
					</Text>
					<View style={styles.chainList}>
						{chains.map((c, idx) => {
							const on = favorites.has(c.slug);
							const count = stores.filter((s) => s.chainSlug === c.slug).length;
							return (
								<View key={c.slug}>
									<Pressable style={styles.chainRow} onPress={() => toggleChain(c.slug)} disabled={saving}>
										<View style={[styles.dot, { backgroundColor: CHAIN_COLORS[c.slug] ?? colors.navy }]} />
										<View style={{ flex: 1 }}>
											<Text style={styles.chainName}>{c.name}</Text>
											<Text style={styles.chainMeta}>
												{count > 0 ? `${count} cerca tuyo` : "Sin sucursales en el radio"}
											</Text>
										</View>
										<View style={[styles.check, on && styles.checkOn]}>
											{on && <Ionicons name="checkmark" size={14} color="#fff" />}
										</View>
									</Pressable>
									{idx < chains.length - 1 && <View style={styles.divider} />}
								</View>
							);
						})}
					</View>
				</ScrollView>
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
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	mapWrap: { height: 280, backgroundColor: colors.divider },
	warnBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, backgroundColor: colors.warningSoft, borderRadius: 10, padding: 10 },
	warnText: { flex: 1, color: colors.warningSoftText, fontFamily: typography.family.medium, fontSize: 12 },
	errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10 },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 12 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 18, marginHorizontal: 16 },
	sectionHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12, marginHorizontal: 16, marginTop: 4 },
	radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginTop: 10 },
	radiusChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
	radiusChipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
	radiusText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	radiusTextOn: { color: colors.buttonText },
	chainList: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.divider, marginHorizontal: 16, marginTop: 10, overflow: "hidden" },
	chainRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
	dot: { width: 12, height: 12, borderRadius: 6 },
	chainName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	chainMeta: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 11, marginTop: 2 },
	check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
	checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
	divider: { height: 1, backgroundColor: colors.divider, marginLeft: 38 },
	});
}
