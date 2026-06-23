import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, typography } from "../theme/designSystem";

export type CapturedPhoto = {
	id: string;
	uri: string;
	base64: string;
};

type Props = {
	onBack: () => void;
	onSend: (photos: CapturedPhoto[]) => void;
};

export function CaptureTicketScreen({ onBack, onSend }: Props) {
	const insets = useSafeAreaInsets();
	const cameraRef = useRef<CameraView>(null);
	const [permission, requestPermission] = useCameraPermissions();
	const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
	const [capturing, setCapturing] = useState(false);

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			requestPermission();
		}
	}, [permission, requestPermission]);

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
					Para sacar fotos del ticket necesitamos acceso a la cámara del dispositivo.
				</Text>
				<Pressable style={styles.permissionButton} onPress={requestPermission}>
					<Text style={styles.permissionButtonText}>Habilitar cámara</Text>
				</Pressable>
				<Pressable style={styles.cancelButton} onPress={onBack}>
					<Text style={styles.cancelText}>Cancelar</Text>
				</Pressable>
			</View>
		);
	}

	const handleCapture = async () => {
		if (!cameraRef.current || capturing) return;
		setCapturing(true);
		try {
			const picture = await cameraRef.current.takePictureAsync({
				base64: true,
				quality: 0.8,
			});
			if (picture?.base64) {
				const base64 = picture.base64;
				setPhotos((prev) => [
					...prev,
					{
						id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						uri: picture.uri,
						base64,
					},
				]);
			}
		} finally {
			setCapturing(false);
		}
	};

	const handleDelete = (id: string) => {
		setPhotos((prev) => prev.filter((p) => p.id !== id));
	};

	return (
		<View style={styles.safeArea}>
			<StatusBar style="light" translucent />

			<CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

			<View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
				<Pressable onPress={onBack} style={styles.closeButton}>
					<Ionicons name="close" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.topTitle}>Ticket de compra</Text>
				<View style={{ width: 32 }} />
			</View>

			<View style={styles.frameWrap}>
				<View style={styles.frame}>
					<View style={[styles.corner, styles.cornerTL]} />
					<View style={[styles.corner, styles.cornerTR]} />
					<View style={[styles.corner, styles.cornerBL]} />
					<View style={[styles.corner, styles.cornerBR]} />
				</View>
				<Text style={styles.frameHint}>Encuadrá el ticket completo</Text>
			</View>

			<View style={[styles.controlsPanel, { paddingBottom: insets.bottom + 16 }]}>
				{photos.length > 0 && (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.thumbnailsContent}
						style={styles.thumbnailsStrip}
					>
						{photos.map((photo, index) => (
							<View key={photo.id} style={styles.thumbnailWrap}>
								<Image
									source={{ uri: photo.uri }}
									style={styles.thumbnail}
								/>
								<View style={styles.orderBadge}>
									<Text style={styles.orderBadgeText}>{index + 1}</Text>
								</View>
								<Pressable
									style={styles.deleteButton}
									onPress={() => handleDelete(photo.id)}
									hitSlop={6}
								>
									<Ionicons name="close-circle" size={20} color="#fff" />
								</Pressable>
							</View>
						))}
					</ScrollView>
				)}

				<View style={styles.captureRow}>
					<Pressable
						style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
						onPress={handleCapture}
						disabled={capturing}
					>
						<View style={styles.captureButtonInner} />
					</Pressable>
				</View>

				<Pressable
					style={[styles.sendButton, photos.length === 0 && styles.sendButtonDisabled]}
					onPress={() => onSend(photos)}
					disabled={photos.length === 0}
				>
					<Text style={styles.sendButtonText}>
						{photos.length === 0
							? "Sacá al menos una foto"
							: `Enviar ${photos.length} foto${photos.length === 1 ? "" : "s"}`}
					</Text>
				</Pressable>
			</View>
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
	controlsPanel: {
		backgroundColor: "rgba(0,0,0,0.85)",
		paddingTop: 14,
		paddingHorizontal: 16,
		gap: 14,
	},
	thumbnailsStrip: { maxHeight: 72 },
	thumbnailsContent: { gap: 10, paddingHorizontal: 4 },
	thumbnailWrap: {
		width: 58,
		height: 72,
		borderRadius: 8,
		overflow: "hidden",
		position: "relative",
		backgroundColor: "#1e293b",
	},
	thumbnail: { width: "100%", height: "100%" },
	orderBadge: {
		position: "absolute",
		bottom: 4,
		left: 4,
		backgroundColor: colors.navy,
		borderRadius: 999,
		minWidth: 18,
		paddingHorizontal: 4,
		paddingVertical: 2,
		alignItems: "center",
	},
	orderBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 10,
	},
	deleteButton: {
		position: "absolute",
		top: 3,
		right: 3,
		backgroundColor: "rgba(0,0,0,0.55)",
		borderRadius: 10,
	},
	captureRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	captureButton: {
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 4,
		borderColor: colors.buttonText,
		alignItems: "center",
		justifyContent: "center",
	},
	captureButtonDisabled: { opacity: 0.6 },
	captureButtonInner: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: colors.buttonText,
	},
	sendButton: {
		backgroundColor: colors.navy,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: "center",
	},
	sendButtonDisabled: { backgroundColor: "rgba(255,255,255,0.12)" },
	sendButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
});
