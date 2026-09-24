import { useMemo, useState } from "react";
import { Image, LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import type { ComercioPrecioResponse, ProductoDetalleResponse, SucursalPrecio } from "../services/sepaApi";
import type { ShopperContext } from "../hooks/useShopperContext";
import { useNearbyBranches } from "../hooks/useNearbyBranches";
import { displayProductName } from "../utils/productName";
import { directionsUrl } from "../utils/directions";
import { formatCurrency, formatLongDate } from "../utils/format";
import {
	describeDatasetDate,
	findPurchase,
	parseShelfPrice,
	scopeBranches,
	scopePrices,
	verdictFor,
} from "../utils/scanResult";

/** Stores shown before "Ver las N cadenas" when nothing narrows the list. */
const VISIBLE_WHEN_UNSCOPED = 5;

type Props = {
	producto: ProductoDetalleResponse;
	/** Name to fall back on when the lookup has none (the ticket line it came from). */
	fallbackName?: string;
	shopper: ShopperContext;
	/** Opens "Mis tiendas favoritas" so the price can be read for their chains. */
	onOpenFavorites?: () => void;
	onRetry: () => void;
	/** Type the code by hand, for when the camera cannot read it. */
	onEnterCode?: () => void;
	onScanTicket?: () => void;
};

/** One line of the list, whichever way the price was found: a branch near the
 * user, with the address to get to, or a chain's lowest price across the country. */
type Entry = {
	key: string;
	chain: string;
	price: number;
	/** Address and distance for a branch; the range across branches for a chain. */
	detail: string;
	branch: SucursalPrecio | null;
};

const comercioName = (c: ComercioPrecioResponse) => c.bandera || c.razonSocial || "Comercio";

function branchEntry(s: SucursalPrecio): Entry {
	const where = [s.direccion, s.localidad].filter((t) => t && t.trim()).join(", ");
	const km = s.distanciaKm.toLocaleString("es-AR", { maximumFractionDigits: 1 });
	return {
		key: `b${s.sucursalId}`,
		chain: s.bandera || "Supermercado",
		price: s.precio,
		detail: `${where || s.nombre || "Sucursal"} · a ${km} km`,
		branch: s,
	};
}

function comercioEntry(c: ComercioPrecioResponse, index: number): Entry {
	const range =
		c.precioMaximo != null && c.precioMinimo != null && c.precioMaximo > c.precioMinimo
			? `Entre ${formatCurrency(c.precioMinimo)} y ${formatCurrency(c.precioMaximo)} según la sucursal`
			: c.cantidadSucursales === 1
				? "1 sucursal"
				: `${c.cantidadSucursales} sucursales`;
	return { key: `c${c.comercioId}-${index}`, chain: comercioName(c), price: c.precioMinimo ?? 0, detail: range, branch: null };
}

/**
 * What a scanned (or ticket-linked) product costs, read for this person: the
 * lowest price among the chains they picked, in the branches near them, with the
 * address to get there; what they typed off the shelf; what they paid last time.
 * Shared by the barcode scanner and "Comparar", so a product reads the same
 * whichever way it was reached.
 *
 * Near the user, each price is the list price in that branch. Without a position,
 * or before the backend has the branches, it falls back to each chain's lowest
 * price across the country, and says so.
 */
export function ProductPriceResult({ producto, fallbackName, shopper, onOpenFavorites, onRetry, onEnterCode, onScanTicket }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [shelfText, setShelfText] = useState("");
	const [showMore, setShowMore] = useState(false);
	const [imageFailed, setImageFailed] = useState(false);
	const [mapError, setMapError] = useState(false);

	// Only meaningful when both halves were read; an empty list narrows nothing.
	const chains = useMemo(() => (shopper.favoritesKnown ? shopper.chains : []), [shopper.favoritesKnown, shopper.chains]);
	const national = useMemo(
		() => scopePrices(producto.comercios, chains, shopper.favoriteSlugs),
		[producto.comercios, chains, shopper.favoriteSlugs],
	);
	const hasNationalPrices = national.best != null || national.otherBest != null;
	const nearby = useNearbyBranches(producto.ean, shopper.origin, shopper.radiusKm, hasNationalPrices);
	const branches = useMemo(
		() => (nearby.status === "ready" ? scopeBranches(nearby.data.sucursales, chains, shopper.favoriteSlugs) : null),
		[nearby, chains, shopper.favoriteSlugs],
	);
	const nearbyUsable = branches != null && (branches.best != null || branches.otherBest != null);

	const purchase = useMemo(() => findPurchase(shopper.purchases, producto.ean), [shopper.purchases, producto.ean]);
	const dataset = describeDatasetDate(nearbyUsable && nearby.status === "ready" ? nearby.data.fechaDataset ?? producto.fechaDataset : producto.fechaDataset);

	const name = producto.descripcion ? displayProductName(producto.descripcion) : fallbackName ?? null;
	const brand = producto.marca ? displayProductName(producto.marca) : null;
	const hasIdentity = name != null || producto.imagenUrl != null;

	// One shape for both sources, so the hero, the shelf verdict and the list do not
	// care where the numbers came from.
	const scope = nearbyUsable ? branches : national;
	const toEntry = (x: SucursalPrecio | ComercioPrecioResponse, i = 0): Entry =>
		"precio" in x ? branchEntry(x) : comercioEntry(x, i);
	const best = scope?.best ? toEntry(scope.best) : null;
	const otherBest = scope?.otherBest ? toEntry(scope.otherBest) : null;
	const favorites = (scope?.favorites ?? []).map((x, i) => toEntry(x, i));
	const others = (scope?.others ?? []).map((x, i) => toEntry(x, i));

	const mode = scope?.mode ?? "all";
	const primary = mode === "all" ? others.slice(0, VISIBLE_WHEN_UNSCOPED) : favorites;
	const more = mode === "all" ? others.slice(VISIBLE_WHEN_UNSCOPED) : others;
	const moreLabel =
		mode === "all"
			? `Ver las ${more.length} ${nearbyUsable ? "cadenas cercanas" : "cadenas"} restantes`
			: nearbyUsable
				? `Otras cadenas cerca (${more.length})`
				: `Otras cadenas (${more.length})`;

	// What the shelf price is measured against: the lowest in scope, or, when none
	// of their chains sells it, the lowest anywhere — said as such.
	const reference = best ?? otherBest;
	const shelf = parseShelfPrice(shelfText);
	const verdict = shelf != null && reference != null ? verdictFor(shelf, reference.price) : null;
	const paid = purchase?.lastPaidPrice ?? null;

	const toggleMore = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowMore((v) => !v);
	};

	const goTo = (branch: SucursalPrecio) => {
		setMapError(false);
		Linking.openURL(directionsUrl(Platform.OS, branch.latitud, branch.longitud)).catch(() => setMapError(true));
	};

	const radius = shopper.radiusKm;
	const overline =
		nearbyUsable ? (mode === "all" ? "CERCA TUYO" : "EN TUS TIENDAS FAVORITAS, CERCA TUYO") : mode === "all" ? "EN TODO EL PAÍS" : "EN TUS TIENDAS FAVORITAS";

	return (
		<>
			{hasIdentity && (
				<View style={styles.identity}>
					{producto.imagenUrl && !imageFailed ? (
						<Image
							source={{ uri: producto.imagenUrl }}
							style={styles.image}
							resizeMode="contain"
							onError={() => setImageFailed(true)}
							accessibilityLabel={name ? `Foto de ${name}` : "Foto del producto"}
						/>
					) : (
						<View style={[styles.image, styles.imagePlaceholder]}>
							<Ionicons name="cube-outline" size={28} color={colors.mutedText2} accessible={false} />
						</View>
					)}
					<View style={styles.identityText}>
						<Text style={styles.name} numberOfLines={3} accessibilityRole="header">
							{name ?? "Producto sin nombre"}
						</Text>
						{brand && <Text style={styles.brand}>{brand}</Text>}
						<Text style={styles.code}>Código {producto.ean}</Text>
						{producto.fuenteDatos === "externo" && (
							<Text style={styles.code}>Nombre e imagen de un proveedor externo</Text>
						)}
					</View>
				</View>
			)}

			{!hasNationalPrices ? (
				<View style={styles.notFound} accessibilityLiveRegion="polite">
					<Ionicons name="search-outline" size={36} color={colors.mutedText2} accessible={false} />
					<Text style={styles.notFoundTitle}>
						{producto.encontrado ? "Todavía no tenemos precios de este producto" : "No encontramos este código"}
					</Text>
					<Text style={styles.notFoundBody}>
						{producto.fuenteDatos === "externo"
							? "Lo reconocimos, pero no tenemos precios publicados. Probá con otro producto."
							: "Puede ser un producto nuevo o un código propio del local. Revisá que el código esté completo y probá de nuevo."}
					</Text>
					<View style={styles.notFoundActions}>
						{onEnterCode && (
							<Pressable
								style={(state) => [styles.primaryButton, isFocused(state) && styles.focusRing]}
								onPress={onEnterCode}
								accessibilityRole="button"
							>
								<Text style={styles.primaryButtonText}>Escribir el código</Text>
							</Pressable>
						)}
						<Pressable
							style={(state) => [styles.secondaryButton, isFocused(state) && styles.focusRing]}
							onPress={onRetry}
							accessibilityRole="button"
						>
							<Text style={styles.secondaryButtonText}>Buscar de nuevo</Text>
						</Pressable>
						{onScanTicket && (
							<Pressable
								style={(state) => [styles.linkButton, isFocused(state) && styles.focusRing]}
								onPress={onScanTicket}
								accessibilityRole="button"
							>
								<Text style={styles.linkText}>Escanear un ticket</Text>
							</Pressable>
						)}
					</View>
				</View>
			) : (
				<>
					<View style={styles.hero}>
						<Text style={styles.overline}>{overline}</Text>
						{best ? (
							<>
								<Text style={styles.heroPrice}>{formatCurrency(best.price)}</Text>
								<Text style={styles.heroChain}>en {best.chain}</Text>
								<Text style={styles.heroNote}>
									{best.branch
										? `${best.detail}${shopper.origin.status === "ready" && shopper.origin.label ? ` de ${shopper.origin.label}` : ""}. Es el precio de lista en esa sucursal.`
										: "Es el precio más bajo entre las sucursales de esa cadena en todo el país; en la tuya puede ser más alto."}
								</Text>
								{best.branch && (
									<DirectionsButton entry={best} onPress={goTo} styles={styles} colors={colors} prominent />
								)}
							</>
						) : (
							<>
								<Text style={styles.heroNone}>
									{nearbyUsable
										? `Ninguna de tus tiendas favoritas lo tiene a menos de ${radius} km`
										: "Ninguna de tus tiendas lo tiene publicado"}
								</Text>
								{otherBest && (
									<>
										<Text style={styles.heroNote}>
											{nearbyUsable ? "Cerca tuyo" : "En otras cadenas"}, desde {formatCurrency(otherBest.price)} en {otherBest.chain}
											{otherBest.branch ? `. ${otherBest.detail}` : "."}
										</Text>
										{otherBest.branch && (
											<DirectionsButton entry={otherBest} onPress={goTo} styles={styles} colors={colors} prominent />
										)}
									</>
								)}
							</>
						)}

						{!nearbyUsable && (
							<NearbyNotice
								shopper={shopper}
								nearby={nearby}
								radius={radius}
								styles={styles}
								colors={colors}
							/>
						)}

						{mode === "all" && shopper.status === "ready" && (
							<Text style={styles.heroNote}>
								{shopper.favoritesKnown ? "Todavía no elegiste tiendas favoritas." : "No pudimos leer tus tiendas favoritas."}
							</Text>
						)}
						{mode === "all" && shopper.favoritesKnown && onOpenFavorites && (
							<Pressable
								style={(state) => [styles.linkButton, isFocused(state) && styles.focusRing]}
								onPress={onOpenFavorites}
								accessibilityRole="button"
							>
								<Text style={styles.linkText}>Elegí tus tiendas favoritas para ver su precio</Text>
							</Pressable>
						)}
						{mapError && (
							<Text style={styles.heroNote} accessibilityRole="alert">
								No pudimos abrir el mapa. Buscá la dirección en tu app de mapas.
							</Text>
						)}
						{dataset && (
							<Text style={styles.heroDate}>
								Precios de SEPA al {dataset.label}
								{dataset.days > 7 ? ". Pueden haber cambiado." : ""}
							</Text>
						)}
					</View>

					{purchase && paid != null && (
						<View style={styles.paidRow} accessible>
							<Ionicons name="receipt-outline" size={16} color={colors.mutedText2} accessible={false} />
							<Text style={styles.paidText}>
								En tu último ticket escaneado pagaste {formatCurrency(paid)}
								{formatLongDate(purchase.lastPaidAt) ? ` (${formatLongDate(purchase.lastPaidAt)})` : ""}.
							</Text>
						</View>
					)}

					{reference != null && (
						<View style={styles.shelf}>
							<Text style={styles.shelfLabel}>¿A cuánto está acá?</Text>
							<View style={styles.shelfInputRow}>
								<Text style={styles.currency} accessible={false}>
									$
								</Text>
								<TextInput
									style={styles.shelfInput}
									value={shelfText}
									onChangeText={(t) => setShelfText(t.replace(/[^\d.,]/g, ""))}
									keyboardType="decimal-pad"
									placeholder="Precio del estante"
									placeholderTextColor={colors.mutedText2}
									maxLength={12}
									accessibilityLabel="Precio que ves en el estante"
									returnKeyType="done"
								/>
							</View>
							{verdict && (
								<View
									style={[
										styles.verdict,
										verdict.tone === "good" && styles.verdictGood,
										verdict.tone === "near" && styles.verdictNear,
										verdict.tone === "above" && styles.verdictAbove,
									]}
									accessibilityLiveRegion="polite"
								>
									<Ionicons
										name={verdict.tone === "good" ? "checkmark-circle" : verdict.tone === "near" ? "remove-circle" : "arrow-up-circle"}
										size={18}
										color={
											verdict.tone === "good"
												? colors.successSoftText
												: verdict.tone === "near"
													? colors.infoSoftText
													: colors.warningSoftText
										}
										accessible={false}
									/>
									<Text
										style={[
											styles.verdictText,
											{
												color:
													verdict.tone === "good"
														? colors.successSoftText
														: verdict.tone === "near"
															? colors.infoSoftText
															: colors.warningSoftText,
											},
										]}
									>
										{verdict.tone === "good"
											? `Está igual o por debajo de lo más bajo cerca tuyo: ${reference.chain} (${formatCurrency(reference.price)}).`
											: `Está ${Math.round(verdict.pct)}% arriba de ${reference.chain} (${formatCurrency(reference.price)}).`}
										{paid != null && shelf != null && shelf !== paid
											? ` Vs. tu último ticket: ${formatCurrency(Math.abs(shelf - paid))} ${shelf > paid ? "más caro" : "más barato"}.`
											: ""}
									</Text>
								</View>
							)}
						</View>
					)}

					{primary.length > 0 && (
						<View style={styles.storesWrap}>
							<Text style={styles.sectionTitle} accessibilityRole="header">
								{mode === "all"
									? nearbyUsable
										? "Cerca tuyo"
										: "Precios por cadena"
									: "Tus tiendas favoritas"}
							</Text>
							{primary.map((e, i) => (
								<StoreRow key={e.key} entry={e} lowest={i === 0 && primary.length > 1} onDirections={goTo} styles={styles} colors={colors} />
							))}
						</View>
					)}

					{more.length > 0 && (
						<View style={{ gap: space.sm }}>
							<Pressable
								style={(state) => [styles.moreHeader, isFocused(state) && styles.focusRing]}
								onPress={toggleMore}
								accessibilityRole="button"
								accessibilityLabel={moreLabel}
								accessibilityState={{ expanded: showMore }}
								aria-expanded={showMore}
							>
								<Text style={styles.moreTitle}>{moreLabel}</Text>
								<Ionicons name={showMore ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedText2} accessible={false} />
							</Pressable>
							{showMore &&
								more.map((e) => (
									<StoreRow key={`m${e.key}`} entry={e} lowest={false} onDirections={goTo} styles={styles} colors={colors} />
								))}
						</View>
					)}
				</>
			)}
		</>
	);
}

