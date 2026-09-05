import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	title: string;
	/** Renders a back chevron that calls this. Omit on a tab root (paired with
	 * `logo`) that has nothing to go back to. */
	onBack?: () => void;
	/** Tab roots (Home, Ofertas, Perfil) show the brand mark instead of a back
	 * button — there's nowhere for them to go back to. */
	logo?: boolean;
	/** An icon button or similar past the title, e.g. PointsScreen's history
	 * shortcut. Sits flush right — the title's own `flex: 1` pushes it there. */
	right?: ReactNode;
};

/**
 * The navy status-bar-to-header block that opens nearly every screen in this
 * app: the safe-area-colored strip behind the status bar, the light status
 * bar style, and the 56pt navy bar with either a back button or the brand
 * logo plus the screen title. Was duplicated (with mostly-identical styles)
 * in 30+ screens; extracted so a future header-wide change — new back-icon,
 * different height, a shared right-side pattern — happens once.
 *
 * Renders a Fragment, not a wrapping View: it's meant to sit as the first
 * children of a screen's own root `<View style={styles.safeArea}>`, exactly
 * where the three elements it replaces used to.
 */
export function ScreenHeader({ title, onBack, logo, right }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={[styles.header, logo && styles.headerLogoVariant]}>
				{logo ? (
					<Image source={require("../../../assets/logo_ofertar.png")} style={styles.headerLogo} />
				) : onBack ? (
					<Pressable
						onPress={onBack}
						style={styles.backButton}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Volver"
					>
						<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
					</Pressable>
				) : null}
				<Text style={styles.headerTitle} numberOfLines={1}>
					{title}
				</Text>
				{right}
			</View>
		</>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		statusBarBg: { backgroundColor: colors.navy },
		header: {
			backgroundColor: colors.navy,
			paddingHorizontal: space.md,
			height: 56,
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
		},
		headerLogoVariant: { paddingHorizontal: space.xl, gap: space.smPlus },
		backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
		headerLogo: { width: 24, height: 24, borderRadius: 6 },
		headerTitle: {
			flex: 1,
			color: colors.buttonText,
			fontFamily: typography.family.medium,
			fontSize: 17,
		},
	});
}
