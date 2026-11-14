import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBankPromosToday, type BankPromoToday } from "../services/bankPromosApi";
import { focusRing, isFocused, radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { todayStripText, USER_ZONE } from "../utils/bankPromos";

type Props = {
	token: string;
	/** Sube cuando cambian las tarjetas: se vuelve a pedir lo de hoy. */
	refreshKey: number;
	/** Al calendario de la semana. */
	onOpen: () => void;
};

/**
 * "Hoy con tus tarjetas: hasta 30% en Carrefour" (OFT-56). Una sola línea que lleva al
 * calendario; la barra inferior no cambia (D9). Si la consulta falla la tira no aparece:
 * Inicio no se llena de errores por algo complementario.
 */
export function BankPromosTodayStrip({ token, refreshKey, onOpen }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [today, setToday] = useState<{ key: string; data: BankPromoToday } | null>(null);
	const [failedKey, setFailedKey] = useState<string | null>(null);
	const key = `${token}:${refreshKey}`;

	useEffect(() => {
		let alive = true;
		getBankPromosToday(token, USER_ZONE)
			.then((data) => alive && setToday({ key, data }))
			.catch(() => alive && setFailedKey(key));
		return () => {
			alive = false;
		};
	}, [token, key]);

	if (failedKey === key) return null;
	// Mientras carga se ve lo último que hubo, así no salta el resto de Inicio.
	if (!today) return null;

	const text = todayStripText(today.data);
	return (
		<Pressable
			onPress={onOpen}
			style={(state) => [styles.strip, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
			accessibilityRole="button"
			accessibilityLabel={`${text.title}. ${text.body}`}
			accessibilityHint="Abre el calendario de promos con tus tarjetas"
		>
			<View style={styles.icon}>
				<Ionicons name="card-outline" size={20} color={colors.cyan} />
			</View>
			<View style={styles.copy}>
				<Text style={styles.title}>{text.title}</Text>
				<Text style={styles.body} numberOfLines={2}>
					{text.body}
				</Text>
			</View>
			<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
		</Pressable>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights, family } = typography;
	return StyleSheet.create({
		strip: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.md,
			minHeight: 64,
			padding: space.mdPlus,
			borderRadius: radii.lg,
			borderWidth: 1,
			borderColor: colors.divider,
			backgroundColor: colors.card,
		},
		icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
		copy: { flex: 1, gap: 2 },
		title: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.label, lineHeight: lineHeights.label },
		body: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
	});
}
