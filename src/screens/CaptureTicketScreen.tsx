import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Linking,
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
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { darkColors, radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { ScanModeSwitch, type ScanMode } from "../components/ui/ScanModeSwitch";

/**
 * Phone cameras shoot 3000-4000px wide, which is far more than the OCR model
 * needs to read receipt text — and every extra pixel costs upload time on
 * mobile data plus inference time on the OCR service. 1600px keeps the small
 * print legible while cutting the payload by roughly an order of magnitude.
 * Raise it if receipts start coming back with misread digits.
 */
const MAX_UPLOAD_WIDTH = 1600;
const UPLOAD_QUALITY = 0.85;

export type CapturedPhoto = {
	id: string;
	uri: string;
	/** Optional: the upload sends the file by uri, so photos don't carry one. */
	base64?: string;
};

type Props = {
	onBack: () => void;
	onSend: (photos: CapturedPhoto[]) => void;
	/** The receipt already exists as a file: a different way in, not a different job. */
	onChoosePdf: () => void;
	/** Looking a product up is the camera's other mode. */
	onChooseBarcode: () => void;
};

/** Shrinks a picture the way every upload goes out. Only ever shrinks: resizing
 * a photo that's already narrower would upscale it, costing bytes and blurring
 * the text. */
async function toUploadPhoto(uri: string, width?: number): Promise<CapturedPhoto> {
	const actions = width && width > MAX_UPLOAD_WIDTH ? [{ resize: { width: MAX_UPLOAD_WIDTH } }] : [];
	const resized = await manipulateAsync(uri, actions, {
		compress: UPLOAD_QUALITY,
		format: SaveFormat.JPEG,
	});
	return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, uri: resized.uri };
}

