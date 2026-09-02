import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { colors, typography } from "../theme/designSystem";
import { InputField, BottomNav, type TabKey } from "../components";
import type { Session } from "../auth/session";
import { getInitials, getAvatarUri, splitName } from "../auth/session";
import { getProfile, updateProfile, uploadProfilePicture } from "../services/authApi";

type Props = { session: Session; onBack: (message?: string) => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_IMAGE_SIZE_MB = 5;

export function PersonalDataScreen({ session, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [fetching, setFetching] = useState(false);
	const [first, setFirst] = useState(splitName(session.user.name).firstName);
	const [last, setLast] = useState(splitName(session.user.name).lastName);
	const [email] = useState(session.user.email);
	const [phone, setPhone] = useState(session.user.phone ?? "");
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [profilePic, setProfilePic] = useState<string | null>(session.user.profilePicture);
	const [picUploading, setPicUploading] = useState(false);
	const [picError, setPicError] = useState<string | null>(null);
	const [picSuccess, setPicSuccess] = useState(false);
	const [showSheet, setShowSheet] = useState(false);
	const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

	useEffect(() => {
		if (session.user.phone === null) {
			setFetching(true);
			getProfile(session.token)
				.then((profile) => {
					const { firstName, lastName } = splitName(profile.name);
					setFirst(firstName);
					setLast(lastName);
					setPhone(profile.phone ?? "");
					if (profile.profilePicture) {
						setProfilePic(profile.profilePicture);
					}
				})
				.catch(() => {})
				.finally(() => setFetching(false));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const openSheet = () => {
		setPicError(null);
		setPicSuccess(false);
		setShowSheet(true);
		Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
	};

	const closeSheet = () => {
		Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => setShowSheet(false));
	};

	const requestCameraPermission = async (): Promise<boolean> => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			setPicError("Necesitamos acceso a la cámara para tomar una foto de perfil");
			return false;
		}
		return true;
	};

	const requestGalleryPermission = async (): Promise<boolean> => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			setPicError("Necesitamos acceso a la galería para elegir una foto de perfil");
			return false;
		}
		return true;
	};

	const processAndUpload = async (asset: ImagePicker.ImagePickerAsset) => {
		closeSheet();
		setPicUploading(true);
		setPicError(null);
		setPicSuccess(false);
		try {
			if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
				throw new Error(`La imagen supera los ${MAX_IMAGE_SIZE_MB} MB. Elegí una más pequeña.`);
			}

			const manipulated = await ImageManipulator.manipulateAsync(
				asset.uri,
				[{ resize: { width: 512 } }],
				{ compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
			);

			const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
				encoding: "base64" as const,
			});

			const result = await uploadProfilePicture(session.token, base64);
			setProfilePic(result.user.profilePicture);
			session.user.profilePicture = result.user.profilePicture;
			setPicSuccess(true);
		} catch (err) {
			setPicError(err instanceof Error ? err.message : "Error al subir la foto");
		} finally {
			setPicUploading(false);
		}
	};

	const handleTakePhoto = async () => {
		const granted = await requestCameraPermission();
		if (!granted) return;

		const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
		if (!result.canceled && result.assets.length > 0) {
			await processAndUpload(result.assets[0]);
		}
	};

	const handlePickGallery = async () => {
		const granted = await requestGalleryPermission();
		if (!granted) return;

		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
		if (!result.canceled && result.assets.length > 0) {
			await processAndUpload(result.assets[0]);
		}
	};

	const handleDeletePhoto = async () => {
		closeSheet();
		setPicUploading(true);
		setPicError(null);
		setPicSuccess(false);
		try {
			await uploadProfilePicture(session.token, "");
			setProfilePic(null);
			session.user.profilePicture = null;
			setPicSuccess(true);
		} catch (err) {
			setPicError(err instanceof Error ? err.message : "Error al eliminar la foto");
		} finally {
			setPicUploading(false);
		}
	};

	const handleSave = async () => {
		setSaveError(null);
		setSaving(true);
		try {
			const name = `${first.trim()} ${last.trim()}`.trim();
			await updateProfile(session.token, { name, phone: phone.trim() || undefined });
			onBack("Datos actualizados correctamente");
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : "Error al guardar");
		} finally {
			setSaving(false);
		}
	};

	const avatarUri = getAvatarUri(profilePic);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={() => onBack()} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Datos personales</Text>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
			<ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
				<View style={styles.avatarRow}>
					<View style={styles.avatar}>
						{picUploading ? (
							<ActivityIndicator size="small" color={colors.navy} />
						) : avatarUri ? (
							<Image source={{ uri: avatarUri }} style={styles.avatarImage} />
						) : (
							<Text style={styles.avatarText}>{getInitials(session.user.name)}</Text>
						)}
					</View>
					<Pressable
						onPress={openSheet}
						style={({ pressed }) => [styles.avatarEdit, pressed && { opacity: 0.7 }]}
						hitSlop={8}
					>
						<Ionicons name="camera-outline" size={14} color={colors.navy} />
						<Text style={styles.avatarEditText}>{profilePic ? "Cambiar foto" : "Agregar foto"}</Text>
					</Pressable>
				</View>

				{picError && (
					<View style={styles.picFeedbackBox}>
						<Ionicons name="alert-circle" size={16} color="#A8341E" />
						<Text style={styles.picFeedbackTextError}>{picError}</Text>
					</View>
				)}
				{picSuccess && (
					<View style={styles.picFeedbackBoxSuccess}>
						<Ionicons name="checkmark-circle" size={16} color="#16A34A" />
						<Text style={styles.picFeedbackTextSuccess}>Foto actualizada</Text>
					</View>
				)}

				{fetching ? (
					<ActivityIndicator size="small" color={colors.cyan} style={{ marginTop: 16 }} />
				) : (
					<>
						<InputField label="Nombre" value={first} onChangeText={setFirst} />
						<InputField label="Apellido" value={last} onChangeText={setLast} />
						<InputField label="Correo electrónico" value={email} onChangeText={() => {}} />
						<InputField label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

						{saveError && (
							<View style={styles.errorBox}>
								<Ionicons name="alert-circle" size={16} color="#A8341E" />
								<Text style={styles.errorText}>{saveError}</Text>
							</View>
						)}

						<Pressable
							onPress={saving ? undefined : handleSave}
							style={[styles.saveBtn, saving && { opacity: 0.55 }]}
						>
							{saving ? (
								<ActivityIndicator size="small" color={colors.buttonText} />
							) : (
								<Text style={styles.saveText}>Guardar cambios</Text>
							)}
						</Pressable>
					</>
				)}
			</ScrollView>
			</KeyboardAvoidingView>

			<Modal visible={showSheet} transparent animationType="none" onRequestClose={closeSheet}>
				<Pressable style={styles.sheetOverlay} onPress={closeSheet}>
					<Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
						<View style={styles.sheetContent} onStartShouldSetResponder={() => true}>
							<View style={styles.sheetHandle} />
							<Text style={styles.sheetTitle}>Foto de perfil</Text>

							<View style={styles.sheetOptions}>
								<Pressable
									onPress={handleTakePhoto}
									style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.85 }]}
								>
									<Ionicons name="camera-outline" size={20} color={colors.buttonText} />
									<Text style={styles.sheetOptionText}>Tomar foto</Text>
								</Pressable>

								<Pressable
									onPress={handlePickGallery}
									style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.85 }]}
								>
									<Ionicons name="images-outline" size={20} color={colors.buttonText} />
									<Text style={styles.sheetOptionText}>Elegir de galería</Text>
								</Pressable>

								{profilePic && (
									<Pressable
										onPress={handleDeletePhoto}
										style={({ pressed }) => [
											styles.sheetOption,
											styles.sheetOptionDanger,
											pressed && { opacity: 0.7 },
										]}
									>
										<Ionicons name="trash-outline" size={20} color={colors.danger} />
										<Text style={styles.sheetOptionTextDanger}>Eliminar foto actual</Text>
									</Pressable>
								)}
							</View>

							<Pressable
								onPress={closeSheet}
								style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.6 }]}
							>
								<Text style={styles.sheetCancelText}>Cancelar</Text>
							</Pressable>
						</View>
					</Animated.View>
				</Pressable>
			</Modal>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	avatarRow: { alignItems: "center", gap: 10, paddingVertical: 12 },
	avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
	avatarImage: { width: "100%", height: "100%" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 26 },
	avatarEdit: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F6FC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
	avatarEditText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 12 },
	picFeedbackBox: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FDECEA", borderWidth: 1, borderColor: "#F5C1B8", flexDirection: "row", alignItems: "center", gap: 8 },
	picFeedbackTextError: { flex: 1, color: "#A8341E", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	picFeedbackBoxSuccess: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", flexDirection: "row", alignItems: "center", gap: 8 },
	picFeedbackTextSuccess: { flex: 1, color: "#16A34A", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	saveBtn: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 4 },
	saveText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	errorBox: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FDECEA", borderWidth: 1, borderColor: "#F5C1B8", flexDirection: "row", alignItems: "center", gap: 8 },
	errorText: { flex: 1, color: "#A8341E", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
	sheetContent: { gap: 20 },
	sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center" },
	sheetTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18, textAlign: "center", marginBottom: 4 },
	sheetOptions: { gap: 10 },
	sheetOption: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.navy, height: 52, borderRadius: 12, paddingHorizontal: 18 },
	sheetOptionDanger: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger },
	sheetOptionText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	sheetOptionTextDanger: { color: colors.danger, fontFamily: typography.family.medium, fontSize: 15 },
	sheetCancel: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20 },
	sheetCancelText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 15 },
});
