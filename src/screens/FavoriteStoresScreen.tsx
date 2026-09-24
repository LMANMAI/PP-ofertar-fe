import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "../components/ui/AppMapView";
import { ensureLocationPermission } from "../location/permission";
import {
	clearSearchOrigin,
	describePoint,
	findPlace,
	getDevicePosition,
	loadSearchOrigin,
	saveSearchOrigin,
	type SearchOrigin,
} from "../location/searchOrigin";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, space, typography, useIsDarkMode, useIsTablet, useThemeColors, type ColorTokens, focusRing, isFocused } from "../theme/designSystem";
import { DARK_MAP_STYLE } from "../theme/darkMapStyle";
import { BottomNav, ChainMarkerPin, ErrorBanner, InlineNotice, InputField, LoadingState, PrimaryButton, ScreenHeader, type TabKey, SectionLabel } from "../components";
import { getChainMarker, markerAccessibilityLabel } from "../theme/chainMarkers";
import type { Session } from "../auth/session";
import { getFavoriteStores, getNearbyStores, getStoreChains, updateFavoriteStores } from "../services";
import type { NearbyStore, StoreChain } from "../services";
import { useKeyboardVisible } from "../utils/useKeyboardVisible";

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20];

/** Fallback view when location is unavailable — Obelisco, CABA. */
const DEFAULT_REGION = { latitude: -34.6037, longitude: -58.3816 };

const MAP_HEIGHT = 240;
/** Branches listed before "Ver todas". */
const STORES_PREVIEW = 6;

// Map overlay for the search radius: drawn on the map tiles, not on the theme.
const RADIUS_STROKE = "rgba(0,163,224,0.6)";
const RADIUS_FILL = "rgba(0,163,224,0.12)";

/** Where the search is centred: where the user is, a place they chose, or the
 * fallback when they are neither reachable nor have chosen one. */
type OriginKind = "default" | "current" | "custom";

