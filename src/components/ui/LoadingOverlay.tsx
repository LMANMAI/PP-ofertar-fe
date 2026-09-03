import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { space, typography, useThemeColors, type ColorTokens } from "../../theme/designSystem";

const appIcon = require("../../../assets/icon.png");

type Props = {
	fileType: "pdf" | "image";
};

const IMAGE_MESSAGES = [
	"Analizando imágenes…",
	"Identificando productos…",
	"Calculando ahorros…",
];

const PDF_MESSAGES = [
	"Procesando documento…",
	"Extrayendo información…",
	"Analizando compras…",
];

export function LoadingOverlay({ fileType }: Props) {
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const isPdf = fileType === "pdf";
	const messages = isPdf ? PDF_MESSAGES : IMAGE_MESSAGES;

	const pulseAnim = useRef(new Animated.Value(1)).current;
	const sweepAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(1)).current;

	const [messageIndex, setMessageIndex] = useState(0);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;

		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.06,
					duration: 2000,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.delay(400),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 2000,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.delay(400),
			]),
		);

		const sweep = Animated.loop(
			Animated.sequence([
				Animated.timing(sweepAnim, {
					toValue: 1,
					duration: 3200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.delay(600),
				Animated.timing(sweepAnim, {
					toValue: 0,
					duration: 3200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.delay(600),
			]),
		);

		pulse.start();
		sweep.start();

		return () => {
			mountedRef.current = false;
			pulse.stop();
			sweep.stop();
		};
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			if (!mountedRef.current) return;
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 500,
				useNativeDriver: true,
			}).start(() => {
				if (!mountedRef.current) return;
				setMessageIndex((prev) => (prev + 1) % messages.length);
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 500,
					useNativeDriver: true,
				}).start();
			});
		}, 5000);

		return () => clearInterval(interval);
	}, []);

	const accent = isPdf ? colors.orange : colors.cyan;

	const sweepTranslateX = sweepAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-50, 210],
	});

	return (
		<View style={styles.overlay}>
			<View style={styles.content}>
				<Animated.View style={[styles.ringOuter, { transform: [{ scale: pulseAnim }] }]}>
					<View style={styles.ringInner}>
						<Animated.Image
							source={appIcon}
							style={styles.logo}
							resizeMode="contain"
						/>
					</View>
				</Animated.View>

				<View style={[styles.fileBadge, { backgroundColor: accent }]}>
					<Text style={styles.fileBadgeText}>
						{isPdf ? "PDF" : "FOTOS"}
					</Text>
				</View>

				<View style={styles.progressTrack}>
					<Animated.View
						style={[
							styles.progressSweep,
							{ transform: [{ translateX: sweepTranslateX }] },
						]}
					/>
				</View>

				<Animated.Text style={[styles.statusText, { opacity: fadeAnim }]}>
					{messages[messageIndex]}
				</Animated.Text>

				<Text style={styles.hint}>
					{isPdf
						? "Esto puede tomar unos segundos"
						: "Esto puede tomar un poco más con varias imágenes"}
				</Text>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(10,31,68,0.92)",
		alignItems: "center",
		justifyContent: "center",
	},
	content: {
		alignItems: "center",
		gap: space.xl,
		paddingHorizontal: 40,
	},
	ringOuter: {
		width: 96,
		height: 96,
		borderRadius: 48,
		borderWidth: 2,
		borderColor: "rgba(125,212,245,0.25)",
		alignItems: "center",
		justifyContent: "center",
	},
	ringInner: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "rgba(125,212,245,0.08)",
		alignItems: "center",
		justifyContent: "center",
	},
	logo: {
		width: 52,
		height: 52,
		borderRadius: 12,
	},
	fileBadge: {
		paddingHorizontal: space.mdPlus,
		paddingVertical: 5,
		borderRadius: 999,
	},
	fileBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 11,
		letterSpacing: 1.2,
	},
	progressTrack: {
		width: 200,
		height: 3,
		borderRadius: 1.5,
		backgroundColor: "rgba(255,255,255,0.1)",
		overflow: "hidden",
	},
	progressSweep: {
		width: 60,
		height: 3,
		borderRadius: 1.5,
		backgroundColor: colors.cyan,
	},
	statusText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		textAlign: "center",
	},
	hint: {
		color: "rgba(255,255,255,0.4)",
		fontFamily: typography.family.regular,
		fontSize: 12,
		textAlign: "center",
	},
	});
}