export function CaptureTicketScreen({ onBack, onSend, onChoosePdf, onChooseBarcode }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const cameraRef = useRef<CameraView>(null);
	const [permission, requestPermission] = useCameraPermissions();
	const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
	const [capturing, setCapturing] = useState(false);
	const [picking, setPicking] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => {
		if (permission && !permission.granted && permission.canAskAgain) {
			requestPermission();
		}
	}, [permission, requestPermission]);

	const busy = capturing || picking;
	const cameraOn = permission?.granted === true;

	const handleCapture = async () => {
		if (!cameraRef.current || busy) return;
		setCapturing(true);
		setNotice(null);
		try {
			// No base64 here: the upload posts the file by uri, so encoding a
			// multi-megabyte image to base64 was pure overhead on every shot.
			const picture = await cameraRef.current.takePictureAsync({ quality: 1 });
			if (picture?.uri) {
				const photo = await toUploadPhoto(picture.uri, picture.width);
				setPhotos((prev) => [...prev, photo]);
			}
		} catch {
			setNotice("No pudimos sacar la foto. Probá de nuevo.");
		} finally {
			setCapturing(false);
		}
	};

	// Same pipeline as a shot from the camera, so a ticket photographed earlier
	// goes out exactly like one taken now. Kept in the order they were picked:
	// the order of the photos is the order of the receipt.
	const handleGallery = async () => {
		if (busy) return;
		setPicking(true);
		setNotice(null);
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: true,
				orderedSelection: true,
				quality: 1,
			});
			if (result.canceled) return;
			const added: CapturedPhoto[] = [];
			for (const asset of result.assets) added.push(await toUploadPhoto(asset.uri, asset.width));
			setPhotos((prev) => [...prev, ...added]);
		} catch {
			setNotice("No pudimos abrir tu galería. Probá de nuevo.");
		} finally {
			setPicking(false);
		}
	};

	const handleDelete = (id: string) => {
		setPhotos((prev) => prev.filter((p) => p.id !== id));
	};

	const sendLabel =
		photos.length === 0
			? "Agregá al menos una foto"
			: `Enviar ${photos.length} foto${photos.length === 1 ? "" : "s"}`;

	return (
		<View style={styles.safeArea}>
			<StatusBar style="light" />

			{cameraOn && <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />}

			<View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
				<Pressable
					onPress={onBack}
					style={(state) => [styles.closeButton, isFocused(state) && styles.focusRing]}
					accessibilityRole="button"
					accessibilityLabel="Cerrar"
				>
					<Ionicons name="close" size={24} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.topTitle} accessibilityRole="header">
					Ticket de compra
				</Text>
				<View style={styles.closeButton} />
			</View>

			<View style={styles.frameWrap}>
				{!permission ? (
					<ActivityIndicator color={colors.cyan} />
				) : cameraOn ? (
					<>
						<View style={styles.frame}>
							<View style={[styles.corner, styles.cornerTL]} />
							<View style={[styles.corner, styles.cornerTR]} />
							<View style={[styles.corner, styles.cornerBL]} />
							<View style={[styles.corner, styles.cornerBR]} />
						</View>
						{/* What a readable photo needs, said where the photo is taken. The
						    order matters: a long ticket goes in as several photos, top to
						    bottom, and the OCR stitches them in that order. */}
						<View style={styles.hint}>
							<Text style={styles.hintTitle}>Encuadrá el ticket completo</Text>
							<Text style={styles.hintBody}>
								Plano y con buena luz. Si es largo, sacalo en partes, de arriba hacia abajo.
							</Text>
						</View>
					</>
				) : (
					<View style={styles.noCamera} accessibilityRole="alert">
						<Ionicons name="camera-outline" size={40} color={colors.cyan} />
						<Text style={styles.noCameraTitle}>Necesitamos tu cámara</Text>
						<Text style={styles.noCameraBody}>
							Para sacar fotos del ticket. Si preferís, elegí las fotos de tu galería o adjuntá el PDF.
						</Text>
						<Pressable
							style={(state) => [styles.enableButton, isFocused(state) && styles.focusRing]}
							onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
							accessibilityRole="button"
						>
							<Text style={styles.enableButtonText}>
								{permission.canAskAgain ? "Habilitar cámara" : "Abrir ajustes"}
							</Text>
						</Pressable>
					</View>
				)}

				<Pressable
					style={(state) => [styles.pdfLink, isFocused(state) && styles.focusRing]}
					onPress={onChoosePdf}
					accessibilityRole="button"
					accessibilityLabel="Adjuntar el ticket en PDF"
				>
					<Ionicons name="document-text-outline" size={18} color={colors.buttonText} />
					<Text style={styles.pdfLinkText}>¿Lo tenés en PDF? Adjuntalo</Text>
				</Pressable>
			</View>

			<View style={[styles.controlsPanel, { paddingBottom: insets.bottom + space.lg }]}>
				{/* Once a ticket is under way the mode is settled: switching would
				    throw the photos away. Deleting them brings the switch back. */}
				{cameraOn && photos.length === 0 && (
					<ScanModeSwitch mode="ticket" onSelect={(m: ScanMode) => m === "barcode" && onChooseBarcode()} />
				)}

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
									accessibilityLabel={`Foto ${index + 1}`}
								/>
								<View style={styles.orderBadge}>
									<Text style={styles.orderBadgeText}>{index + 1}</Text>
								</View>
								<Pressable
									style={styles.deleteButton}
									onPress={() => handleDelete(photo.id)}
									hitSlop={10}
									accessibilityRole="button"
									accessibilityLabel={`Eliminar foto ${index + 1}`}
								>
									<Ionicons name="close-circle" size={22} color={colors.buttonText} />
								</Pressable>
							</View>
						))}
					</ScrollView>
				)}

				{notice && (
					<Text style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">
						{notice}
					</Text>
				)}

				<View style={styles.captureRow}>
					<View style={styles.sideSlot}>
						<Pressable
							style={(state) => [styles.galleryButton, picking && styles.disabled, isFocused(state) && styles.focusRing]}
							onPress={handleGallery}
							disabled={busy}
							accessibilityRole="button"
							accessibilityLabel="Elegir fotos de la galería"
						>
							{picking ? (
								<ActivityIndicator color={colors.buttonText} />
							) : (
								<Ionicons name="images-outline" size={24} color={colors.buttonText} />
							)}
						</Pressable>
						<Text style={styles.sideLabel}>Galería</Text>
					</View>

					<View style={styles.sideSlot}>
						{cameraOn && (
							<Pressable
								style={(state) => [styles.captureButton, capturing && styles.disabled, isFocused(state) && styles.focusRing]}
								onPress={handleCapture}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Sacar foto"
							>
								<View style={styles.captureButtonInner} />
							</Pressable>
						)}
					</View>

					{/* Balances the gallery so the shutter stays centered. */}
					<View style={styles.sideSlot} />
				</View>

				<Pressable
					style={(state) => [styles.sendButton, photos.length === 0 && styles.sendButtonDisabled, isFocused(state) && styles.focusRing]}
					onPress={() => onSend(photos)}
					disabled={photos.length === 0 || busy}
					accessibilityRole="button"
					accessibilityState={{ disabled: photos.length === 0 || busy }}
				>
					<Text style={[styles.sendButtonText, photos.length === 0 && styles.sendButtonTextDisabled]}>{sendLabel}</Text>
				</Pressable>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights } = typography;
	return StyleSheet.create({
		// Black behind a live camera, navy when there is none.
		safeArea: { flex: 1, backgroundColor: colors.navy },
		topBar: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: space.md,
			paddingBottom: space.sm,
			backgroundColor: "rgba(0,0,0,0.55)",
		},
		closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
		topTitle: {
			flex: 1,
			textAlign: "center",
			color: colors.buttonText,
			fontFamily: typography.family.medium,
			fontSize: sizes.subtitle,
		},
		focusRing: focusRing(colors),
		frameWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, paddingHorizontal: space.xl },
		frame: {
			width: "78%",
			aspectRatio: 0.62,
			maxHeight: "62%",
			borderRadius: radii.md,
			position: "relative",
		},
		corner: {
			position: "absolute",
			width: 28,
			height: 28,
			borderColor: colors.cyan,
		},
		cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radii.sm },
		cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radii.sm },
		cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radii.sm },
		cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radii.sm },
		// A scrim behind the words: they sit over a live camera, so their contrast
		// is whatever the shop's lighting happens to be.
		hint: {
			alignItems: "center",
			gap: space.xs,
			paddingHorizontal: space.lg,
			paddingVertical: space.smPlus,
			borderRadius: radii.md,
			backgroundColor: "rgba(0,0,0,0.6)",
		},
		hintTitle: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: sizes.caption, textAlign: "center" },
		hintBody: {
			color: "rgba(255,255,255,0.85)",
			fontFamily: typography.family.regular,
			fontSize: sizes.micro,
			lineHeight: lineHeights.micro,
			textAlign: "center",
		},
		pdfLink: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.sm,
			minHeight: 44,
			paddingHorizontal: space.lg,
			borderRadius: radii.full,
			backgroundColor: "rgba(0,0,0,0.6)",
		},
		pdfLinkText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: sizes.caption, textDecorationLine: "underline" },
		noCamera: { alignItems: "center", gap: space.md },
		noCameraTitle: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: sizes.h2, textAlign: "center" },
		noCameraBody: {
			color: colors.navyMutedText,
			fontFamily: typography.family.regular,
			fontSize: sizes.label,
			lineHeight: lineHeights.label,
			textAlign: "center",
		},
		enableButton: {
			minHeight: 48,
			justifyContent: "center",
			paddingHorizontal: space.xl,
			borderRadius: radii.md,
			backgroundColor: colors.cyan,
		},
		enableButtonText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: sizes.label },
		controlsPanel: {
			backgroundColor: "rgba(0,0,0,0.85)",
			paddingTop: space.mdPlus,
			paddingHorizontal: space.lg,
			gap: space.mdPlus,
		},
		thumbnailsStrip: { maxHeight: 76 },
		thumbnailsContent: { gap: space.smPlus, paddingHorizontal: space.xs, paddingTop: space.xs },
		thumbnailWrap: {
			width: 58,
			height: 72,
			borderRadius: radii.sm,
			position: "relative",
			backgroundColor: colors.softNavy,
		},
		thumbnail: { width: "100%", height: "100%", borderRadius: radii.sm },
		orderBadge: {
			position: "absolute",
			bottom: space.xs,
			left: space.xs,
			backgroundColor: colors.navy,
			borderRadius: radii.full,
			minWidth: 20,
			paddingHorizontal: space.xs,
			paddingVertical: 2,
			alignItems: "center",
		},
		orderBadgeText: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: sizes.tiny },
		deleteButton: {
			position: "absolute",
			top: -space.xs,
			right: -space.xs,
			backgroundColor: "rgba(0,0,0,0.7)",
			borderRadius: radii.full,
		},
		notice: {
			// The panel is near-black in both themes, so the dark warning tint.
			color: darkColors.warningSoftText,
			fontFamily: typography.family.medium,
			fontSize: sizes.micro,
			textAlign: "center",
		},
		captureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
		sideSlot: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xs, minHeight: 72 },
		galleryButton: {
			width: 48,
			height: 48,
			borderRadius: radii.full,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(255,255,255,0.14)",
		},
		sideLabel: { color: "rgba(255,255,255,0.85)", fontFamily: typography.family.medium, fontSize: sizes.micro },
		captureButton: {
			width: 72,
			height: 72,
			borderRadius: 36,
			borderWidth: 4,
			borderColor: colors.buttonText,
			alignItems: "center",
			justifyContent: "center",
		},
		disabled: { opacity: 0.6 },
		captureButtonInner: {
			width: 58,
			height: 58,
			borderRadius: 29,
			backgroundColor: colors.buttonText,
		},
		// Cyan, not navy: navy on this near-black panel is barely a button.
		sendButton: {
			minHeight: 52,
			justifyContent: "center",
			backgroundColor: colors.cyan,
			borderRadius: radii.md,
			alignItems: "center",
		},
		sendButtonDisabled: { backgroundColor: "rgba(255,255,255,0.12)" },
		sendButtonText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: sizes.body },
		sendButtonTextDisabled: { color: "rgba(255,255,255,0.7)" },
	});
}