/** Why the device location is not being used, when it is not. */
type LocationIssue = "denied" | "unavailable" | null;

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
	const isTablet = useIsTablet();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const keyboardOpen = useKeyboardVisible();
	const mapRef = useRef<MapView>(null);
	// Each nearby-stores request takes a number; only the latest one may land.
	const storesSeq = useRef(0);
	// A tap on a store's pin also reaches the map's own onPress, on some
	// platforms first and on others after. Either way it must not be read as
	// "search around here": the map tap waits a moment, and a pin tap in that
	// window (or just before it) cancels it.
	const markerTapped = useRef(false);
	const markerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingMapPress = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [chains, setChains] = useState<StoreChain[]>([]);
	const [favorites, setFavorites] = useState<Set<string>>(new Set());
	const [radiusKm, setRadiusKm] = useState(5);
	const [stores, setStores] = useState<NearbyStore[]>([]);
	const [showAllStores, setShowAllStores] = useState(false);
	const [coords, setCoords] = useState(DEFAULT_REGION);
	const [originKind, setOriginKind] = useState<OriginKind>("default");
	const [originLabel, setOriginLabel] = useState<string | null>(null);
	// False until we know where to search: nearby stores wait for it, so the
	// first request is for the right place and not for the fallback.
	const [originReady, setOriginReady] = useState(false);
	const [locationIssue, setLocationIssue] = useState<LocationIssue>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [query, setQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [locating, setLocating] = useState(false);
	const [originMessage, setOriginMessage] = useState<string | null>(null);

	// Chains and saved preferences: independent of where the user is, so they
	// no longer wait for the location to resolve.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [chainList, fav] = await Promise.all([
					getStoreChains(session.token),
					getFavoriteStores(session.token),
				]);
				if (cancelled) return;
				setChains(chainList);
				setFavorites(new Set(fav.chainSlugs));
				setRadiusKm(fav.radiusKm);
				setError(null);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar tus tiendas");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [session.token, reloadKey]);

	// Where to search. A place the user chose earlier wins: it is what they
	// asked to search around, and using it skips the permission prompt.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const saved = await loadSearchOrigin(session.user.id);
			if (cancelled) return;
			if (saved) {
				setCoords({ latitude: saved.latitude, longitude: saved.longitude });
				setOriginKind("custom");
				setOriginLabel(saved.label);
				setOriginReady(true);
				return;
			}
			try {
				// Only prompts when the permission was not already granted during
				// registration; a user who denied it there is asked again here,
				// where the radius search genuinely depends on it.
				const { granted } = await ensureLocationPermission();
				if (!granted) {
					if (!cancelled) setLocationIssue("denied");
				} else {
					const position = await getDevicePosition();
					if (cancelled) return;
					if (position) {
						setCoords(position);
						setOriginKind("current");
					} else {
						setLocationIssue("unavailable");
					}
				}
			} catch {
				if (!cancelled) setLocationIssue("unavailable");
			}
			if (!cancelled) setOriginReady(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [session.user.id]);

	const loadStores = useCallback(async () => {
		const seq = ++storesSeq.current;
		try {
			const nearby = await getNearbyStores(session.token, coords.latitude, coords.longitude, radiusKm);
			if (seq !== storesSeq.current) return;
			setStores(nearby);
			setError(null);
		} catch (err) {
			if (seq !== storesSeq.current) return;
			setError(err instanceof Error ? err.message : "Error al cargar sucursales");
		}
	}, [session.token, coords.latitude, coords.longitude, radiusKm]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- fetches nearby stores once the radius and the origin are known
		if (!loading && originReady) loadStores();
	}, [loading, originReady, loadStores]);

	// Rough degrees-per-km so the zoom frames the selected radius.
	const latitudeDelta = Math.max(0.02, (radiusKm / 111) * 2.5);

	// The map is moved with animateToRegion instead of a controlled `region`
	// prop: with `region`, every re-render (each letter typed in the search
	// field) can snap a panned map back to where the props say it should be.
	useEffect(() => {
		if (!originReady) return;
		mapRef.current?.animateToRegion(
			{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta, longitudeDelta: latitudeDelta },
			350,
		);
	}, [originReady, coords.latitude, coords.longitude, latitudeDelta]);

	// Optimistic, but undone when the server refuses: the row must not show a
	// choice that was never saved.
	const persist = async (nextFavorites: Set<string>, nextRadius: number, undo: () => void) => {
		setSaving(true);
		try {
			await updateFavoriteStores(session.token, {
				chainSlugs: [...nextFavorites],
				radiusKm: nextRadius,
			});
			setError(null);
		} catch (err) {
			undo();
			setError(
				`${err instanceof Error ? err.message : "No se pudo guardar la preferencia"}. Se mantuvo tu elección anterior.`,
			);
		} finally {
			setSaving(false);
		}
	};

	useEffect(
		() => () => {
			if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
			if (markerTimer.current) clearTimeout(markerTimer.current);
		},
		[],
	);

	const noteMarkerPress = () => {
		markerTapped.current = true;
		if (markerTimer.current) clearTimeout(markerTimer.current);
		markerTimer.current = setTimeout(() => {
			markerTapped.current = false;
		}, 500);
		if (pendingMapPress.current) {
			clearTimeout(pendingMapPress.current);
			pendingMapPress.current = null;
		}
	};

	const applyCustomOrigin = (origin: SearchOrigin) => {
		setCoords({ latitude: origin.latitude, longitude: origin.longitude });
		setOriginKind("custom");
		setOriginLabel(origin.label);
		setOriginReady(true);
		saveSearchOrigin(session.user.id, origin);
	};

	const handleSearch = async () => {
		if (searching) return;
		if (!query.trim()) {
			setOriginMessage("Escribí una dirección, un barrio o una ciudad.");
			return;
		}
		setSearching(true);
		setOriginMessage(null);
		try {
			const place = await findPlace(query);
			if (place) {
				applyCustomOrigin(place);
				setOriginMessage(null);
			} else {
				setOriginMessage("No encontramos ese lugar en Argentina. Probá con la calle y la ciudad.");
			}
		} catch {
			setOriginMessage("No pudimos buscar la dirección. Revisá tu conexión y probá de nuevo.");
		} finally {
			setSearching(false);
		}
	};

	const onMapPress = (e: { nativeEvent: { action?: string; coordinate: { latitude: number; longitude: number } } }) => {
		if (e.nativeEvent.action === "marker-press") return;
		if (markerTapped.current) return;
		const { latitude, longitude } = e.nativeEvent.coordinate;
		if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
		pendingMapPress.current = setTimeout(() => {
			pendingMapPress.current = null;
			handleMapPress(latitude, longitude);
		}, 250);
	};

	// A tap on the map moves the search there; the address under the pin is
	// filled in afterwards, so the pin lands at once.
	const handleMapPress = async (latitude: number, longitude: number) => {
		setOriginMessage(null);
		applyCustomOrigin({ latitude, longitude, label: "Punto elegido en el mapa" });
		const label = await describePoint(latitude, longitude);
		if (label) applyCustomOrigin({ latitude, longitude, label });
	};

	const handleUseCurrent = async () => {
		if (locating) return;
		setLocating(true);
		setOriginMessage(null);
		try {
			const { granted } = await ensureLocationPermission();
			if (!granted) {
				setLocationIssue("denied");
				setOriginMessage("No tenemos permiso para ver tu ubicación. Podés activarlo en los ajustes o buscar una dirección.");
				return;
			}
			const position = await getDevicePosition();
			if (!position) {
				setOriginMessage("No pudimos obtener tu ubicación. Probá de nuevo o buscá una dirección.");
				return;
			}
			setCoords(position);
			setOriginKind("current");
			setOriginLabel(null);
			setOriginReady(true);
			setLocationIssue(null);
			clearSearchOrigin(session.user.id);
		} finally {
			setLocating(false);
		}
	};

	const toggleChain = (slug: string) => {
		const previous = favorites;
		const next = new Set(favorites);
		if (next.has(slug)) next.delete(slug);
		else next.add(slug);
		setFavorites(next);
		persist(next, radiusKm, () => setFavorites(previous));
	};

	const changeRadius = (km: number) => {
		const previous = radiusKm;
		setRadiusKm(km);
		persist(favorites, km, () => setRadiusKm(previous));
	};

	// With no chain selected the user hasn't filtered yet, so showing every
	// branch matches how the backend treats an empty favourites list.
	const visibleStores = useMemo(
		() => (favorites.size === 0 ? stores : stores.filter((s) => favorites.has(s.chainSlug))),
		[stores, favorites],
	);
	const nearest = useMemo(() => [...visibleStores].sort((a, b) => a.distanceKm - b.distanceKm), [visibleStores]);
	const shownStores = showAllStores ? nearest : nearest.slice(0, STORES_PREVIEW);

	const originText = !originReady
		? "Buscando tu ubicación…"
		: originKind === "custom"
			? originLabel ?? "Ubicación elegida"
			: originKind === "current"
				? "Tu ubicación actual"
				: "Centro de CABA (por defecto)";

	const kmText = (km: number) => `${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Mis tiendas favoritas" onBack={onBack} />

			{loading ? (
				<LoadingState />
			) : (
				<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
					{/* Outside the scroll: a map inside a ScrollView fights it for the
					    drag. It folds away while the keyboard is up so the search field
					    keeps the room. */}
					<View style={[styles.mapWrap, keyboardOpen && styles.mapFolded]}>
						<MapView
							ref={mapRef}
							provider={PROVIDER_DEFAULT}
							customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
							style={StyleSheet.absoluteFill}
							onPress={onMapPress}
							initialRegion={{
								latitude: DEFAULT_REGION.latitude,
								longitude: DEFAULT_REGION.longitude,
								latitudeDelta,
								longitudeDelta: latitudeDelta,
							}}
						>
							<Circle center={coords} radius={radiusKm * 1000} strokeColor={RADIUS_STROKE} fillColor={RADIUS_FILL} />
							{originKind === "custom" && (
								<Marker coordinate={coords} title="Ubicación de búsqueda" description={originLabel ?? undefined} onPress={noteMarkerPress} />
							)}
							{visibleStores.map((s) => (
								<Marker
									key={`${s.chainSlug}-${s.externalId}`}
									coordinate={{ latitude: s.lat, longitude: s.lng }}
									title={s.name}
									description={`${s.chainName} · ${kmText(s.distanceKm)}`}
									anchor={{ x: 0.5, y: 1 }}
									onPress={noteMarkerPress}
									onCalloutPress={() => onSelectStore?.(s)}
									accessibilityLabel={markerAccessibilityLabel(
										getChainMarker(s.chainSlug, s.chainName),
										s.chainName,
										s.name,
									)}
								>
									{/* Forma + iniciales: la cadena se reconoce sin depender del color. */}
									<ChainMarkerPin chainSlug={s.chainSlug} chainName={s.chainName} withPointer />
								</Marker>
							))}
						</MapView>
					</View>

					<ScrollView
						style={{ flex: 1 }}
						contentContainerStyle={{ paddingBottom: space.lg }}
						keyboardShouldPersistTaps="handled"
						keyboardDismissMode="on-drag"
						showsVerticalScrollIndicator={false}
					>
						<View style={isTablet ? styles.contentTablet : undefined}>
							{locationIssue && originKind !== "custom" && (
								<InlineNotice
									variant="warning"
									icon="location-outline"
									style={styles.warnBanner}
									message={
										locationIssue === "denied"
											? "Sin permiso de ubicación: mostrando el centro de CABA. Buscá una dirección para cambiarlo."
											: "No pudimos obtener tu ubicación: mostrando el centro de CABA. Buscá una dirección para cambiarlo."
									}
								/>
							)}

							{error && (
								<ErrorBanner
									message={error}
									onRetry={() => {
										setError(null);
										// Both requests again: the chains and preferences, and the branches.
										setReloadKey((k) => k + 1);
										loadStores();
									}}
								/>
							)}

							<SectionLabel style={styles.sectionLabel}>UBICACIÓN DE BÚSQUEDA</SectionLabel>
							<View style={styles.originCard}>
								<View style={styles.originRow} accessible accessibilityLabel={`Buscando cerca de: ${originText}`}>
									<Ionicons
										name={originKind === "custom" ? "pin" : "navigate"}
										size={18}
										color={colors.actionFill}
									/>
									<Text style={styles.originText}>{originText}</Text>
								</View>

								<InputField
									label="Buscar dirección, barrio o ciudad"
									value={query}
									onChangeText={(t) => {
										setQuery(t);
										setOriginMessage(null);
									}}
									leftIcon="search-outline"
									editable={!searching}
									autoCorrect={false}
									returnKeyType="search"
									onSubmitEditing={handleSearch}
								/>

								<PrimaryButton
									label={searching ? "Buscando…" : "Buscar"}
									accessibilityLabel="Buscar ubicación"
									onPress={handleSearch}
									disabled={searching}
									size="medium"
								/>

								{originKind !== "current" && (
									<Pressable
										style={(state) => [styles.originSecondary, locating && styles.busy, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
										onPress={handleUseCurrent}
										disabled={locating}
										accessibilityRole="button"
										accessibilityLabel="Usar mi ubicación actual"
										accessibilityState={{ busy: locating, disabled: locating }}
									>
										<Ionicons name="navigate-outline" size={16} color={colors.actionFill} />
										<Text style={styles.originSecondaryText}>{locating ? "Ubicándote…" : "Usar mi ubicación actual"}</Text>
									</Pressable>
								)}

								<Text style={styles.originHint}>
									{Platform.OS !== "web" ? "También podés tocar el mapa para elegir un punto. " : ""}
									La ubicación cambia el mapa y las sucursales cercanas; las ofertas se filtran solo por las cadenas que elijas.
								</Text>

								{originMessage && (
									<Text style={styles.originError} accessibilityRole="alert" accessibilityLiveRegion="polite">
										{originMessage}
									</Text>
								)}
							</View>

							<SectionLabel style={styles.sectionLabel}>RADIO DE BÚSQUEDA</SectionLabel>
							<View style={styles.radiusRow} accessibilityRole="radiogroup" accessibilityLabel="Radio de búsqueda">
								{RADIUS_OPTIONS.map((km) => {
									const on = radiusKm === km;
									return (
										<Pressable
											key={km}
											style={(state) => [
												styles.radiusChip,
												on && styles.radiusChipOn,
												state.pressed && styles.pressed,
												isFocused(state) && styles.focusRing,
											]}
											onPress={() => changeRadius(km)}
											disabled={saving}
											accessibilityRole="radio"
											accessibilityLabel={`${km} kilómetros`}
											accessibilityState={{ selected: on, disabled: saving }}
										>
											<Text style={[styles.radiusText, on && styles.radiusTextOn]}>{km} km</Text>
										</Pressable>
									);
								})}
							</View>

							<SectionLabel style={styles.sectionLabel}>
								CADENAS {favorites.size > 0 ? `(${favorites.size} elegidas)` : "(todas)"}
							</SectionLabel>
							<Text style={styles.sectionHint}>
								Elegí dónde comprás: solo vas a ver ofertas de esas cadenas.
							</Text>
							<View style={styles.list}>
								{chains.map((c, idx) => {
									const on = favorites.has(c.slug);
									const count = stores.filter((s) => s.chainSlug === c.slug).length;
									const meta =
										count > 0
											? `${count} ${originKind === "current" ? "cerca tuyo" : "cerca de esta ubicación"}`
											: "Sin sucursales en el radio";
									return (
										<View key={c.slug}>
											<Pressable
												style={(state) => [styles.row, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
												onPress={() => toggleChain(c.slug)}
												disabled={saving}
												accessibilityRole="checkbox"
												accessibilityLabel={`${c.name}. ${meta}`}
												accessibilityState={{ checked: on, disabled: saving }}
											>
												<ChainMarkerPin chainSlug={c.slug} chainName={c.name} size={22} />
												<View style={{ flex: 1 }}>
													<Text style={styles.rowTitle}>{c.name}</Text>
													<Text style={styles.rowMeta}>{meta}</Text>
												</View>
												<View style={[styles.check, on && styles.checkOn]}>
													{on && <Ionicons name="checkmark" size={14} color={colors.navy} />}
												</View>
											</Pressable>
											{idx < chains.length - 1 && <View style={styles.divider} />}
										</View>
									);
								})}
							</View>

							<SectionLabel style={styles.sectionLabel}>
								SUCURSALES CERCANAS {nearest.length > 0 ? `(${nearest.length})` : ""}
							</SectionLabel>
							{nearest.length === 0 ? (
								<Text style={styles.sectionHint}>
									No hay sucursales de {favorites.size > 0 ? "tus cadenas" : "estas cadenas"} dentro de {radiusKm} km. Probá con un radio mayor o cambiá la ubicación.
								</Text>
							) : (
								<View style={styles.list}>
									{shownStores.map((s, idx) => {
										const detail = [s.address, s.city].filter(Boolean).join(", ");
										const label = `${s.name}, ${s.chainName}, a ${kmText(s.distanceKm)}${detail ? `, ${detail}` : ""}`;
										const content = (
											<>
												<ChainMarkerPin chainSlug={s.chainSlug} chainName={s.chainName} size={22} />
												<View style={{ flex: 1 }}>
													<Text style={styles.rowTitle} numberOfLines={1}>{s.name}</Text>
													<Text style={styles.rowMeta} numberOfLines={1}>
														{s.chainName} · {kmText(s.distanceKm)}
														{detail ? ` · ${detail}` : ""}
													</Text>
												</View>
												{onSelectStore && <Ionicons name="chevron-forward" size={16} color={colors.subtleText} />}
											</>
										);
										return (
											<View key={`${s.chainSlug}-${s.externalId}`}>
												{onSelectStore ? (
													<Pressable
														style={(state) => [styles.row, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
														onPress={() => onSelectStore(s)}
														accessibilityRole="button"
														accessibilityLabel={label}
													>
														{content}
													</Pressable>
												) : (
													<View style={styles.row} accessible accessibilityLabel={label}>
														{content}
													</View>
												)}
												{idx < shownStores.length - 1 && <View style={styles.divider} />}
											</View>
										);
									})}
								</View>
							)}
							{nearest.length > STORES_PREVIEW && (
								<Pressable
									style={(state) => [styles.moreButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
									onPress={() => setShowAllStores((v) => !v)}
									accessibilityRole="button"
									accessibilityLabel={showAllStores ? "Ver menos sucursales" : `Ver las ${nearest.length} sucursales`}
								>
									<Text style={styles.moreText}>{showAllStores ? "Ver menos" : `Ver todas (${nearest.length})`}</Text>
								</Pressable>
							)}
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
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
		mapWrap: { height: MAP_HEIGHT, backgroundColor: colors.divider, overflow: "hidden" },
		mapFolded: { height: 0 },
		contentTablet: { width: "100%", maxWidth: 640, alignSelf: "center" },
		warnBanner: { margin: space.lg, marginBottom: 0 },
		sectionLabel: { marginTop: space.xl, marginHorizontal: space.lg },
		sectionHint: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
			marginHorizontal: space.lg,
			marginTop: space.xs,
		},
		originCard: {
			backgroundColor: colors.card,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			marginHorizontal: space.lg,
			marginTop: space.smPlus,
			padding: space.mdPlus,
			gap: space.md,
		},
		originRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
		originText: {
			flex: 1,
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		originSecondary: {
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.sm,
		},
		originSecondaryText: {
			color: colors.actionFill,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
			textDecorationLine: "underline",
		},
		originHint: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		originError: {
			color: colors.dangerSoftText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		busy: { opacity: 0.7 },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		// The lists clip their overflow, so their rows draw the ring inward.
		focusRingInset: focusRing(colors, true),
		radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginHorizontal: space.lg, marginTop: space.smPlus },
		radiusChip: {
			minHeight: 44,
			minWidth: 64,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: space.mdPlus,
			borderRadius: radii.full,
			borderWidth: 1,
			// The edge is what delimits the chip on the page (~3:1).
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
		},
		radiusChipOn: { backgroundColor: colors.actionFill, borderColor: colors.actionFill },
		radiusText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		radiusTextOn: { color: colors.actionText },
		list: {
			backgroundColor: colors.card,
			borderRadius: radii.lg,
			borderWidth: 1,
			borderColor: colors.divider,
			marginHorizontal: space.lg,
			marginTop: space.smPlus,
			overflow: "hidden",
		},
		row: {
			minHeight: 56,
			flexDirection: "row",
			alignItems: "center",
			gap: space.md,
			paddingHorizontal: space.mdPlus,
			paddingVertical: space.md,
		},
		rowTitle: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		rowMeta: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.micro,
			lineHeight: typography.lineHeights.micro,
			marginTop: 2,
		},
		// inputBorder, not border: an unchecked box has to read at ~3:1.
		check: {
			width: 22,
			height: 22,
			borderRadius: radii.full,
			borderWidth: 1.5,
			borderColor: colors.inputBorder,
			alignItems: "center",
			justifyContent: "center",
		},
		checkOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
		divider: { height: 1, backgroundColor: colors.divider, marginLeft: 48 },
		moreButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: space.xs },
		moreText: {
			color: colors.actionFill,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
			textDecorationLine: "underline",
		},
	});
}
