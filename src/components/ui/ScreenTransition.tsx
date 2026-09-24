import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { useThemeColors } from "../../theme/designSystem";

type Props = {
	/** The current top-level screen key. Deliberately NOT the bottom-tab key —
	 * switching tabs inside "main" should stay instant, like a real tab bar;
	 * only an actual navigation (a new `screen`) earns the transition. */
	activeKey: string;
	children: ReactNode;
};

/**
 * Stands in for the push/fade transition a navigation library would give
 * screens for free. This app's navigation is a manual `screen` state machine
 * (see PRODUCT.md — a deliberate project decision, not an oversight), which
 * means every screen change was an instant, jarring content swap with zero
 * transition. Replays a short fade + rise on every `activeKey` change so a
 * navigation reads as one screen arriving, not the UI blinking.
 *
 * Respects the OS Reduce Motion setting: the swap becomes instant (opacity/
 * position snap straight to their resting values) rather than being skipped
 * outright — losing the "something just happened" cue entirely would be
 * worse than losing the movement.
 */
export function ScreenTransition({ activeKey, children }: Props) {
	const [opacity] = useState(() => new Animated.Value(1));
	const [translateY] = useState(() => new Animated.Value(0));
	const [reduceMotion, setReduceMotion] = useState(false);
	const isFirstRender = useRef(true);
	const colors = useThemeColors();

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

	// A layout effect, not a passive one: the new screen is already in this
	// commit, so setting the starting values after the paint showed it at full
	// opacity for one frame, hid it, and only then faded it in — a flash.
	useLayoutEffect(() => {
		// The very first paint has nothing to transition from — animating it
		// would just delay the app's first visible frame.
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (reduceMotion) {
			opacity.setValue(1);
			translateY.setValue(0);
			return;
		}
		// Not 0: a fully transparent frame shows whatever is behind the app, which
		// is a white window until the theme background is drawn there.
		opacity.setValue(FADE_FROM);
		translateY.setValue(8);
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 220,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: 0,
				duration: 220,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();
		// activeKey is the only real dependency; opacity/translateY/reduceMotion
		// are stable refs/state read at trigger time, not meant to re-fire this.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeKey]);

	return (
		// The fade happens over the theme background, never over the bare window.
		<View style={[styles.fill, { backgroundColor: colors.background }]}>
			<Animated.View style={[styles.fill, { opacity, transform: [{ translateY }] }]}>
				{children}
			</Animated.View>
		</View>
	);
}

const FADE_FROM = 0.3;

const styles = StyleSheet.create({
	fill: { flex: 1 },
});
