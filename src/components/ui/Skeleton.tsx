import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	AccessibilityInfo,
	Animated,
	Easing,
	StyleSheet,
	View,
	type StyleProp,
	type ViewStyle,
} from "react-native";
import { space, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type SkeletonProps = {
	style?: StyleProp<ViewStyle>;
	children?: ReactNode;
};

/**
 * Pulsing placeholder that stands in for content that is still loading. Wrap
 * the loading layout in one `<Skeleton>` (single opacity loop for the whole
 * block instead of one animation per bar). Respects the OS Reduce Motion
 * setting — the block then renders as a static soft gray instead of pulsing,
 * mirroring `ScreenTransition`'s handling.
 */
export function Skeleton({ style, children }: SkeletonProps) {
	const opacity = useRef(new Animated.Value(1)).current;
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		let cancelled = false;
		AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
			if (!cancelled) setReduceMotion(enabled);
		});
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
		return () => {
			cancelled = true;
			sub.remove();
		};
	}, []);

	useEffect(() => {
		if (reduceMotion) {
			opacity.setValue(0.6);
			return;
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0.5,
					duration: 700,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 700,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			])
		);
		loop.start();
		return () => loop.stop();
	}, [opacity, reduceMotion]);

	return (
		<Animated.View style={[style, { opacity }]}>
			{children}
		</Animated.View>
	);
}

/**
 * Placeholder for a home "product card" while the recurring-products request
 * is in flight. Same geometry as the real card (fixed width, square icon
 * block, two text lines, footer) so swapping in the data causes no layout
 * shift. Not pressable — it is explicitly not content yet.
 */
export function ProductCardSkeleton() {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<Skeleton style={styles.card}>
			<View style={styles.iconWrap} />
			<View style={styles.nameLine} />
			<View style={styles.offerForLine} />
			<View style={styles.footer}>
				<View style={styles.priceBar} />
				<View style={styles.deltaBar} />
			</View>
		</Skeleton>
	);
}

/**
 * Placeholder for a home "offer" card while the offers request is in flight.
 * Mirrors `OfferCarouselCard`'s geometry (store row, percentage tile, two
 * text lines) so swapping in real data causes no layout shift. Not pressable.
 */
export function OfferCarouselCardSkeleton() {
	const colors = useThemeColors();
	const styles = createStyles(colors);
	return (
		<Skeleton style={styles.offerCard}>
			<View style={styles.offerTop}>
				<View style={styles.offerStoreRow}>
					<View style={styles.storeBadge} />
					<View style={styles.storeName} />
				</View>
			</View>
			<View style={styles.offerBody}>
				<View style={styles.amountTile}>
					<View style={styles.amountKicker} />
					<View style={styles.amountValue} />
				</View>
				<View style={styles.offerBodyRight}>
					<View style={styles.chipBar} />
					<View style={styles.subBar} />
				</View>
			</View>
			<View style={styles.validityBar} />
		</Skeleton>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
		offerCard: {
			width: 262,
			borderRadius: 18,
			padding: space.mdPlus,
			gap: space.smPlus,
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: colors.divider,
		},
		offerTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		offerStoreRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
		storeBadge: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: colors.softWarm,
		},
		storeName: {
			width: 110,
			height: 13,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
		},
		offerBody: { flexDirection: "row", alignItems: "stretch", gap: space.md },
		amountTile: {
			width: 78,
			borderRadius: 14,
			paddingVertical: space.sm,
			paddingHorizontal: space.xsPlus,
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
			backgroundColor: colors.softWarm,
		},
		amountKicker: {
			width: 34,
			height: 11,
			borderRadius: 4,
			backgroundColor: colors.card,
		},
		amountValue: {
			width: 44,
			height: 24,
			borderRadius: 4,
			backgroundColor: colors.card,
		},
		offerBodyRight: { flex: 1, justifyContent: "center", gap: space.sm },
		chipBar: {
			width: "90%",
			height: 15,
			borderRadius: 6,
			backgroundColor: colors.softWarm,
		},
		subBar: {
			width: "70%",
			height: 11,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
		},
		validityBar: {
			width: "55%",
			height: 12,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
		},
		card: {
			width: 150,
			backgroundColor: colors.card,
			borderRadius: 14,
			padding: space.md,
			gap: space.xsPlus,
			borderWidth: 1,
			borderColor: colors.divider,
		},
		iconWrap: {
			width: "100%",
			aspectRatio: 1,
			borderRadius: 10,
			backgroundColor: colors.softWarm,
			marginBottom: space.xsPlus,
		},
		nameLine: {
			width: "85%",
			height: 13,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
		},
		offerForLine: {
			width: "55%",
			height: 10,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
			marginTop: 1,
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginTop: 2,
		},
		priceBar: {
			width: 48,
			height: 15,
			borderRadius: 4,
			backgroundColor: colors.softWarm,
		},
		deltaBar: {
			width: 38,
			height: 22,
			borderRadius: 6,
			backgroundColor: colors.softWarm,
		},
	});
}