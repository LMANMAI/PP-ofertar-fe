import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../../theme/designSystem";
import { useOnboardingTarget } from "../onboarding/OnboardingProvider";

export type TabKey = "home" | "offers" | "scan" | "points" | "profile";

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
		key: "points",
		label: "Puntos",
		icon: "star-outline",
		iconActive: "star",
	},
	{
		key: "profile",
		label: "Perfil",
		icon: "person-outline",
		iconActive: "person",
	},
];

export function BottomNav({ active, onSelect, onScanPress }: Props) {
	const navigationTarget = useOnboardingTarget("main-navigation");
	const scanTarget = useOnboardingTarget("scan-ticket");
	return (
		<View
			ref={navigationTarget.ref}
			onLayout={navigationTarget.onLayout}
			style={styles.wrap}
		>
			<View style={styles.row}>
				{ITEMS.slice(0, 2).map((it) => (
					<NavItem
						key={it.key}
						label={it.label}
						icon={active === it.key ? it.iconActive : it.icon}
						active={active === it.key}
						onPress={() => onSelect(it.key)}
					/>
				))}

				<Pressable style={styles.scanWrap} onPress={onScanPress}>
					<View
						ref={scanTarget.ref}
						onLayout={scanTarget.onLayout}
						style={[
							styles.scanButton,
							active === "scan" && styles.scanButtonActive,
						]}
					>
						<Ionicons
							name="receipt-outline"
							size={24}
							color={colors.buttonText}
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
	return (
		<Pressable style={styles.item} onPress={onPress}>
			<Ionicons
				name={icon}
				size={22}
				color={active ? colors.navy : colors.mutedText}
			/>
			<Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	wrap: {
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingHorizontal: 8,
		paddingTop: 10,
		paddingBottom: 10,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	item: {
		flex: 1,
		alignItems: "center",
		gap: 4,
		paddingVertical: 4,
	},
	itemLabel: {
		fontFamily: typography.family.medium,
		fontSize: 11,
		lineHeight: 14,
		color: colors.mutedText,
	},
	itemLabelActive: {
		color: colors.navy,
	},
	scanWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	scanButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
		marginTop: -18,
		shadowColor: colors.navy,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.25,
		shadowRadius: 12,
		elevation: 6,
	},
	scanButtonActive: {
		backgroundColor: colors.cyan,
	},
});
