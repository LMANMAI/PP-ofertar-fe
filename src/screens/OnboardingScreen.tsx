import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

import { colors, typography } from "../theme/designSystem";
import { ScanMethodScreen } from "./ScanMethodScreen";
import { ComparePricesScreen } from "./ComparePricesScreen";

const AUTO_ADVANCE_MS = 4500;
const noop = () => {};

type Step = {
	key: string;
	caption: string;
	// undefined = intro slide (no live screen behind it)
	render?: () => React.ReactNode;
};

const STEPS: Step[] = [
	{
		key: "welcome",
		caption:
			"Bienvenido a OfertAR. Te mostramos rápido cómo escanear tu primer ticket y comparar precios.",
	},
	{
		key: "scan",
		caption:
			"Así vas a cargar tu ticket: elegís sacarle fotos o subir el PDF que descargaste.",
		render: () => (
			<ScanMethodScreen
				onChoosePhotos={noop}
				onChoosePdf={noop}
				onChooseBarcode={noop}
				onBack={noop}
			/>
		),
	},
	{
		key: "compare",
		caption:
			"Y así comparás precios entre comercios para elegir siempre la opción más barata.",
		render: () => (
			<ComparePricesScreen
				onBack={noop}
				onSelectStore={noop}
				activeTab="home"
				onSelectTab={noop}
				onScanPress={noop}
			/>
		),
	},
];

type Props = {
	onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
	const insets = useSafeAreaInsets();
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_700Bold,
	});
	const [activeIndex, setActiveIndex] = useState(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isLast = activeIndex === STEPS.length - 1;

	const clearTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
	};

	const goNext = () => {
		clearTimer();
		setActiveIndex((prev) => (prev === STEPS.length - 1 ? prev : prev + 1));
	};

	useEffect(() => {
		if (isLast) return;
		timerRef.current = setTimeout(goNext, AUTO_ADVANCE_MS);
		return clearTimer;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeIndex]);

	if (!fontsLoaded) {
		return (
			<View style={styles.introSafeArea}>
				<View style={[styles.statusBarBg, { height: insets.top }]} />
				<StatusBar style="light" translucent />
				<View style={styles.loader}>
					<ActivityIndicator size="small" color={colors.cyan} />
				</View>
			</View>
		);
	}

	const step = STEPS[activeIndex];
	const handleManualNext = () => {
		clearTimer();
		if (isLast) {
			onDone();
			return;
		}
		setActiveIndex((prev) => prev + 1);
	};

	return (
		<View style={styles.fill}>
			{/* Fondo: pantalla real (demo, no interactiva) o slide de bienvenida */}
			{step.render ? (
				<View style={styles.fill} pointerEvents="none">
					{step.render()}
				</View>
			) : (
				<View style={styles.introSafeArea}>
					<View style={[styles.statusBarBg, { height: insets.top }]} />
					<StatusBar style="light" translucent />
					<View style={styles.introCenter}>
						<View style={styles.iconCircle}>
							<Ionicons name="sparkles-outline" size={44} color={colors.cyan} />
						</View>
						<Text style={styles.introTitle}>OfertAR</Text>
					</View>
				</View>
			)}

			{/* Bloqueador de toques: absorbe cualquier tap sobre la demo real y avanza */}
			<Pressable style={styles.tapBlocker} onPress={handleManualNext} />

			{/* Omitir */}
			{!isLast && (
				<Pressable
					onPress={onDone}
					style={[styles.skipButton, { top: insets.top + 12 }]}
				>
					<Text style={styles.skipText}>Omitir</Text>
				</Pressable>
			)}

			{/* Panel inferior: caption + dots + CTA */}
			<View
				style={[styles.captionPanel, { paddingBottom: insets.bottom + 20 }]}
			>
				<Text style={styles.captionText}>{step.caption}</Text>

				<View style={styles.dotsRow}>
					{STEPS.map((s, index) => (
						<Pressable
							key={s.key}
							onPress={() => {
								clearTimer();
								setActiveIndex(index);
							}}
							hitSlop={8}
						>
							<View
								style={[styles.dot, index === activeIndex && styles.dotActive]}
							/>
						</Pressable>
					))}
				</View>

				<Pressable
					style={({ pressed }) => [
						styles.primaryButton,
						pressed && styles.pressed,
					]}
					onPress={handleManualNext}
				>
					<Text style={styles.primaryButtonText}>
						{isLast ? "Empezar" : "Siguiente"}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	introSafeArea: { flex: 1, backgroundColor: colors.navy },
	statusBarBg: { backgroundColor: colors.navy },
	loader: { flex: 1, alignItems: "center", justifyContent: "center" },
	introCenter: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	iconCircle: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 2.5,
		borderColor: colors.cyan,
		alignItems: "center",
		justifyContent: "center",
	},
	introTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 22,
	},
	tapBlocker: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 170,
	},
	skipButton: {
		position: "absolute",
		right: 20,
		zIndex: 10,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		backgroundColor: "rgba(10,31,68,0.55)",
	},
	skipText: {
		color: "#FFFFFF",
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	captionPanel: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(10,31,68,0.94)",
		paddingHorizontal: 24,
		paddingTop: 20,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	captionText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 16,
	},
	dotsRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.28)",
	},
	dotActive: {
		width: 22,
		backgroundColor: colors.cyan,
	},
	primaryButton: {
		height: 50,
		borderRadius: 14,
		backgroundColor: colors.orange,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	pressed: { opacity: 0.88 },
});