/** Why the prices are not from the branches near the user, and what would fix it.
 * Says nothing while the answer is still coming, and nothing when nearby is used. */
function NearbyNotice({
	shopper,
	nearby,
	radius,
	styles,
	colors,
}: {
	shopper: ShopperContext;
	nearby: ReturnType<typeof useNearbyBranches>;
	radius: number;
	styles: ReturnType<typeof createStyles>;
	colors: ColorTokens;
}) {
	const origin = shopper.origin;
	let text: string | null = null;
	let action: { label: string; onPress: () => void } | null = null;

	if (origin.status === "loading" || nearby.status === "loading") {
		text = "Buscando las sucursales cerca tuyo…";
	} else if (origin.status === "denied") {
		text = "Activá la ubicación para ver el precio en las sucursales cerca tuyo.";
		action = {
			label: origin.canAskAgain ? "Activar ubicación" : "Abrir ajustes",
			onPress: origin.canAskAgain ? shopper.askForLocation : () => void Linking.openSettings(),
		};
	} else if (origin.status === "unavailable") {
		text = "No pudimos saber dónde estás.";
		action = { label: "Probar de nuevo", onPress: shopper.askForLocation };
	} else if (nearby.status === "error") {
		text = "No pudimos buscar las sucursales cerca tuyo.";
		action = { label: "Reintentar", onPress: nearby.retry };
	} else if (nearby.status === "ready") {
		text = `No encontramos este producto en sucursales a menos de ${radius} km.`;
	}
	if (!text) return null;

	return (
		<View style={{ gap: space.xs }} accessibilityLiveRegion="polite">
			<View style={styles.noticeRow}>
				<Ionicons name="location-outline" size={14} color={colors.mutedText2} accessible={false} />
				<Text style={styles.noticeText}>{text}</Text>
			</View>
			{action && (
				<Pressable
					style={(state) => [styles.linkButton, isFocused(state) && styles.focusRing]}
					onPress={action.onPress}
					accessibilityRole="button"
				>
					<Text style={styles.linkText}>{action.label}</Text>
				</Pressable>
			)}
		</View>
	);
}

