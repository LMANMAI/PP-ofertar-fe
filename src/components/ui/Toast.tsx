import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/designSystem";

type Props = {
	message: string;
	onDismiss: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);

export function Toast({ message, onDismiss }: Props) {
	const insets = useSafeAreaInsets();
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
				<Ionicons name="checkmark-circle" size={20} color="#16A34A" />
				<Text style={styles.text}>{message}</Text>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	wrap: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
	toast: {
		position: "absolute",
		alignSelf: "center",
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: "#ECFDF5",
		borderWidth: 1,
		borderColor: "#A7F3D0",
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 18,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 8,
	},
	text: { flex: 1, color: "#065F46", fontFamily: typography.family.medium, fontSize: 14, lineHeight: 20 },
});
