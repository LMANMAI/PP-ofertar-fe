import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "../components/ui/AppMapView";
import { ensureLocationPermission } from "../location/permission";
import { describePoint, findPlace, getDevicePosition, loadSearchPlaces, saveSearchPlaces } from "../location/searchOrigin";
import {
	EMPTY_PLACES,
	PLACE_SLOTS,
	RADIUS_OPTIONS_KM,
	REFERENCE_NAMES,
	effectiveReference,
	referenceSummary,
	withActive,
	withPlace,
	withoutPlace,
	type PlaceSlot,
	type ReferenceKind,
	type SearchOrigin,
	type SearchPlaces,
} from "../location/searchPlaces";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, space, typography, useIsDarkMode, useIsTablet, useThemeColors, type ColorTokens, focusRing, isFocused } from "../theme/designSystem";
import { DARK_MAP_STYLE } from "../theme/darkMapStyle";
import { BottomNav, ChainMarkerPin, ErrorBanner, InlineNotice, InputField, LoadingState, PrimaryButton, ScreenHeader, type TabKey, SectionLabel } from "../components";
import { StoreMarkerPin } from "../components/StoreMarkerPin";
import { StoreStatusLine } from "../components/StoreStatusLine";
import { getChainMarker, markerAccessibilityLabel } from "../theme/chainMarkers";
import type { Session } from "../auth/session";
import { getFavoriteStores, getNearbyStores, getStoreChains, updateFavoriteStores } from "../services";
import type { NearbyStore, StoreChain } from "../services";
import { useKeyboardVisible } from "../utils/useKeyboardVisible";
import { useNow } from "../hooks/useNow";
import { directionsUrl } from "../utils/directions";
import { isOpenNow, openingAccessibilityLabel, openingLabel, openingStatus, type OpeningStatus } from "../utils/openingHours";

/** Fallback view when location is unavailable — Obelisco, CABA. */
const DEFAULT_REGION = { latitude: -34.6037, longitude: -58.3816 };

const MAP_HEIGHT = 240;
/** Branches listed before "Ver todas". */
const STORES_PREVIEW = 6;

// Map overlay for the search radius: drawn on the map tiles, not on the theme.
const RADIUS_STROKE = "rgba(0,163,224,0.6)";
const RADIUS_FILL = "rgba(0,163,224,0.12)";

/** Etiqueta provisoria de un punto tocado en el mapa, hasta que el geocoder le ponga nombre. */
const MAP_POINT_LABEL = "Punto elegido en el mapa";

const REFERENCE_ICONS: Record<ReferenceKind, keyof typeof Ionicons.glyphMap> = {
	current: "navigate",
	casa: "home",
	trabajo: "briefcase",
};

/** Where the device is, when the reference is "Ubicación actual". */
type DeviceState =
	| { status: "idle" | "locating" }
	| { status: "ready"; latitude: number; longitude: number }
	/** Why the device location is not being used. */
	| { status: "failed"; issue: "denied" | "unavailable" };

