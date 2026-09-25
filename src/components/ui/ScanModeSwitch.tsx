import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../../theme/designSystem";

export type ScanMode = "ticket" | "barcode";

const MODES: { key: ScanMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
	{ key: "ticket", label: "Ticket", icon: "receipt-outline" },
	{ key: "barcode", label: "Código de barras", icon: "barcode-outline" },
];

/**
 * The two things the camera can do — read a receipt, look up a product — as one
 * switch over the viewfinder, so they share a place instead of a menu in front of
 * it. Drawn for a camera feed: a dark translucent track with the active mode in
 * cyan, which stays legible over whatever the lens is looking at.
 */
export function ScanModeSwitch({ mode, onSelect }: { mode: ScanMode; onSelect: (mode: ScanMode) => void }) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.track} accessibilityRole="tablist">
			{MODES.map((m) => {
				const active = m.key === mode;
				return (
					<Pressable
						key={m.key}
						style={(state) => [styles.segment, active && styles.segmentActive, isFocused(state) && styles.focusRing]}
						onPress={() => !active && onSelect(m.key)}
						accessibilityRole="tab"
						accessibilityLabel={m.label}
						accessibilityState={{ selected: active }}
						aria-selected={active}
					>
						<Ionicons name={m.icon} size={16} color={active ? colors.navy : colors.buttonText} />
						<Text style={[styles.label, active && styles.labelActive]}>{m.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		track: {
			flexDirection: "row",
			alignSelf: "center",
			padding: space.xs,
			gap: space.xs,
			borderRadius: radii.full,
			backgroundColor: "rgba(0,0,0,0.6)",
		},
		segment: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: space.xsPlus,
			minHeight: 44,
			paddingHorizontal: space.lg,
			borderRadius: radii.full,
		},
		segmentActive: { backgroundColor: colors.cyan },
		label: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
		labelActive: { color: colors.navy, fontFamily: typography.family.bold },
		focusRing: focusRing(colors),
	});
}
