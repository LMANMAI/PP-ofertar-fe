import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Easing,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, typography } from "../theme/designSystem";

type Props = {
	onCancel: () => void;
	onProcessed: () => void;
	onError: () => void;
	mockOutcome?: "success" | "error";
};

export function ScanTicketScreen({
	onCancel,
	onProcessed,
	onError,
	mockOutcome = "success",
}: Props) {
	const insets = useSafeAreaInsets();
	const [permission, requestPermission] = useCameraPermissions();
	const [detecting, setDetecting] = useState(false);
	const progress = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			requestPermission();
		}
	}, [permission, requestPermission]);

	useEffect(() => {
		if (!permission?.granted) return;
		setDetecting(true);
		Animated.timing(progress, {
			toValue: 1,
			duration: 2500,
			easing: Easing.inOut(Easing.ease),
			useNativeDriver: false,
		}).start();
		const t = setTimeout(() => {
			if (mockOutcome === "error") onError();
			else onProcessed();
		}, 2800);
		return () => clearTimeout(t);
	}, [permission?.granted, mockOutcome, onProcessed, onError, progress]);

	const progressWidth = progress.interpolate({
		inputRange: [0, 1],
		outputRange: ["0%", "100%"],
	});

	if (!permission) {
		return (
			<View style={styles.permissionWrap}>
				<ActivityIndicator color={colors.cyan} />
			</View>
		);
	}

	if (!permission.granted) {
		return (
			<View
				style={[
					styles.permissionWrap,
					{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
				]}
			>
				<StatusBar style="light" translucent />
				<Ionicons name="camera-outline" size={48} color={colors.cyan} />
				<Text style={styles.permissionTitle}>Necesitamos tu cámara</Text>
				<Text style={styles.permissionBody}>
					Para escanear tickets tenemos que acceder a la cámara del dispositivo.
				</Text>
				<Pressable style={styles.permissionButton} onPress={requestPermission}>
					<Text style={styles.permissionButtonText}>Habilitar cámara</Text>
				</Pressable>
				<Pressable style={styles.cancelButton} onPress={onCancel}>
					<Text style={styles.cancelText}>Cancelar</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.safeArea}>
			<StatusBar style="light" translucent />
			<CameraView style={StyleSheet.absoluteFill} facing="back" />

			<View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
				<Pressable onPress={onCancel} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
					<Ionicons name="close" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.topTitle}>Escaneando ticket</Text>
				<View style={{ width: 32 }} />
			</View>

			<View style={styles.frameWrap}>
				<View style={styles.frame}>
					<View style={[styles.corner, styles.cornerTL]} />
					<View style={[styles.corner, styles.cornerTR]} />
					<View style={[styles.corner, styles.cornerBL]} />
					<View style={[styles.corner, styles.cornerBR]} />
				</View>
				<Text style={styles.frameHint}>Apuntá al ticket completo</Text>
			</View>

			<View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
				{detecting && (
					<>
						<Text style={styles.detectingTitle}>Detectando productos…</Text>
						<View style={styles.progressTrack}>
							<Animated.View
								style={[styles.progressFill, { width: progressWidth }]}
							/>
						</View>
						<View style={styles.chipsRow}>
							<Chip label="OCR activo" tone="cyan" />
							<Chip label="Leyendo precios" tone="muted" />
							<Chip label="Marcas" tone="muted" />
						</View>
						<View style={styles.bottomHintRow}>
							<Ionicons
								name="phone-portrait-outline"
								size={14}
								color="rgba(255,255,255,0.7)"
							/>
							<Text style={styles.bottomHint}>
								Sostené el teléfono firme y bien iluminado
							</Text>
						</View>
					</>
				)}
				<Pressable style={styles.bottomCancel} onPress={onCancel}>
					<Text style={styles.bottomCancelText}>Cancelar</Text>
				</Pressable>
			</View>
		</View>
	);
}

function Chip({ label, tone }: { label: string; tone: "cyan" | "muted" }) {
	return (
		<View
			style={[
				styles.chip,
				tone === "cyan" ? styles.chipCyan : styles.chipMuted,
			]}
		>
			<View
				style={[
					styles.chipDot,
					tone === "cyan" ? styles.chipDotCyan : styles.chipDotMuted,
				]}
			/>
			<Text
				style={[
					styles.chipText,
					tone === "cyan" ? styles.chipTextCyan : styles.chipTextMuted,
				]}
			>
				{label}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: "#000" },
	permissionWrap: {
		flex: 1,
		backgroundColor: colors.navy,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
		gap: 14,
	},
	permissionTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 22,
		textAlign: "center",
	},
	permissionBody: {
		color: "rgba(255,255,255,0.7)",
		fontFamily: typography.family.regular,
		fontSize: 14,
		lineHeight: 20,
		textAlign: "center",
	},
	permissionButton: {
		marginTop: 8,
		backgroundColor: colors.cyan,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 10,
	},
	permissionButtonText: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 14,
	},
	cancelButton: { padding: 12 },
	cancelText: {
		color: "rgba(255,255,255,0.7)",
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingBottom: 10,
		backgroundColor: "rgba(0,0,0,0.55)",
	},
	closeButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	topTitle: {
		flex: 1,
		textAlign: "center",
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
	frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
	frame: {
		width: "80%",
		aspectRatio: 0.62,
		borderRadius: 12,
		position: "relative",
	},
	corner: {
		position: "absolute",
		width: 28,
		height: 28,
		borderColor: colors.cyan,
	},
	cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
	cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
	cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
	cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
	frameHint: {
		marginTop: 16,
		color: "rgba(255,255,255,0.85)",
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	bottomBar: {
		backgroundColor: "rgba(0,0,0,0.65)",
		paddingHorizontal: 20,
		paddingTop: 18,
		gap: 12,
	},
	detectingTitle: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
		textAlign: "center",
	},
	progressTrack: {
		height: 4,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.18)",
		overflow: "hidden",
	},
	progressFill: { height: 4, backgroundColor: colors.cyan, borderRadius: 2 },
	chipsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
		flexWrap: "wrap",
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	chipCyan: { backgroundColor: "rgba(125,212,245,0.18)" },
	chipMuted: { backgroundColor: "rgba(255,255,255,0.1)" },
	chipDot: { width: 6, height: 6, borderRadius: 3 },
	chipDotCyan: { backgroundColor: colors.cyan },
	chipDotMuted: { backgroundColor: "rgba(255,255,255,0.55)" },
	chipText: { fontFamily: typography.family.medium, fontSize: 11 },
	chipTextCyan: { color: colors.cyan },
	chipTextMuted: { color: "rgba(255,255,255,0.75)" },
	bottomHintRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		justifyContent: "center",
	},
	bottomHint: {
		color: "rgba(255,255,255,0.65)",
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	bottomCancel: {
		marginTop: 6,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.35)",
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
	},
	bottomCancelText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
});
