import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import type { Session } from "../auth/session";
import { storeToken, setBiometricPreference } from "../auth/biometricAuth";

type Props = {
	session: Session;
	onEnable: () => void;
	onDismiss: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);

export function BiometricPromptScreen({ session, onEnable, onDismiss }: Props) {
	const insets = useSafeAreaInsets();
	const [activating, setActivating] = useState(false);

	const overlayOpacity = useRef(new Animated.Value(0)).current;
	const cardScale = useRef(new Animated.Value(0.92)).current;
	const cardOpacity = useRef(new Animated.Value(0)).current;
	const circleScale = useRef(new Animated.Value(0.8)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(overlayOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
			Animated.timing(cardOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
			Animated.spring(cardScale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
		]).start();

		const pulseTimeout = setTimeout(() => {
			Animated.sequence([
				Animated.timing(circleScale, { toValue: 1.06, duration: 250, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
				Animated.timing(circleScale, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
			]).start();
		}, 500);

		return () => clearTimeout(pulseTimeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleEnable = async () => {
		setActivating(true);
		await storeToken(session.token);
		await setBiometricPreference(true);
		Animated.parallel([
			Animated.timing(overlayOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(cardOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(cardScale, { toValue: 0.95, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
		]).start(() => onEnable());
	};

	const handleDismiss = () => {
		Animated.parallel([
			Animated.timing(overlayOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(cardOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
			Animated.timing(cardScale, { toValue: 0.95, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
		]).start(() => onDismiss());
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
				<View style={styles.overlayFill} />
			</Animated.View>

			<View style={styles.center}>
				<Animated.View
					style={[
						styles.card,
						{ width: CARD_WIDTH, opacity: cardOpacity, transform: [{ scale: cardScale }] },
					]}
				>
					<Animated.View style={[styles.fingerprintCircle, { transform: [{ scale: circleScale }] }]}>
						<Ionicons name="finger-print-outline" size={44} color={colors.navy} />
					</Animated.View>

					<Text style={styles.title}>¿Querés usar tu huella para ingresar más rápido?</Text>

					<Text style={styles.body}>
						La próxima vez que abras la app podrás ingresar con tu huella en vez de escribir la contraseña.
					</Text>

					<Pressable
						onPress={activating ? undefined : handleEnable}
						style={({ pressed }) => [
							styles.enableBtn,
							pressed && !activating && { opacity: 0.85, transform: [{ scale: 0.98 }] },
							activating && { opacity: 0.7 },
						]}
						disabled={activating}
					>
						<Ionicons name="finger-print-outline" size={20} color={colors.buttonText} />
						<Text style={styles.enableBtnText}>Activar inicio con huella</Text>
					</Pressable>

					<Pressable
						onPress={activating ? undefined : handleDismiss}
						style={({ pressed }) => [
							styles.dismissBtn,
							pressed && !activating && { opacity: 0.6 },
						]}
						disabled={activating}
					>
						<Text style={styles.dismissBtnText}>Ahora no</Text>
					</Pressable>
				</Animated.View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
	overlayFill: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
	center: { ...StyleSheet.absoluteFillObject, zIndex: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
	card: {
		backgroundColor: colors.card,
		borderRadius: 20,
		paddingHorizontal: 28,
		paddingTop: 32,
		paddingBottom: 28,
		alignItems: "center",
		gap: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.15,
		shadowRadius: 24,
		elevation: 12,
	},
	fingerprintCircle: {
		width: 88,
		height: 88,
		borderRadius: 44,
		backgroundColor: colors.cyan,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 4,
	},
	title: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 20, lineHeight: 28, textAlign: "center" },
	body: { color: colors.mutedText, fontFamily: typography.family.regular, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: -4 },
	enableBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 12,
		paddingHorizontal: 24,
		width: "100%",
		marginTop: 4,
	},
	enableBtnText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	dismissBtn: { paddingVertical: 12, paddingHorizontal: 20 },
	dismissBtnText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
});
