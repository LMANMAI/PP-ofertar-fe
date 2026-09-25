import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors } from "../../theme/designSystem";
import { useOnboardingTarget } from "../onboarding/OnboardingProvider";

export type TabKey = "home" | "offers" | "scan" | "history" | "profile";

type Props = {
	active: TabKey;
	onSelect: (tab: TabKey) => void;
	onScanPress: () => void;
};

type IoniconName = keyof typeof Ionicons.glyphMap;
type Item = {
	key: Exclude<TabKey, "scan">;
	label: string;
	icon: IoniconName;
	iconActive: IoniconName;
};

const ITEMS: Item[] = [
	{ key: "home", label: "Inicio", icon: "home-outline", iconActive: "home" },
	{
		key: "offers",
		label: "Ofertas",
		icon: "pricetag-outline",
		iconActive: "pricetag",
	},
	{
		key: "history",
		label: "Tickets",
		icon: "receipt-outline",
		iconActive: "receipt",
	},
	{
		key: "profile",
		label: "Perfil",
		icon: "person-outline",
		iconActive: "person",
	},
];

export function BottomNav({ active, onSelect, onScanPress }: Props) {
	const colors = useThemeColors();
	const navigationTarget = useOnboardingTarget("main-navigation");
	const scanTarget = useOnboardingTarget("scan-ticket");
	return (
		<View
			// eslint-disable-next-line react-hooks/refs -- attachRef/onLayout are a stable useCallback from useOnboardingTarget, not a render-time ref read
			ref={navigationTarget.attachRef} onLayout={navigationTarget.onLayout}
			style={[
				styles.wrap,
				{ backgroundColor: colors.card, borderTopColor: colors.border },
			]}
		>
			<View style={styles.row} accessibilityRole="tablist">
				{ITEMS.slice(0, 2).map((it) => (
					<NavItem
						key={it.key}
						label={it.label}
						icon={active === it.key ? it.iconActive : it.icon}
						active={active === it.key}
						onPress={() => onSelect(it.key)}
					/>
				))}

				<Pressable
					style={styles.scanWrap}
					onPress={onScanPress}
					// An action, not a destination: it opens the scanner, it is never the
					// selected tab, so it must not announce itself as one.
					accessibilityRole="button"
					accessibilityLabel="Escanear ticket"
					hitSlop={4}
				>
					<View
						// eslint-disable-next-line react-hooks/refs -- attachRef/onLayout are a stable useCallback from useOnboardingTarget, not a render-time ref read
						ref={scanTarget.attachRef} onLayout={scanTarget.onLayout}
						style={[
							styles.scanButton,
							{ backgroundColor: colors.actionFill, shadowColor: colors.navy },
							active === "scan" && { backgroundColor: colors.cyan },
						]}
					>
						{/* Camera, not the receipt: the receipt is the Tickets tab. Navy fill
						    in light, cyan in dark (navy on the dark bar was 1.07:1). */}
						<Ionicons
							name="camera-outline"
							size={26}
							color={active === "scan" ? colors.navy : colors.actionText}
						/>
					</View>
				</Pressable>

				{ITEMS.slice(2).map((it) => (
					<NavItem
						key={it.key}
						label={it.label}
						icon={active === it.key ? it.iconActive : it.icon}
						active={active === it.key}
						onPress={() => onSelect(it.key)}
					/>
				))}
			</View>
		</View>
	);
}

function NavItem({
	label,
	icon,
	active,
	onPress,
}: {
	label: string;
	icon: IoniconName;
	active: boolean;
	onPress: () => void;
}) {
	const colors = useThemeColors();
	return (
		<Pressable
			style={styles.item}
			onPress={onPress}
			accessibilityRole="tab"
			accessibilityLabel={label}
			accessibilityState={{ selected: active }}
			aria-selected={active}
		>
			<Ionicons
				name={icon}
				size={22}
				color={active ? colors.defaultText : colors.mutedText}
			/>
			<Text
				style={[
					styles.itemLabel,
					{ color: colors.mutedText },
					active && { color: colors.defaultText },
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	wrap: {
		borderTopWidth: 1,
		paddingHorizontal: space.sm,
		paddingTop: space.smPlus,
		paddingBottom: space.smPlus,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	item: {
		flex: 1,
		alignItems: "center",
		gap: space.xs,
		paddingVertical: space.xs,
	},
	itemLabel: {
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		lineHeight: 14,
	},
	scanWrap: {
		flex: 1,
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	scanButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		marginTop: -18,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.25,
		shadowRadius: 12,
		elevation: 6,
	},
});
