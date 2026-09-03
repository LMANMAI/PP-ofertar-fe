import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

type Props = {
	message: string;
	onDismiss: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);

export function Toast({ message, onDismiss }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const translateY = useRef(new Animated.Value(60)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const autoDismiss = useRef<ReturnType<typeof setTimeout>>(null);

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

	const dismiss = () => {
		if (autoDismiss.current) clearTimeout(autoDismiss.current);
		Animated.parallel([
			Animated.timing(translateY, { toValue: 60, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
		]).start(() => onDismiss());
	};

	return (
		<Pressable onPress={dismiss} style={styles.wrap}>
			<Animated.View
				style={[
					styles.toast,
					{ bottom: insets.bottom + 80, width: TOAST_WIDTH, opacity, transform: [{ translateY }] },
				]}
			>
				<Ionicons name="checkmark-circle" size={20} color={colors.successSoftText} />
				<Text style={styles.text}>{message}</Text>
			</Animated.View>
		</Pressable>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	wrap: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
	toast: {
		position: "absolute",
		alignSelf: "center",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: colors.successSoft,
		borderWidth: 1,
		borderColor: colors.success,
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 18,
		shadowColor: colors.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 8,
	},
	text: { flex: 1, color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: 14, lineHeight: 20 },
	});
}
