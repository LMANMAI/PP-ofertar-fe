import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	minLength: boolean;
	uppercase: boolean;
	number: boolean;
	special: boolean;
	matches?: boolean;
};

type CheckItem = { key: string; label: string; met: boolean };

export function PasswordStrengthBar({ minLength, uppercase, number, special, matches }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const strength = useMemo(() => {
		const checks = [minLength, uppercase, number, special];
		const count = checks.filter(Boolean).length;
		return { count, total: checks.length };
	}, [minLength, uppercase, number, special]);

	// Every level uses a role token that has its own light and dark value, so
	// the bar and the label keep their contrast in both themes (the old cyan,
	// amber and green literals were 1.6–2.2:1 on the light background).
	const tone = useMemo(() => {
		if (strength.count <= 1) return { bar: colors.danger, text: colors.dangerSoftText };
		if (strength.count === 2) return { bar: colors.warningSoftText, text: colors.warningSoftText };
		if (strength.count === 3) return { bar: colors.infoSoftText, text: colors.infoSoftText };
		return { bar: colors.successSoftText, text: colors.successSoftText };
	}, [strength.count, colors]);

	const label = useMemo(() => {
		const all = strength.count === strength.total && matches;
		if (all) return "Muy fuerte";
		if (strength.count === 0) return "";
		if (strength.count === 1) return "Débil";
		if (strength.count === 2) return "Regular";
		if (strength.count === 3) return "Buena";
		return "Fuerte";
	}, [strength.count, strength.total, matches]);

	const items: CheckItem[] = useMemo(() => {
		const base: CheckItem[] = [
			{ key: "minLength", label: "Mínimo 8 caracteres", met: minLength },
			{ key: "uppercase", label: "Una letra mayúscula", met: uppercase },
			{ key: "number", label: "Un número", met: number },
			{ key: "special", label: "Un carácter especial (!@#$)", met: special },
		];
		if (matches !== undefined) {
			base.push({ key: "matches", label: "Las contraseñas coinciden", met: matches });
		}
		return base;
	}, [minLength, uppercase, number, special, matches]);

	return (
		<View style={styles.wrap}>
			<View style={styles.barRow}>
				{Array.from({ length: strength.total }).map((_, i) => (
					<View
						key={i}
						style={[
							styles.segment,
							i < strength.count ? { backgroundColor: tone.bar } : styles.segmentEmpty,
						]}
					/>
				))}
			</View>
			{/* Height is reserved: the label used to pop in on the first keystroke and
			 * push the whole form down. Polite live region so the change is announced. */}
			<View style={styles.labelSlot}>
				{label !== "" && (
					<Text style={[styles.label, { color: tone.text }]} accessibilityLiveRegion="polite">
						{label}
					</Text>
				)}
			</View>
			<View style={styles.checklist}>
				{items.map((item) => (
					<View
							key={item.key}
							style={styles.checkRow}
							accessible
							accessibilityLabel={`${item.label}: ${item.met ? "cumplido" : "pendiente"}`}
						>
						<Ionicons
							name={item.met ? "checkmark-circle" : "ellipse-outline"}
							size={16}
							color={item.met ? colors.successSoftText : colors.subtleText}
						/>
						<Text style={[styles.checkText, item.met && styles.checkTextMet]}>
							{item.label}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	wrap: { gap: space.sm },
	barRow: { flexDirection: "row", gap: space.xs },
	segment: { flex: 1, height: 4, borderRadius: radii.full },
	segmentEmpty: { backgroundColor: colors.divider },
	labelSlot: { minHeight: typography.lineHeights.caption },
	label: { fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	checklist: { gap: space.xs, marginTop: 2 },
	checkRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
	checkText: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
	checkTextMet: { color: colors.defaultText, fontFamily: typography.family.medium },
	});
}
