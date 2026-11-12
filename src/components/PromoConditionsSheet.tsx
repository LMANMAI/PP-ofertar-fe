import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	findNodeHandle,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { focusRing, isFocused, radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import type { Offer } from "../services/offersApi";
import { PrimaryButton } from "./ui/PrimaryButton";
import { CONDITIONS_BUTTON_TEXT, type PromoConditions } from "./promoConditions";

type Props = {
	/** Qué mostrar. Null = cerrada: la hoja se abre y se cierra con esto, sin
	 * un `visible` aparte que pueda quedar desincronizado del contenido. */
	conditions: PromoConditions | null;
	onClose: () => void;
	/** Abre el detalle completo de una oferta. Sin él, los accesos a "Ver la
	 * promoción completa" no se dibujan. */
	onOpenFull?: (offer: Offer) => void;
};

/**
 * La letra chica de una promoción, en una hoja inferior aparte de la tarjeta.
 *
 * Qué entra acá y qué se queda en la tarjeta lo decide `promoConditions.ts`,
 * no este componente: acá sólo se dibuja. La regla que importa —la condición
 * de una promo condicional nunca vive sólo acá— está verificada allá.
 *
 * Misma anatomía que `OffersSortSheet` (scrim, esquinas `xl`, `card` como
 * fondo) para que las hojas de la app se lean como una sola familia. Tiene
 * scroll propio porque un legal de Carrefour pasa tranquilo los mil
 * caracteres.
 */
export function PromoConditionsSheet({ conditions, onClose, onOpenFull }: Props) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	// La última hoja abierta, para que al cerrar (conditions = null) el
	// contenido no se vacíe en el medio de la animación de salida. Es el patrón
	// de "estado derivado de props" que documenta React: se actualiza durante
	// el render, sin un efecto que pinte un cuadro con el contenido viejo.
	const [last, setLast] = useState<PromoConditions | null>(conditions);
	if (conditions !== null && conditions !== last) setLast(conditions);
	const content = conditions ?? last;

	// Al abrir, el foco del lector de pantalla va al título: es lo que hace que
	// se anuncie "Condiciones de la promoción" en vez de quedar perdido en la
	// lista de atrás. En Android el nodo recién montado a veces todavía no
	// acepta foco en `onShow`, de ahí la demora corta.
	const titleRef = useRef<Text>(null);
	const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const focusTitle = useCallback(() => {
		if (focusTimer.current) clearTimeout(focusTimer.current);
		focusTimer.current = setTimeout(() => {
			const node = titleRef.current ? findNodeHandle(titleRef.current) : null;
			if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
		}, 150);
	}, []);
	useEffect(
		() => () => {
			if (focusTimer.current) clearTimeout(focusTimer.current);
		},
		[],
	);

	if (!content) return null;

	return (
		<Modal
			visible={conditions !== null}
			animationType="slide"
			transparent
			// El botón atrás de Android cierra la hoja y no la pantalla de atrás.
			onRequestClose={onClose}
			onShow={focusTitle}
		>
			<View style={styles.backdrop}>
				{/* Tocar afuera cierra, como en las otras hojas. Fuera del árbol
				    de accesibilidad a propósito: si fuera el primer elemento
				    enfocable, el lector de pantalla arrancaría leyendo "cerrar"
				    en vez del título. Quien usa lector cierra con el botón de la
				    cruz, el gesto de escape o atrás. */}
				<Pressable
					style={styles.backdropTap}
					onPress={onClose}
					accessible={false}
					importantForAccessibility="no"
				/>
				<View
					style={[
						styles.sheet,
						{ maxHeight: height * 0.85, paddingBottom: Math.max(insets.bottom, space.lg) + space.md },
					]}
					accessibilityViewIsModal
					onAccessibilityEscape={onClose}
				>
					<View style={styles.headerRow}>
						<View style={styles.headerText}>
							<Text ref={titleRef} style={styles.title} accessibilityRole="header">
								{content.title}
							</Text>
							{content.subtitle ? (
								<Text style={styles.subtitle} numberOfLines={2}>
									{content.subtitle}
								</Text>
							) : null}
						</View>
						<Pressable
							onPress={onClose}
							style={(state) => [styles.closeBtn, isFocused(state) && styles.focusRing]}
							accessibilityRole="button"
							accessibilityLabel="Cerrar condiciones"
							hitSlop={4}
						>
							<Ionicons name="close" size={22} color={colors.defaultText} />
						</Pressable>
					</View>

					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator
					>
						{content.blocks.map((block) => (
							<View key={block.key} style={styles.block}>
								<Text style={styles.blockTitle} accessibilityRole="header">
									{block.title}
								</Text>
								{block.lines.map((line, i) => (
									<Text
										key={i}
										style={[
											styles.line,
											line.tone === "legal" && styles.lineLegal,
											line.tone === "warning" && styles.lineWarning,
										]}
									>
										{line.text}
									</Text>
								))}
								{block.full && onOpenFull ? (
									<Pressable
										onPress={() => block.full && onOpenFull(block.full)}
										style={(state) => [styles.linkRow, isFocused(state) && styles.focusRing]}
										accessibilityRole="button"
										accessibilityLabel={`Ver la promoción completa: ${block.title}`}
									>
										<Text style={styles.linkText}>Ver la promoción completa</Text>
										<Ionicons name="chevron-forward" size={16} color={colors.defaultText} />
									</Pressable>
								) : null}
							</View>
						))}
					</ScrollView>

					{content.full && onOpenFull ? (
						<PrimaryButton
							label="Ver la promoción completa"
							size="medium"
							icon="chevron-forward"
							iconAfter
							onPress={() => content.full && onOpenFull(content.full)}
						/>
					) : null}
				</View>
			</View>
		</Modal>
	);
}

