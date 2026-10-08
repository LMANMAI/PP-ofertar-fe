import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { BottomNav, EmptyState, ErrorBanner, ScreenHeader, SectionLabel, Skeleton, type TabKey } from "../components";
import type { ShoppingList, ShoppingListItem } from "../services";
import type { ListStatus } from "../store";
import { PRODUCT_PLACEHOLDER } from "../theme/productPlaceholder";
import { catalogImageUri } from "../utils/productImage";

/** The backend's own bounds for a line (UpdateShoppingListItemRequest). */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

type Props = {
	/** Null until it could be read. */
	list: ShoppingList | null;
	status: ListStatus;
	onBack: () => void;
	onRetry: () => void;
	/** Products get on the list from the barcode scanner. */
	onScanProduct: () => void;
	onSetChecked: (item: ShoppingListItem, checked: boolean) => void;
	onSetQuantity: (item: ShoppingListItem, quantity: number) => void;
	onRemove: (item: ShoppingListItem) => void;
	onClearChecked: () => void;
	/** Where it is cheapest, for the chains the user picked. */
	onSeePrices: (item: ShoppingListItem) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

type Row =
	| { kind: "item"; key: string; item: ShoppingListItem }
	| { kind: "checkedHeader"; key: string; count: number }
	| { kind: "add"; key: string };

/**
 * The shopping list: what was scanned to buy next time. Pending products first,
 * in the order they were added; what is already in the cart sinks under its own
 * heading instead of disappearing, so a wrong tap can be undone.
 */
export function ShoppingListScreen({
	list,
	status,
	onBack,
	onRetry,
	onScanProduct,
	onSetChecked,
	onSetQuantity,
	onRemove,
	onClearChecked,
	onSeePrices,
	activeTab,
	onSelectTab,
	onScanPress,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const items = useMemo(() => list?.items ?? [], [list]);
	const rows = useMemo<Row[]>(() => {
		const pending = items.filter((i) => !i.checked);
		const checked = items.filter((i) => i.checked);
		return [
			...pending.map((item): Row => ({ kind: "item", key: `i${item.id}`, item })),
			{ kind: "add", key: "add" },
			...(checked.length > 0 ? [{ kind: "checkedHeader", key: "checked", count: checked.length } as Row] : []),
			...checked.map((item): Row => ({ kind: "item", key: `i${item.id}`, item })),
		];
	}, [items]);
	const pendingCount = items.filter((i) => !i.checked).length;

	const summary =
		pendingCount === 0
			? "Ya tenés todo en el carrito"
			: pendingCount === 1
				? "Te falta 1 producto"
				: `Te faltan ${pendingCount} productos`;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title={list?.name ?? "Mi lista"} onBack={onBack} />

			{!list && (status === "loading" || status === "idle") && (
				<View style={styles.skeletonList} accessibilityLabel="Cargando tu lista" accessibilityLiveRegion="polite">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} style={styles.card}>
							<View style={[styles.skeletonLine, { width: "70%" }]} />
							<View style={[styles.skeletonLine, { width: "40%", height: 12 }]} />
						</Skeleton>
					))}
				</View>
			)}

			{!list && status === "error" && (
				<ErrorBanner message="No pudimos traer tu lista. Revisá tu conexión y probá de nuevo." onRetry={onRetry} />
			)}

			{list && items.length === 0 && (
				<EmptyState
					icon="list-outline"
					title="Tu lista está vacía"
					hint="Escaneá el código de barras de un producto y agregalo desde ahí. Te lo guardamos para la próxima compra."
					action={{ label: "Escanear un producto", onPress: onScanProduct }}
				/>
			)}

			{list && items.length > 0 && (
				<FlatList
					data={rows}
					keyExtractor={(row) => row.key}
					contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xxl, gap: space.smPlus }}
					ListHeaderComponent={
						<Text style={styles.summary} accessibilityRole="header">
							{summary}
						</Text>
					}
					renderItem={({ item: row }) => {
						if (row.kind === "add") {
							return (
								<Pressable
									style={(state) => [styles.addRow, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
									onPress={onScanProduct}
									accessibilityRole="button"
									accessibilityLabel="Escanear otro producto para agregarlo a la lista"
								>
									<Ionicons name="barcode-outline" size={18} color={colors.actionFill} accessible={false} />
									<Text style={styles.addRowText}>Escanear otro producto</Text>
								</Pressable>
							);
						}
						if (row.kind === "checkedHeader") {
							return (
								<View style={styles.checkedHeader}>
									<SectionLabel>YA EN EL CARRITO ({row.count})</SectionLabel>
									<Pressable
										style={(state) => [styles.linkWrap, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
										onPress={onClearChecked}
										accessibilityRole="button"
										accessibilityLabel={`Sacar de la lista los ${row.count} productos que ya están en el carrito`}
									>
										<Text style={styles.link}>Sacarlos de la lista</Text>
									</Pressable>
								</View>
							);
						}
						return (
							<ItemCard
								item={row.item}
								colors={colors}
								styles={styles}
								onSetChecked={onSetChecked}
								onSetQuantity={onSetQuantity}
								onRemove={onRemove}
								onSeePrices={onSeePrices}
							/>
						);
					}}
				/>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function ItemCard({
	item,
	colors,
	styles,
	onSetChecked,
	onSetQuantity,
	onRemove,
	onSeePrices,
}: {
	item: ShoppingListItem;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
	onSetChecked: (item: ShoppingListItem, checked: boolean) => void;
	onSetQuantity: (item: ShoppingListItem, quantity: number) => void;
	onRemove: (item: ShoppingListItem) => void;
	onSeePrices: (item: ShoppingListItem) => void;
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const uri = imageFailed ? null : catalogImageUri(item.imageUrl);
	const units = item.quantity === 1 ? "1 unidad" : `${item.quantity} unidades`;

	return (
		<View style={[styles.card, item.checked && styles.cardChecked]}>
			<View style={styles.cardTop}>
				<Pressable
					style={(state) => [styles.checkTarget, isFocused(state) && styles.focusRing]}
					onPress={() => onSetChecked(item, !item.checked)}
					accessibilityRole="checkbox"
					accessibilityState={{ checked: item.checked }}
					accessibilityLabel={`${item.description}, ${units}`}
					accessibilityHint={item.checked ? "Tocá para volver a ponerlo como pendiente" : "Tocá cuando ya lo tengas en el carrito"}
				>
					<View style={[styles.checkbox, item.checked && styles.checkboxOn]}>
						{item.checked && <Ionicons name="checkmark" size={16} color={colors.actionText} accessible={false} />}
					</View>
				</Pressable>
				<Image
					source={uri ? { uri } : PRODUCT_PLACEHOLDER}
					style={[styles.thumb, item.checked && styles.thumbChecked]}
					resizeMode="contain"
					onError={() => setImageFailed(true)}
					accessible={false}
				/>
				<View style={styles.cardCopy}>
					<Text style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={2}>
						{item.description}
					</Text>
					{/* What is already in the cart keeps only its count: there is nothing
					    left to decide about it. */}
					{(item.brand || item.checked) && (
						<Text style={styles.brand} numberOfLines={1}>
							{[item.brand, item.checked ? units : null].filter(Boolean).join(" · ")}
						</Text>
					)}
				</View>
				<Pressable
					style={(state) => [styles.iconButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
					onPress={() => onRemove(item)}
					accessibilityRole="button"
					accessibilityLabel={`Sacar ${item.description} de la lista`}
				>
					<Ionicons name="trash-outline" size={20} color={colors.mutedText2} accessible={false} />
				</Pressable>
			</View>

			{!item.checked && (
				<View style={styles.cardBottom}>
					<View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel="Cantidad" accessibilityValue={{ text: units }}>
						<StepButton
							icon="remove"
							label="Una unidad menos"
							disabled={item.quantity <= MIN_QUANTITY}
							onPress={() => onSetQuantity(item, item.quantity - 1)}
							colors={colors}
							styles={styles}
						/>
						<Text style={styles.quantity} accessibilityLiveRegion="polite">
							{item.quantity}
						</Text>
						<StepButton
							icon="add"
							label="Una unidad más"
							disabled={item.quantity >= MAX_QUANTITY}
							onPress={() => onSetQuantity(item, item.quantity + 1)}
							colors={colors}
							styles={styles}
						/>
					</View>
					<Pressable
						style={(state) => [styles.linkWrap, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
						onPress={() => onSeePrices(item)}
						accessibilityRole="button"
						accessibilityLabel={`Ver precios de ${item.description}`}
					>
						<Text style={styles.link}>Ver precios</Text>
					</Pressable>
				</View>
			)}
		</View>
	);
}

function StepButton({
	icon,
	label,
	disabled,
	onPress,
	colors,
	styles,
}: {
	icon: "add" | "remove";
	label: string;
	disabled: boolean;
	onPress: () => void;
	colors: ColorTokens;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<Pressable
			style={(state) => [styles.stepButton, disabled && styles.stepButtonOff, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
		>
			<Ionicons name={icon} size={18} color={colors.defaultText} accessible={false} />
		</Pressable>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		focusRing: focusRing(colors),
		pressed: { opacity: 0.7 },

		skeletonList: { padding: space.lg, gap: space.smPlus },
		skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: colors.softWarm },

		summary: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.subtitle, lineHeight: lineHeights.subtitle, marginBottom: space.xs },

		card: { backgroundColor: colors.card, borderRadius: radii.md, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.divider },
		cardChecked: { backgroundColor: colors.background },
		cardTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
		// 44pt target around a 24pt box: the box is what is drawn, the row is what is hit.
		checkTarget: { width: 44, height: 44, marginLeft: -space.sm, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },
		checkbox: { width: 24, height: 24, borderRadius: radii.sm, borderWidth: 2, borderColor: colors.inputBorder, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
		checkboxOn: { backgroundColor: colors.actionFill, borderColor: colors.actionFill },
		thumb: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.card },
		thumbChecked: { opacity: 0.5 },
		cardCopy: { flex: 1, gap: space.xs / 2 },
		name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.label, lineHeight: lineHeights.label },
		nameChecked: { color: colors.mutedText2, textDecorationLine: "line-through" },
		brand: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: sizes.micro, lineHeight: lineHeights.micro },
		iconButton: { width: 44, height: 44, marginRight: -space.sm, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },

		cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
		stepper: { flexDirection: "row", alignItems: "center", gap: space.xs },
		stepButton: { width: 44, height: 44, borderRadius: radii.button, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
		stepButtonOff: { opacity: 0.4 },
		quantity: { minWidth: 32, textAlign: "center", color: colors.defaultText, fontFamily: typography.family.bold, fontSize: sizes.body },

		linkWrap: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs, borderRadius: radii.sm },
		link: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },

		addRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.inputBorder },
		addRowText: { color: colors.actionFill, fontFamily: typography.family.medium, fontSize: sizes.label },

		checkedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, marginTop: space.sm },
	});
}
