import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";

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
	const opacity = useRef(new Animated.Value(1)).current;
	const translateY = useRef(new Animated.Value(0)).current;
	const [reduceMotion, setReduceMotion] = useState(false);
	const isFirstRender = useRef(true);

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
		opacity.setValue(0);
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
		<Animated.View style={[styles.fill, { opacity, transform: [{ translateY }] }]}>
			{children}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
});
