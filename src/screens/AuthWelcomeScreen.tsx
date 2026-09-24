import { useEffect, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import {
	AccessibilityInfo,
	ActivityIndicator,
	Animated,
	Easing,
	Image,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space, typography, radii, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { Ionicons } from "@expo/vector-icons";
import { useBiometricInfo } from "../auth/biometricAuth";
import { TERMS_URL } from "../constants/legal";

type AuthWelcomeScreenProps = {
	onAlreadyHaveAccount?: () => void;
	onCreateAccount?: () => void;
	showBiometricButton?: boolean;
	onBiometricLogin?: () => void;
};

// Illustrative only — the card is labeled "Ejemplo" on screen so none of
// these prices reads as a real quote.
const EXAMPLE_ITEMS = [
	{ name: "Yerba mate 1 kg", price: "$4.850" },
	{ name: "Leche entera 1 L", price: "$1.320" },
	{ name: "Fideos 500 g", price: "$980" },
];
const EXAMPLE_TIP = "Te conviene: leche entera 1 L a $1.140 en otra cadena";
// Below this height the card would push the buttons off the first screen.
const MIN_HEIGHT_FOR_EXAMPLE = 700;
const EXAMPLE_LABEL = `Ejemplo ilustrativo de un ticket: ${EXAMPLE_ITEMS.map((i) => `${i.name} ${i.price}`).join(", ")}. ${EXAMPLE_TIP}`;

export function AuthWelcomeScreen({
	onAlreadyHaveAccount,
	onCreateAccount,
	showBiometricButton = false,
	onBiometricLogin,
}: AuthWelcomeScreenProps) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const biometric = useBiometricInfo();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});

	// One authored moment: the example ticket "prints" line by line. Everything
	// else on the screen is already there at first paint.
	const [lineProgress] = useState(() => [...EXAMPLE_ITEMS, EXAMPLE_TIP].map(() => new Animated.Value(0)));

	useEffect(() => {
		let cancelled = false;
		const showAll = () => lineProgress.forEach((v) => v.setValue(1));
		AccessibilityInfo.isReduceMotionEnabled()
			.then((reduceMotion) => {
				if (cancelled) return;
				if (reduceMotion) {
					showAll();
					return;
				}
				Animated.stagger(
					140,
					lineProgress.map((v) =>
						Animated.timing(v, {
							toValue: 1,
							duration: 260,
							easing: Easing.out(Easing.cubic),
							useNativeDriver: true,
						}),
					),
				).start();
			})
			.catch(showAll);
		return () => {
			cancelled = true;
		};
	}, [lineProgress]);

	if (!fontsLoaded) {
		return (
			<View style={styles.safeArea}>
				<View style={[styles.statusBarBg, { height: insets.top }]} />
				<StatusBar style="light" />
				<View style={[styles.loader, { paddingBottom: insets.bottom }]} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando">
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			</View>
		);
	}

	const lineStyle = (index: number) => ({
		opacity: lineProgress[index],
		transform: [
			{
				translateY: lineProgress[index].interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
			},
		],
	});

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />

			<ScrollView
				style={styles.background}
				contentContainerStyle={[styles.content, { paddingBottom: space.smPlus + insets.bottom }]}
				bounces={false}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.zoneTop} />

				<View style={styles.zoneHero}>
					<View style={styles.hero}>
						<Image
							source={require("../../assets/logo_ofertar_sm.png")}
							style={styles.badgeIcon}
							resizeMode="cover"
							accessible={false}
						/>
						<Text style={styles.brandTitle} accessibilityLabel="OfertAR">
							Ofert<Text style={styles.brandAccent}>AR</Text>
						</Text>
						

						<Text style={styles.headline} accessibilityRole="header">
							Pagá menos en cada{" "}
							<Text style={styles.headlineAccent}>compra.</Text>
						</Text>
						<Text style={styles.body}>
							Sacale una foto a tu ticket y te avisamos qué te conviene comprar la próxima
							vez. Empezá gratis.
						</Text>
					</View>
				</View>

				<View style={styles.zoneMid}>
					{height >= MIN_HEIGHT_FOR_EXAMPLE && (
						<View
							style={styles.example}
							accessible
							accessibilityLabel={EXAMPLE_LABEL}
						>
							<Text style={styles.exampleTitle}>Ejemplo de ticket</Text>
							{EXAMPLE_ITEMS.map((item, index) => (
								<Animated.View key={item.name} style={[styles.exampleRow, lineStyle(index)]}>
									<Text style={styles.exampleItem}>{item.name}</Text>
									<Text style={styles.examplePrice}>{item.price}</Text>
								</Animated.View>
							))}
							<View style={styles.exampleDivider} />
							<Animated.View style={[styles.exampleTip, lineStyle(EXAMPLE_ITEMS.length)]}>
								<Ionicons name="trending-down" size={16} color={colors.cyan} />
								<Text style={styles.exampleTipText}>{EXAMPLE_TIP}</Text>
							</Animated.View>
						</View>
					)}
				</View>

				<View style={styles.zoneCta}>
					<Pressable
						style={(state) => [ styles.primaryButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing,
						]}
						onPress={onCreateAccount}
						accessibilityRole="button"
						accessibilityLabel="Crear cuenta"
					>
						<Text style={styles.primaryButtonText}>Crear cuenta</Text>
					</Pressable>

					<Pressable
						onPress={onAlreadyHaveAccount}
						style={(state) => [ styles.secondaryButton, state.pressed && styles.pressed, isFocused(state) && styles.focusRing,
						]}
						accessibilityRole="button"
						accessibilityLabel="Ya tengo cuenta"
					>
						<Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
					</Pressable>

					{showBiometricButton && (
						<Pressable
							onPress={onBiometricLogin}
							style={(state) => [ styles.biometricButton, state.pressed && { opacity: 0.6 }, isFocused(state) && styles.focusRing,
							]}
							accessibilityRole="button"
							accessibilityLabel={`Iniciar sesión con ${biometric.hint}`}
						>
							<Ionicons name={biometric.icon} size={16} color={colors.navyMutedText} />
							<Text style={styles.biometricButtonText}>Iniciar con {biometric.hint}</Text>
						</Pressable>
					)}

					<Pressable
							onPress={() => {
								Linking.openURL(TERMS_URL).catch(() => {});
							}}
							style={(state) => [
								styles.legalButton,
								!showBiometricButton && styles.legalTextBreak,
								isFocused(state) && styles.focusRing,
							]}
							accessibilityRole="link"
							accessibilityLabel="Al continuar aceptás los términos y la política de privacidad"
						>
							<Text style={styles.legalText}>
								Al continuar aceptás los <Text style={styles.legalUnderline}>términos y la política de privacidad</Text>.
							</Text>
						</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.navy,
	},
	statusBarBg: {
		backgroundColor: colors.navy,
	},
	background: {
		flex: 1,
		backgroundColor: colors.navy,
	},
	// flexGrow (not flex) on the zones: with flex the zones collapse to their
	// share of the height and clip on a short phone or a large text size;
	// with flexGrow they keep their content height and the screen scrolls.
	content: {
		flexGrow: 1,
		paddingHorizontal: space.xxl,
		paddingTop: space.smPlus,
	},
	zoneTop: {
		flexGrow: 0.1,
	},
	zoneHero: {
		flexGrow: 2,
		justifyContent: "center",
	},
	zoneMid: {
		flexGrow: 1.1,
		justifyContent: "flex-end",
		paddingVertical: space.lg,
	},
	zoneCta: {
		paddingBottom: space.xsPlus,
		gap: space.sm,
	},
	loader: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.navy,
	},
	hero: {
		maxWidth: 324,
		justifyContent: "center",
	},
	// No blanket gap here on purpose: the four elements below read as two
	// groups — a tight brand lockup (logo, name, tagline), then a clear break
	// into the actual pitch (headline, body) — so each gap is spelled out
	// explicitly rather than inherited from a container value that would
	// silently stack with these anyway.
	badgeIcon: {
		width: 84,
		height: 84,
		borderRadius: radii.sm,
		marginBottom: space.md,
	},
	
	brandTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.h1,
		lineHeight: typography.lineHeights.h1,
	},
	brandAccent: {
		color: colors.cyan,
	},
	headline: {
		marginTop: space.xl,
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: typography.sizes.display,
		lineHeight: typography.lineHeights.display,
		letterSpacing: -0.6,
	},
	headlineAccent: {
		color: colors.cyan,
	},
	body: {
		marginTop: space.sm,
		color: colors.navyMutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.bodyL,
		lineHeight: typography.lineHeights.bodyL,
	},
	// Flat, hairline-bordered card: this app separates surfaces with a border,
	// not a shadow. The border is navyMutedText at low alpha because the
	// surface underneath is always the fixed navy.
	example: {
		width: "100%",
		maxWidth: 420,
		borderWidth: 1,
		borderColor: colors.navyHairline,
		borderRadius: radii.md,
		padding: space.mdPlus,
		gap: space.sm,
	},
	exampleTitle: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.overline,
		lineHeight: typography.lineHeights.overline,
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	exampleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: space.md,
	},
	exampleItem: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.label,
		lineHeight: typography.lineHeights.label,
	},
	examplePrice: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
		lineHeight: typography.lineHeights.label,
		fontVariant: ["tabular-nums"],
	},
	exampleDivider: {
		height: 1,
		backgroundColor: colors.navyHairline,
	},
	exampleTip: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.sm,
	},
	exampleTipText: {
		flex: 1,
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
	},
	// White on the coral fill is 3.09:1; navy on coral is ~5.3:1.
	primaryButton: {
		height: 52,
		borderRadius: radii.button,
		backgroundColor: colors.orange,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.body,
	},
	// Same 52px hit area as the primary, but no fill or border: only "Crear
	// cuenta" carries the coral, so the two read as a choice, not a pair.
	secondaryButton: {
		height: 52,
		borderRadius: radii.button,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		color: colors.navyMutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
		lineHeight: typography.lineHeights.body,
	},
	legalButton: {
		minHeight: 44,
		justifyContent: "center",
	},
	legalUnderline: {
		textDecorationLine: "underline",
	},
	legalText: {
		color: colors.navyMutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.micro,
		lineHeight: typography.lineHeights.micro,
		textAlign: "left",
	},
	// Only needed when the biometric row is absent: legalText then sits
	// directly under the CTA pair and needs the same "new group" break the
	// biometric button otherwise provides.
	legalTextBreak: {
		marginTop: space.md,
	},
	// The break before this tertiary action: primary/secondary are the
	// decision, this and the legal line are the footnote — grouped tight to
	// each other (the container's own gap.sm), separated from the CTAs above.
	biometricButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		minHeight: 44,
		marginTop: space.md,
	},
	biometricButtonText: {
		color: colors.navyMutedText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
		lineHeight: typography.lineHeights.label,
	},
	focusRing: focusRing(colors),
	pressed: {
		opacity: 0.88,
	},
	});
}
