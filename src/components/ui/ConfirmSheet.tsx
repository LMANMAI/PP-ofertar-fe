import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
	icon: IconName;
	/** "danger" for anything destructive/irreversible, "info" for a plain confirmation. */
	iconTone: "danger" | "info";
	title: string;
	subtitle: ReactNode;
	/** Extra content between the subtitle and the action buttons — a stats
	 * row, a warning box — for confirmations that need more than a sentence. */
	children?: ReactNode;
	confirmLabel: string;
	confirmTone?: "danger" | "navy";
	onConfirm: () => void;
	confirmDisabled?: boolean;
	cancelLabel: string;
	onCancel: () => void;
};

/** The app's one shape for "you're about to lose or commit something" —
 * icon circle, title, subtitle, an optional extra block, then a filled
 * action button and a plain-text cancel link. Renders only the card; the
 * caller owns the backdrop (a route-level screen or a transparent Modal). */
export function ConfirmSheet({
	icon,
	iconTone,
	title,
	subtitle,
	children,
	confirmLabel,
	confirmTone = "navy",
	onConfirm,
	confirmDisabled,
	cancelLabel,
	onCancel,
}: Props) {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<View style={styles.sheet}>
			<View style={[styles.iconCircle, iconTone === "danger" ? styles.iconCircleDanger : styles.iconCircleInfo]}>
				<Ionicons name={icon} size={28} color={iconTone === "danger" ? colors.dangerSoftText : colors.infoSoftText} />
			</View>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.subtitle}>{subtitle}</Text>

			{children}

			<Pressable
				style={[styles.confirmBtn, confirmTone === "danger" && styles.confirmBtnDanger, confirmDisabled && styles.confirmBtnDisabled]}
				onPress={confirmDisabled ? undefined : onConfirm}
				accessibilityRole="button"
				accessibilityState={{ disabled: confirmDisabled }}
			>
				<Text style={styles.confirmText}>{confirmLabel}</Text>
			</Pressable>
			<Pressable style={styles.cancelBtn} onPress={onCancel}>
				<Text style={styles.cancelText}>{cancelLabel}</Text>
			</Pressable>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 22, gap: space.sm, alignItems: "stretch" },
		iconCircle: { alignSelf: "center", width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
		iconCircleDanger: { backgroundColor: colors.dangerSoft },
		iconCircleInfo: { backgroundColor: colors.infoSoft },
		title: { textAlign: "center", color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 20, marginTop: space.xs },
		subtitle: { textAlign: "center", color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
		confirmBtn: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: space.md },
		confirmBtnDanger: { backgroundColor: colors.danger },
		confirmBtnDisabled: { opacity: 0.5 },
		confirmText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
		cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
		cancelText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
	});
}
