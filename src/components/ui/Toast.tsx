import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../../theme/designSystem";

type Props = {
	message: string;
	/** "error" for something that did not go through: it cannot wear the green
	 * check of something that did. */
	kind?: "success" | "error";
	onDismiss: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);

export function Toast({ message, kind = "success", onDismiss }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [translateY] = useState(() => new Animated.Value(60));
	const [opacity] = useState(() => new Animated.Value(0));
	const autoDismiss = useRef<ReturnType<typeof setTimeout>>(null);

	const dismiss = () => {
		if (autoDismiss.current) clearTimeout(autoDismiss.current);
		Animated.parallel([
			Animated.timing(translateY, { toValue: 60, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
		]).start(() => onDismiss());
	};

	useEffect(() => {
		Animated.parallel([
			Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 200, useNativeDriver: true }),
			Animated.timing(opacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
		]).start();

		autoDismiss.current = setTimeout(() => dismiss(), 3000);

		return () => {
			if (autoDismiss.current) clearTimeout(autoDismiss.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isError = kind === "error";
	const tone = isError ? colors.dangerSoftText : colors.successSoftText;

	// Only the toast itself takes the tap. The wrapper used to be a full-screen
	// Pressable, so for the three seconds a toast was up the next tap anywhere
	// was spent dismissing it — "Agregar a mi lista" and then "Seguir" lost the
	// second one.
	return (
		<View style={styles.wrap} pointerEvents="box-none">
			<Animated.View
				style={[
					styles.toast,
					isError && styles.toastError,
					{ bottom: insets.bottom + 80, width: TOAST_WIDTH, opacity, transform: [{ translateY }] },
				]}
			>
				<Pressable
					onPress={dismiss}
					style={styles.toastBody}
					accessibilityRole="alert"
					accessibilityLiveRegion="polite"
					accessibilityHint="Tocá para cerrar el aviso"
				>
					<Ionicons name={isError ? "alert-circle" : "checkmark-circle"} size={20} color={tone} />
					<Text style={[styles.text, { color: tone }]}>{message}</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	wrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
	toast: {
		position: "absolute",
		alignSelf: "center",
		backgroundColor: colors.successSoft,
		borderWidth: 1,
		borderColor: colors.success,
		borderRadius: radii.md,
		shadowColor: colors.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 8,
	},
	toastError: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
	toastBody: { flexDirection: "row", alignItems: "center", gap: space.smPlus, paddingVertical: space.mdPlus, paddingHorizontal: 18 },
	text: { flex: 1, color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.label, lineHeight: 20 },
	});
}