function DirectionsButton({
	entry,
	onPress,
	styles,
	colors,
	prominent = false,
}: {
	entry: Entry;
	onPress: (branch: SucursalPrecio) => void;
	styles: ReturnType<typeof createStyles>;
	colors: ColorTokens;
	prominent?: boolean;
}) {
	if (!entry.branch) return null;
	const branch = entry.branch;
	return (
		<Pressable
			style={(state) => [prominent ? styles.directionsProminent : styles.directions, isFocused(state) && styles.focusRing]}
			onPress={() => onPress(branch)}
			accessibilityRole="button"
			accessibilityLabel={`Cómo llegar a ${entry.chain}, ${entry.detail}`}
		>
			<Ionicons
				name="navigate-outline"
				size={16}
				color={prominent ? colors.actionText : colors.actionFill}
				accessible={false}
			/>
			<Text style={prominent ? styles.directionsProminentText : styles.directionsText}>Cómo llegar</Text>
		</Pressable>
	);
}

function StoreRow({
	entry: e,
	lowest,
	onDirections,
	styles,
	colors,
}: {
	entry: Entry;
	lowest: boolean;
	onDirections: (branch: SucursalPrecio) => void;
	styles: ReturnType<typeof createStyles>;
	colors: ColorTokens;
}) {
	return (
		<View style={[styles.storeRow, lowest && styles.storeRowLowest]}>
			<View
				style={styles.storeMain}
				accessible
				accessibilityLabel={`${e.chain}${lowest ? ", el precio más bajo" : ""}. ${formatCurrency(e.price)}. ${e.detail}`}
			>
				<View style={styles.storeInfo}>
					<Text style={styles.storeName} numberOfLines={1}>
						{e.chain}
					</Text>
					<Text style={styles.storeRange}>{e.detail}</Text>
				</View>
				<View style={styles.storePriceWrap}>
					{lowest && (
						<View style={styles.lowestBadge}>
							<Ionicons name="trophy" size={11} color={colors.successSoftText} accessible={false} />
							<Text style={styles.lowestText}>Más bajo</Text>
						</View>
					)}
					<Text style={styles.storePrice}>{formatCurrency(e.price)}</Text>
				</View>
			</View>
			<DirectionsButton entry={e} onPress={onDirections} styles={styles} colors={colors} />
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		focusRing: focusRing(colors),
		identity: {
			flexDirection: "row",
			gap: space.mdPlus,
			backgroundColor: colors.card,
			borderRadius: radii.lg,
			borderWidth: 1,
			borderColor: colors.border,
			padding: space.mdPlus,
		},
		image: { width: 88, height: 88, borderRadius: radii.md, backgroundColor: colors.softWarm },
		imagePlaceholder: { alignItems: "center", justifyContent: "center" },
		identityText: { flex: 1, justifyContent: "center", gap: space.xs / 2 },
		name: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.body, lineHeight: lineHeights.body },
		brand: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.caption },
		code: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro },

		notFound: { alignItems: "center", gap: space.md, paddingVertical: space.xl, paddingHorizontal: space.lg },
		notFoundTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.bodyL, textAlign: "center" },
		notFoundBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.label, lineHeight: lineHeights.label, textAlign: "center" },
		notFoundActions: { alignSelf: "stretch", gap: space.sm, marginTop: space.sm },

		hero: { backgroundColor: colors.softCyan, borderRadius: radii.lg, padding: space.lg, gap: space.xs },
		overline: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.overline, lineHeight: lineHeights.overline, letterSpacing: 1.2 },
		heroPrice: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.h1, lineHeight: lineHeights.h1 },
		heroChain: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.subtitle },
		heroNone: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.bodyL, lineHeight: lineHeights.bodyL },
		heroNote: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		heroDate: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.micro, marginTop: space.xs },
		noticeRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
		noticeText: { flex: 1, color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.micro, lineHeight: lineHeights.micro },

		paidRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
		paidText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },

		shelf: { gap: space.sm, backgroundColor: colors.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: space.mdPlus },
		shelfLabel: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.label },
		shelfInputRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
			minHeight: 48,
			paddingHorizontal: space.md,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.background,
		},
		currency: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.bodyL },
		shelfInput: { flex: 1, minHeight: 44, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.bodyL },
		verdict: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, borderRadius: radii.md, padding: space.md },
		verdictGood: { backgroundColor: colors.successSoft },
		verdictNear: { backgroundColor: colors.infoSoft },
		verdictAbove: { backgroundColor: colors.warningSoft },
		verdictText: { flex: 1, fontFamily: typography.family.medium, fontSize: sizes.caption, lineHeight: lineHeights.caption },

		storesWrap: { gap: space.sm },
		sectionTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.body },
		storeRow: {
			gap: space.xs,
			backgroundColor: colors.card,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.border,
			paddingHorizontal: space.mdPlus,
			paddingTop: space.md,
			paddingBottom: space.xs,
		},
		storeRowLowest: { backgroundColor: colors.successSoft, borderColor: colors.successSoftText },
		storeMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
		storeInfo: { flex: 1, gap: space.xs / 2 },
		storeName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.body },
		storeRange: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		storePriceWrap: { alignItems: "flex-end", gap: space.xs },
		storePrice: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.body },
		lowestBadge: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs / 2, borderRadius: radii.sm },
		lowestText: { color: colors.successSoftText, fontFamily: typography.family.bold, fontSize: sizes.micro },
		directions: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: space.xs, minHeight: 44 },
		directionsText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },
		directionsProminent: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			gap: space.sm,
			minHeight: 44,
			marginTop: space.sm,
			paddingHorizontal: space.lg,
			borderRadius: radii.md,
			backgroundColor: colors.actionFill,
		},
		directionsProminentText: { color: colors.actionText, fontFamily: typography.family.bold, fontSize: sizes.label },
		moreHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
		moreTitle: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: sizes.caption },

		primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.actionFill },
		primaryButtonText: { color: colors.actionText, fontFamily: typography.family.bold, fontSize: sizes.body },
		secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card },
		secondaryButtonText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label },
		linkButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
		linkText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline", textAlign: "center" },
	});
}