/**
 * El botón que abre la hoja desde una tarjeta.
 *
 * Tiene que ser un elemento accesible propio y no un hijo del área tocable de
 * la tarjeta: en React Native un `accessibilityLabel` a nivel card agrupa a
 * los hijos y el lector de pantalla no los ve, así que un ícono adentro sería
 * inalcanzable. Por eso las pantallas lo ponen como hermano de esa área.
 *
 * Texto visible ("Condiciones") y no sólo un ícono de info: el ícono solo no
 * dice qué hay detrás, y a 44 dp de alto el rótulo entra igual.
 */
export function ConditionsButton({
	onPress,
	accessibilityLabel,
}: {
	onPress: () => void;
	/** Qué condiciones abre, dicho completo: "Condiciones de la promoción de …". */
	accessibilityLabel: string;
}) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<Pressable
			onPress={onPress}
			style={(state) => [styles.conditionsBtn, state.pressed && styles.conditionsBtnPressed, isFocused(state) && styles.focusRing]}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint="Abre la letra chica de la promoción"
		>
			<Ionicons name="information-circle-outline" size={16} color={colors.defaultText} />
			<Text style={styles.conditionsBtnText}>{CONDITIONS_BUTTON_TEXT}</Text>
		</Pressable>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
		backdropTap: { flex: 1 },
		sheet: {
			backgroundColor: colors.card,
			borderTopLeftRadius: radii.xl,
			borderTopRightRadius: radii.xl,
			paddingHorizontal: space.xl,
			paddingTop: space.lg,
			gap: space.md,
		},
		headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
		headerText: { flex: 1, gap: space.xs },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: sizes.subtitle,
			lineHeight: lineHeights.subtitle,
		},
		subtitle: {
			color: colors.mutedText2,
			fontFamily: typography.family.regular,
			fontSize: sizes.caption,
			lineHeight: lineHeights.caption,
		},
		closeBtn: {
			width: 44,
			height: 44,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: radii.full,
			marginTop: -space.sm,
			marginRight: -space.sm,
		},
		// `flexGrow: 0` para que una hoja con poco texto no se estire hasta el
		// `maxHeight`; con mucho, el scroll se queda dentro de ese techo.
		scroll: { flexGrow: 0 },
		scrollContent: { gap: space.md, paddingBottom: space.xs },
		block: {
			gap: space.xs,
			backgroundColor: colors.background,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			paddingHorizontal: space.mdPlus,
			paddingVertical: space.md,
		},
		blockTitle: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: sizes.caption,
			lineHeight: lineHeights.caption,
		},
		line: {
			color: colors.defaultText,
			fontFamily: typography.family.regular,
			fontSize: sizes.caption,
			lineHeight: lineHeights.caption,
		},
		lineLegal: {
			color: colors.mutedText2,
			fontSize: sizes.micro,
			lineHeight: lineHeights.micro,
		},
		lineWarning: { color: colors.warningSoftText },
		linkRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			minHeight: 44,
			marginTop: space.xs,
		},
		linkText: {
			color: colors.defaultText,
			fontFamily: typography.family.medium,
			fontSize: sizes.caption,
			textDecorationLine: "underline",
		},
		// Mismo borde `inputBorder` que los chips de orden y filtro: es lo que
		// lo delimita como control (~3:1) sin competir con el precio.
		conditionsBtn: {
			flexDirection: "row",
			alignItems: "center",
			alignSelf: "flex-start",
			gap: space.xs,
			minHeight: 44,
			paddingHorizontal: space.md,
			borderRadius: radii.full,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
		},
		conditionsBtnPressed: { opacity: 0.8 },
		conditionsBtnText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: sizes.caption },
		focusRing: focusRing(colors),
	});
}