type Notice = { text: string; tone: "error" | "info"; undo?: SearchPlaces };

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
	// Una vez por minuto: el estado Abierto/Cerrado de cada sucursal se recalcula
	// con esto, no en cada render.
	const now = useNow(60_000);
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
	// Cada punto nuevo (búsqueda o toque) lleva un número: el nombre que devuelve
	// el geocoder tarde sólo se aplica si sigue siendo el último punto.
	const pointSeq = useRef(0);
	// Se guardan sólo los cambios del usuario, no lo que se acaba de leer.
	const placesTouched = useRef(false);

	const [chains, setChains] = useState<StoreChain[]>([]);
	const [favorites, setFavorites] = useState<Set<string>>(new Set());
	const [radiusKm, setRadiusKm] = useState(5);
	const [stores, setStores] = useState<NearbyStore[]>([]);
	const [showAllStores, setShowAllStores] = useState(false);
	const [places, setPlaces] = useState<SearchPlaces>(EMPTY_PLACES);
	// False until the saved places are read: nearby stores wait for it, so the
	// first request is for the right place and not for the fallback.
	const [placesLoaded, setPlacesLoaded] = useState(false);
	const [device, setDevice] = useState<DeviceState>({ status: "idle" });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [query, setQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [locating, setLocating] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);
	/** El lugar que se está eligiendo (desde su opción o desde "Cambiar"). */
	const [editing, setEditing] = useState<PlaceSlot | null>(null);
	/** Un punto encontrado sin un lugar en edición: se pregunta si es Casa o Trabajo. */
	const [pending, setPending] = useState<SearchOrigin | null>(null);
	const [onlyOpen, setOnlyOpen] = useState(false);
	const [mapError, setMapError] = useState(false);

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

	// Casa y Trabajo (y cuál está activo). Migra el punto único de antes.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const saved = await loadSearchPlaces(session.user.id).catch(() => EMPTY_PLACES);
			if (cancelled) return;
			setPlaces(saved);
			setPlacesLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [session.user.id]);

	const reference = useMemo(() => effectiveReference(places), [places]);

	const locateDevice = useCallback(async (): Promise<DeviceState> => {
		setDevice((d) => (d.status === "ready" ? d : { status: "locating" }));
		let next: DeviceState;
		try {
			// Only prompts when the permission was not already granted during
			// registration; a user who denied it there is asked again here,
			// where the radius search genuinely depends on it.
			const { granted } = await ensureLocationPermission();
			if (!granted) next = { status: "failed", issue: "denied" };
			else {
				const position = await getDevicePosition();
				next = position ? { status: "ready", ...position } : { status: "failed", issue: "unavailable" };
			}
		} catch {
			next = { status: "failed", issue: "unavailable" };
		}
		setDevice(next);
		return next;
	}, []);

	// Con "Ubicación actual" como referencia, se busca dónde está el teléfono. Un
	// lugar guardado activo gana: es lo que pidieron, y evita el pedido de permiso.
	useEffect(() => {
		if (!placesLoaded || reference.kind !== "current" || device.status !== "idle") return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- asks for the device position once "Ubicación actual" is the reference
		locateDevice();
	}, [placesLoaded, reference.kind, device.status, locateDevice]);

	// Primitivos y no un objeto: son dependencias de la búsqueda de sucursales.
	const originKind: "place" | "current" | "default" = reference.place ? "place" : device.status === "ready" ? "current" : "default";
	const originLat = reference.place ? reference.place.latitude : device.status === "ready" ? device.latitude : DEFAULT_REGION.latitude;
	const originLng = reference.place ? reference.place.longitude : device.status === "ready" ? device.longitude : DEFAULT_REGION.longitude;
	const coords = useMemo(() => ({ latitude: originLat, longitude: originLng }), [originLat, originLng]);
	const originReady = placesLoaded && (reference.place != null || device.status === "ready" || device.status === "failed");
	const locationIssue = device.status === "failed" ? device.issue : null;

	const loadStores = useCallback(async () => {
		const seq = ++storesSeq.current;
		try {
			const nearby = await getNearbyStores(session.token, originLat, originLng, radiusKm);
			if (seq !== storesSeq.current) return;
			setStores(nearby);
			setError(null);
		} catch (err) {
			if (seq !== storesSeq.current) return;
			setError(err instanceof Error ? err.message : "Error al cargar sucursales");
		}
	}, [session.token, originLat, originLng, radiusKm]);

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

	// Un punto por confirmar se muestra, sin mover todavía la búsqueda.
	useEffect(() => {
		if (!pending) return;
		mapRef.current?.animateToRegion(
			{ latitude: pending.latitude, longitude: pending.longitude, latitudeDelta, longitudeDelta: latitudeDelta },
			350,
		);
	}, [pending, latitudeDelta]);

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

	/** Aplica los lugares; el mapa y la búsqueda se mueven solos, todo sale de `places`. */
	const commitPlaces = (update: (current: SearchPlaces) => SearchPlaces, info?: Notice) => {
		placesTouched.current = true;
		setPlaces(update);
		setNotice(info ?? null);
	};

	// Guardar en el dispositivo, cada vez que el usuario cambia algo.
	useEffect(() => {
		if (!placesTouched.current) return;
		let cancelled = false;
		saveSearchPlaces(session.user.id, places).then((ok) => {
			if (!ok && !cancelled && Platform.OS !== "web") {
				setNotice({ text: "No pudimos guardar el lugar en este teléfono: vale solo mientras estés acá.", tone: "error" });
			}
		});
		return () => {
			cancelled = true;
		};
	}, [places, session.user.id]);

	const savePlace = (slot: PlaceSlot, point: SearchOrigin) => {
		setEditing(null);
		setPending(null);
		setQuery("");
		commitPlaces((p) => withPlace(p, slot, point), { text: `Guardamos ${REFERENCE_NAMES[slot]}: ${point.label}.`, tone: "info" });
	};

	/** El nombre que llega tarde para un punto del mapa, si sigue siendo el último. */
	const nameLater = (seq: number, latitude: number, longitude: number, slot: PlaceSlot | null) => {
		describePoint(latitude, longitude).then((label) => {
			if (!label || seq !== pointSeq.current) return;
			if (slot) {
				commitPlaces(
					(current) => {
						const saved = current[slot];
						if (!saved || saved.latitude !== latitude || saved.longitude !== longitude) return current;
						return withPlace(current, slot, { latitude, longitude, label });
					},
					{ text: `Guardamos ${REFERENCE_NAMES[slot]}: ${label}.`, tone: "info" },
				);
			} else {
				setPending((p) => (p && p.latitude === latitude && p.longitude === longitude ? { ...p, label } : p));
			}
		});
	};

	/** Un punto nuevo: si se está eligiendo un lugar, es ese; si no, se pregunta cuál. */
	const takePoint = (point: SearchOrigin) => {
		const seq = ++pointSeq.current;
		if (editing) savePlace(editing, point);
		else {
			setPending(point);
			setNotice(null);
		}
		return seq;
	};

	// Busca sólo al confirmar (teclado o botón), nunca mientras se escribe: el
	// geocoder se consulta una vez por búsqueda.
	const handleSearch = async () => {
		if (searching) return;
		if (!query.trim()) {
			setNotice({ text: "Escribí una dirección, un barrio o una ciudad.", tone: "error" });
			return;
		}
		setSearching(true);
		setNotice(null);
		try {
			const place = await findPlace(query);
			if (place) takePoint(place);
			else setNotice({ text: "No encontramos ese lugar en Argentina. Probá con la calle y la ciudad.", tone: "error" });
		} catch {
			setNotice({ text: "No pudimos buscar la dirección. Revisá tu conexión y probá de nuevo.", tone: "error" });
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

	// The pin lands at once; the address under it is filled in afterwards.
	const handleMapPress = (latitude: number, longitude: number) => {
		const slot = editing;
		const seq = takePoint({ latitude, longitude, label: MAP_POINT_LABEL });
		nameLater(seq, latitude, longitude, slot);
	};

	/** "Ubicación actual" como referencia: vuelve a buscar dónde está el teléfono. */
	const chooseCurrentLocation = async () => {
		if (locating) return;
		setEditing(null);
		setPending(null);
		commitPlaces((p) => withActive(p, "current"));
		setLocating(true);
		try {
			const result = await locateDevice();
			if (result.status === "failed") {
				setNotice({
					text:
						result.issue === "denied"
							? "No tenemos permiso para ver tu ubicación. Podés activarlo en los ajustes o guardar Casa o Trabajo."
							: "No pudimos obtener tu ubicación. Probá de nuevo o guardá Casa o Trabajo.",
					tone: "error",
				});
			}
		} finally {
			setLocating(false);
		}
	};

	/** Guarda como el lugar en edición el punto donde está el teléfono ahora. */
	const saveCurrentAs = async (slot: PlaceSlot) => {
		if (locating) return;
		setLocating(true);
		setNotice(null);
		try {
			const result = await locateDevice();
			if (result.status !== "ready") {
				setNotice({
					text:
						result.status === "failed" && result.issue === "denied"
							? "No tenemos permiso para ver tu ubicación. Escribí la dirección o tocá el mapa."
							: "No pudimos obtener tu ubicación. Escribí la dirección o tocá el mapa.",
					tone: "error",
				});
				return;
			}
			const { latitude, longitude } = result;
			const seq = ++pointSeq.current;
			savePlace(slot, { latitude, longitude, label: "Mi ubicación al guardarlo" });
			nameLater(seq, latitude, longitude, slot);
		} finally {
			setLocating(false);
		}
	};

	const selectReference = (kind: ReferenceKind) => {
		setPending(null);
		if (kind === "current") {
			chooseCurrentLocation();
			return;
		}
		if (!places[kind]) {
			// Sin guardar todavía: primero hay que decir dónde queda.
			setEditing(kind);
			setNotice(null);
			return;
		}
		setEditing(null);
		commitPlaces((p) => withActive(p, kind));
	};

	const removePlace = (slot: PlaceSlot) => {
		setEditing(null);
		const previous = places;
		commitPlaces((p) => withoutPlace(p, slot), { text: `Borraste ${REFERENCE_NAMES[slot]}.`, tone: "info", undo: previous });
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

	const openDirections = (s: NearbyStore) => {
		setMapError(false);
		Linking.openURL(directionsUrl(Platform.OS, s.lat, s.lng)).catch(() => setMapError(true));
	};

	// Recalculado una vez por minuto (con `now`) o cuando llegan otras sucursales.
	const statuses = useMemo(() => {
		const map = new Map<NearbyStore, OpeningStatus>();
		for (const s of stores) map.set(s, openingStatus(s.horarios, now));
		return map;
	}, [stores, now]);
	// Sin ningún horario (el backend de hoy), el filtro no tiene sentido y no se ofrece.
	const anyKnownHours = useMemo(() => [...statuses.values()].some((st) => st.kind !== "unknown"), [statuses]);
	const filterOpen = onlyOpen && anyKnownHours;
	const statusOf = (s: NearbyStore): OpeningStatus => statuses.get(s) ?? { kind: "unknown" };

	// With no chain selected the user hasn't filtered yet, so showing every
	// branch matches how the backend treats an empty favourites list.
	const chainStores = useMemo(
		() => (favorites.size === 0 ? stores : stores.filter((s) => favorites.has(s.chainSlug))),
		[stores, favorites],
	);
	// "Solo abiertos" es sólo lo que se sabe abierto: una sin horario no entra.
	const visibleStores = useMemo(
		() => (filterOpen ? chainStores.filter((s) => isOpenNow(statuses.get(s) ?? { kind: "unknown" })) : chainStores),
		[chainStores, filterOpen, statuses],
	);
	const hiddenWithoutHours = filterOpen ? chainStores.filter((s) => statusOf(s).kind === "unknown").length : 0;
	const nearest = useMemo(() => [...visibleStores].sort((a, b) => a.distanceKm - b.distanceKm), [visibleStores]);
	const shownStores = showAllStores ? nearest : nearest.slice(0, STORES_PREVIEW);

	const referenceName = reference.kind === "current" ? "Ubicación actual" : REFERENCE_NAMES[reference.kind];
	const summary = !originReady
		? "Buscando tu ubicación…"
		: originKind === "default"
			? `Centro de CABA (por defecto) · ${radiusKm} km`
			: referenceSummary(reference.kind, radiusKm);
	const summaryDetail =
		originKind === "place" && reference.place ? reference.place.label : originKind === "current" ? "Donde está tu teléfono ahora" : null;
	const nearWhat = reference.kind === "current" ? (originKind === "current" ? "cerca tuyo" : "cerca de esta ubicación") : `cerca de ${referenceName}`;

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
							{originKind === "place" && reference.place && (
								<Marker
									coordinate={coords}
									title={referenceName}
									description={reference.place.label}
									onPress={noteMarkerPress}
								/>
							)}
							{pending && (
								<Marker
									coordinate={{ latitude: pending.latitude, longitude: pending.longitude }}
									title="¿Casa o Trabajo?"
									description={pending.label}
									pinColor="orange"
									onPress={noteMarkerPress}
								/>
							)}
							{visibleStores.map((s) => {
								const status = statusOf(s);
								const statusText = openingLabel(status);
								return (
									<Marker
										key={`${s.chainSlug}-${s.externalId}`}
										coordinate={{ latitude: s.lat, longitude: s.lng }}
										title={s.name}
										description={`${s.chainName} · ${kmText(s.distanceKm)}${statusText ? ` · ${statusText}` : ""}`}
										anchor={{ x: 0.5, y: 1 }}
										// Las cerradas quedan debajo de las abiertas cuando se pisan.
										zIndex={status.kind === "closed" ? 0 : 1}
										onPress={noteMarkerPress}
										onCalloutPress={() => onSelectStore?.(s)}
										accessibilityLabel={`${markerAccessibilityLabel(
											getChainMarker(s.chainSlug, s.chainName),
											s.chainName,
											s.name,
										)}${statusText ? `. ${openingAccessibilityLabel(status)}` : ""}`}
									>
										{/* Forma + iniciales: la cadena se reconoce sin depender del color.
										    Cerrada: más chica y con una luna, sin tocar colores ni opacidad. */}
										<StoreMarkerPin chainSlug={s.chainSlug} chainName={s.chainName} closed={status.kind === "closed"} />
									</Marker>
								);
							})}
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
							{locationIssue && originKind === "default" && (
								<InlineNotice
									variant="warning"
									icon="location-outline"
									style={styles.warnBanner}
									message={
										locationIssue === "denied"
											? "Sin permiso de ubicación: mostrando el centro de CABA. Guardá Casa o Trabajo para buscar cerca de ahí."
											: "No pudimos obtener tu ubicación: mostrando el centro de CABA. Guardá Casa o Trabajo para buscar cerca de ahí."
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

							<SectionLabel style={styles.sectionLabel}>BUSCAR CERCA DE</SectionLabel>
							<View style={styles.originCard}>
								{/* Lo que está en uso, dicho una vez y arriba: vale para el mapa y
								    para los precios más baratos. */}
								<View style={styles.originRow} accessible accessibilityLabel={`Buscando: ${summary}${summaryDetail ? `, ${summaryDetail}` : ""}`}>
									<Ionicons name={REFERENCE_ICONS[reference.kind]} size={18} color={colors.actionFill} />
									<View style={{ flex: 1 }}>
										<Text style={styles.originText}>{summary}</Text>
										{summaryDetail && (
											<Text style={styles.originDetail} numberOfLines={2}>
												{summaryDetail}
											</Text>
										)}
									</View>
								</View>

								<View style={styles.refList} accessibilityRole="radiogroup" accessibilityLabel="Buscar cerca de">
									{(["current", ...PLACE_SLOTS] as ReferenceKind[]).map((kind, idx) => {
										const on = reference.kind === kind;
										const saved = kind === "current" ? null : places[kind];
										const detail =
											kind === "current"
												? locating && on
													? "Ubicándote…"
													: "Donde esté tu teléfono"
												: saved
													? saved.label
													: "Sin guardar · tocá para elegir dónde queda";
										const busy = kind === "current" && locating;
										return (
											<View key={kind}>
												{idx > 0 && <View style={styles.refDivider} />}
												<Pressable
													style={(state) => [styles.refRow, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
													onPress={() => selectReference(kind)}
													disabled={busy}
													accessibilityRole="radio"
													accessibilityLabel={`${REFERENCE_NAMES[kind]}. ${detail}`}
													accessibilityState={{ selected: on, checked: on, disabled: busy, busy }}
												>
													<View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
													<Ionicons name={REFERENCE_ICONS[kind]} size={16} color={on ? colors.actionFill : colors.mutedText2} />
													<View style={{ flex: 1 }}>
														<Text style={styles.rowTitle}>{REFERENCE_NAMES[kind]}</Text>
														<Text style={styles.rowMeta} numberOfLines={1}>
															{detail}
														</Text>
													</View>
												</Pressable>
											</View>
										);
									})}
								</View>

								{reference.kind !== "current" && !editing && (
									<View style={styles.inlineActions}>
										<Pressable
											style={(state) => [styles.inlineAction, isFocused(state) && styles.focusRing]}
											onPress={() => {
												setEditing(reference.kind as PlaceSlot);
												setPending(null);
												setNotice(null);
											}}
											accessibilityRole="button"
											accessibilityLabel={`Cambiar dónde queda ${referenceName}`}
										>
											<Text style={styles.linkText}>Cambiar {referenceName}</Text>
										</Pressable>
										<Pressable
											style={(state) => [styles.inlineAction, isFocused(state) && styles.focusRing]}
											onPress={() => removePlace(reference.kind as PlaceSlot)}
											accessibilityRole="button"
											accessibilityLabel={`Borrar ${referenceName}`}
										>
											<Text style={styles.linkText}>Borrar</Text>
										</Pressable>
									</View>
								)}

								{editing && (
									<Text style={styles.editingTitle} accessibilityRole="header">
										¿Dónde queda {REFERENCE_NAMES[editing]}?
									</Text>
								)}

								<InputField
									label={editing ? `Dirección de ${REFERENCE_NAMES[editing]}` : "Buscar dirección, barrio o ciudad"}
									value={query}
									onChangeText={(t) => {
										// Sólo guarda el texto: la búsqueda es al confirmar.
										setQuery(t);
										if (notice?.tone === "error") setNotice(null);
									}}
									leftIcon="search-outline"
									editable={!searching}
									autoCorrect={false}
									returnKeyType="search"
									onSubmitEditing={handleSearch}
								/>

								<PrimaryButton
									label={searching ? "Buscando…" : "Buscar"}
									accessibilityLabel={editing ? `Buscar la dirección de ${REFERENCE_NAMES[editing]}` : "Buscar ubicación"}
									onPress={handleSearch}
									disabled={searching}
									size="medium"
								/>

								{editing && (
									<View style={styles.inlineActions}>
										<Pressable
											style={(state) => [styles.inlineAction, locating && styles.busy, isFocused(state) && styles.focusRing]}
											onPress={() => saveCurrentAs(editing)}
											disabled={locating}
											accessibilityRole="button"
											accessibilityLabel={`Usar mi ubicación actual como ${REFERENCE_NAMES[editing]}`}
											accessibilityState={{ busy: locating, disabled: locating }}
										>
											<Ionicons name="navigate-outline" size={16} color={colors.actionFill} />
											<Text style={styles.linkText}>{locating ? "Ubicándote…" : "Usar mi ubicación actual"}</Text>
										</Pressable>
										<Pressable
											style={(state) => [styles.inlineAction, isFocused(state) && styles.focusRing]}
											onPress={() => setEditing(null)}
											accessibilityRole="button"
										>
											<Text style={styles.linkText}>Cancelar</Text>
										</Pressable>
									</View>
								)}

								{pending && (
									<View style={styles.pendingCard} accessibilityLiveRegion="polite">
										<Text style={styles.pendingText}>
											¿Guardás <Text style={styles.pendingPlace}>{pending.label}</Text> como…?
										</Text>
										<View style={styles.pendingButtons}>
											{PLACE_SLOTS.map((slot) => (
												<Pressable
													key={slot}
													style={(state) => [styles.pendingButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
													onPress={() => savePlace(slot, pending)}
													accessibilityRole="button"
													accessibilityLabel={
														places[slot]
															? `Guardar como ${REFERENCE_NAMES[slot]}, reemplaza ${places[slot]?.label}`
															: `Guardar como ${REFERENCE_NAMES[slot]}`
													}
												>
													<Ionicons name={REFERENCE_ICONS[slot]} size={16} color={colors.actionText} />
													<Text style={styles.pendingButtonText}>{REFERENCE_NAMES[slot]}</Text>
												</Pressable>
											))}
										</View>
										<Pressable
											style={(state) => [styles.inlineAction, isFocused(state) && styles.focusRing]}
											onPress={() => setPending(null)}
											accessibilityRole="button"
										>
											<Text style={styles.linkText}>Cancelar</Text>
										</Pressable>
									</View>
								)}

								<Text style={styles.originHint}>
									{Platform.OS !== "web"
										? editing
											? "También podés tocar el mapa en el lugar. "
											: "También podés tocar el mapa para elegir un punto. "
										: ""}
									El lugar y el radio valen para el mapa y para los precios más baratos cerca; las ofertas se filtran solo por las cadenas que elijas.
								</Text>

								{notice && (
									<View style={styles.noticeRow} accessibilityLiveRegion="polite">
										<Text
											style={notice.tone === "error" ? styles.originError : styles.originInfo}
											accessibilityRole={notice.tone === "error" ? "alert" : undefined}
										>
											{notice.text}
										</Text>
										{notice.undo && (
											<Pressable
												style={(state) => [styles.inlineAction, isFocused(state) && styles.focusRing]}
												onPress={() => {
													const undo = notice.undo as SearchPlaces;
													commitPlaces(() => undo);
												}}
												accessibilityRole="button"
											>
												<Text style={styles.linkText}>Deshacer</Text>
											</Pressable>
										)}
									</View>
								)}
							</View>

							<SectionLabel style={styles.sectionLabel}>RADIO DE BÚSQUEDA (KM)</SectionLabel>
							{/* Un control segmentado de ancho parejo: los 7 radios entran en una
							    fila a 360 dp (328 dp útiles ÷ 7 ≈ 46 dp por opción, ≥ 44), sin
							    scroll horizontal. `scripts/verifySearchPlaces.ts` lo controla. */}
							<View style={styles.radiusRow} accessibilityRole="radiogroup" accessibilityLabel="Radio de búsqueda">
								{RADIUS_OPTIONS_KM.map((km, idx) => {
									const on = radiusKm === km;
									return (
										<Pressable
											key={km}
											style={(state) => [
												styles.radiusSegment,
												idx > 0 && styles.radiusSegmentDivider,
												on && styles.radiusSegmentOn,
												state.pressed && styles.pressed,
												isFocused(state) && styles.focusRingInset,
											]}
											onPress={() => changeRadius(km)}
											disabled={saving}
											accessibilityRole="radio"
											accessibilityLabel={`${km} ${km === 1 ? "kilómetro" : "kilómetros"}`}
											accessibilityState={{ selected: on, checked: on, disabled: saving }}
										>
											<Text style={[styles.radiusText, on && styles.radiusTextOn]} maxFontSizeMultiplier={1.4}>
												{km}
											</Text>
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
									const meta = count > 0 ? `${count} ${nearWhat}` : "Sin sucursales en el radio";
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
							{anyKnownHours && (
								<View style={styles.filterRow}>
									<Pressable
										style={(state) => [styles.filterChip, filterOpen && styles.filterChipOn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
										onPress={() => setOnlyOpen((v) => !v)}
										accessibilityRole="switch"
										accessibilityLabel="Solo abiertas ahora"
										accessibilityState={{ checked: filterOpen }}
										aria-checked={filterOpen}
									>
										<Ionicons
											name={filterOpen ? "checkmark-circle" : "time-outline"}
											size={16}
											color={filterOpen ? colors.actionText : colors.defaultText}
										/>
										<Text style={[styles.filterText, filterOpen && styles.filterTextOn]}>Solo abiertos</Text>
									</Pressable>
									{hiddenWithoutHours > 0 && (
										<Text style={styles.filterHint}>
											{hiddenWithoutHours === 1
												? "1 sucursal sin horario no se muestra."
												: `${hiddenWithoutHours} sucursales sin horario no se muestran.`}
										</Text>
									)}
								</View>
							)}
							{mapError && (
								<Text style={[styles.originError, styles.sectionHint]} accessibilityRole="alert">
									No pudimos abrir el mapa. Buscá la dirección en tu app de mapas.
								</Text>
							)}
							{nearest.length === 0 ? (
								<Text style={styles.sectionHint}>
									{filterOpen && chainStores.length > 0
										? "Ninguna de estas sucursales está abierta ahora. Sacá el filtro para verlas todas."
										: `No hay sucursales de ${favorites.size > 0 ? "tus cadenas" : "estas cadenas"} dentro de ${radiusKm} km. Probá con un radio mayor o cambiá la ubicación.`}
								</Text>
							) : (
								<View style={styles.list}>
									{shownStores.map((s, idx) => {
										const status = statusOf(s);
										const statusA11y = openingAccessibilityLabel(status);
										const address = [s.address, s.city].filter(Boolean).join(", ");
										const label = `${s.name}, ${s.chainName}, a ${kmText(s.distanceKm)}${statusA11y ? `. ${statusA11y}` : ""}`;
										const content = (
											<>
												<ChainMarkerPin chainSlug={s.chainSlug} chainName={s.chainName} size={22} />
												<View style={{ flex: 1 }}>
													<Text style={styles.rowTitle} numberOfLines={1}>{s.name}</Text>
													<Text style={styles.rowMeta} numberOfLines={1}>
														{s.chainName} · {kmText(s.distanceKm)}
													</Text>
													<StoreStatusLine status={status} />
												</View>
												{onSelectStore && <Ionicons name="chevron-forward" size={16} color={colors.subtleText} />}
											</>
										);
										return (
											<View key={`${s.chainSlug}-${s.externalId}`}>
												{onSelectStore ? (
													<Pressable
														style={(state) => [styles.row, styles.storeRowMain, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
														onPress={() => onSelectStore(s)}
														accessibilityRole="button"
														accessibilityLabel={label}
													>
														{content}
													</Pressable>
												) : (
													<View style={[styles.row, styles.storeRowMain]} accessible accessibilityLabel={label}>
														{content}
													</View>
												)}
												{/* La dirección abre la ruta. Hermana de la fila y no adentro:
												    dos controles anidados no se pueden enfocar por separado. */}
												{address ? (
													<Pressable
														style={(state) => [styles.addressLink, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
														onPress={() => openDirections(s)}
														accessibilityRole="link"
														accessibilityLabel={`Cómo llegar a ${s.chainName}, ${address}`}
													>
														<Ionicons name="navigate-outline" size={14} color={colors.actionFill} />
														<Text style={styles.addressText} numberOfLines={2}>
															{address}
														</Text>
													</Pressable>
												) : null}
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
	const linkText = {
		color: colors.actionFill,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
		lineHeight: typography.lineHeights.label,
		textDecorationLine: "underline" as const,
	};
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
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
		originDetail: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		refList: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
		refRow: {
			minHeight: 52,
			flexDirection: "row",
			alignItems: "center",
			gap: space.smPlus,
			paddingHorizontal: space.md,
			paddingVertical: space.sm,
		},
		refDivider: { height: 1, backgroundColor: colors.divider },
		// inputBorder: an empty radio has to read at ~3:1 against the card.
		radio: {
			width: 20,
			height: 20,
			borderRadius: radii.full,
			borderWidth: 1.5,
			borderColor: colors.inputBorder,
			alignItems: "center",
			justifyContent: "center",
		},
		radioOn: { borderColor: colors.actionFill },
		radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.actionFill },
		inlineActions: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg },
		inlineAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space.xs },
		linkText,
		editingTitle: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		pendingCard: { gap: space.sm, padding: space.md, borderRadius: radii.md, backgroundColor: colors.softCyan },
		pendingText: {
			color: colors.defaultText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		pendingPlace: { fontFamily: typography.family.bold },
		pendingButtons: { flexDirection: "row", gap: space.sm },
		pendingButton: {
			flex: 1,
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.xs,
			borderRadius: radii.button,
			backgroundColor: colors.actionFill,
		},
		pendingButtonText: { color: colors.actionText, fontFamily: typography.family.bold, fontSize: typography.sizes.label },
		originHint: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		noticeRow: { gap: space.xs },
		originError: {
			color: colors.dangerSoftText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		originInfo: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		busy: { opacity: 0.7 },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		// The lists clip their overflow, so their rows draw the ring inward.
		focusRingInset: focusRing(colors, true),
		radiusRow: {
			flexDirection: "row",
			marginHorizontal: space.lg,
			marginTop: space.smPlus,
			borderRadius: radii.md,
			borderWidth: 1,
			// The edge is what delimits the control on the page (~3:1).
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
			overflow: "hidden",
		},
		radiusSegment: { flex: 1, minWidth: 0, minHeight: 44, alignItems: "center", justifyContent: "center" },
		radiusSegmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.inputBorder },
		radiusSegmentOn: { backgroundColor: colors.actionFill },
		radiusText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		radiusTextOn: { color: colors.actionText, fontFamily: typography.family.bold },
		filterRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			alignItems: "center",
			gap: space.sm,
			marginHorizontal: space.lg,
			marginTop: space.smPlus,
		},
		filterChip: {
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			gap: space.xs,
			paddingHorizontal: space.mdPlus,
			borderRadius: radii.full,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
		},
		filterChipOn: { backgroundColor: colors.actionFill, borderColor: colors.actionFill },
		filterText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.caption,
			lineHeight: typography.lineHeights.caption,
		},
		filterTextOn: { color: colors.actionText },
		filterHint: {
			flexShrink: 1,
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.micro,
			lineHeight: typography.lineHeights.micro,
		},
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
		storeRowMain: { paddingBottom: space.xs },
		addressLink: {
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			gap: space.xs,
			// Alineado con el texto de la fila, después del pin (14 + 22 + 12).
			paddingLeft: 48,
			paddingRight: space.mdPlus,
			paddingBottom: space.xs,
		},
		addressText: { ...linkText, flex: 1, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
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
		moreText: linkText,
	});
}
