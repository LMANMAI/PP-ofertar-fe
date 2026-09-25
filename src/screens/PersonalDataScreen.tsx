import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	Image,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { InputField, BottomNav, ConfirmSheet, ScreenHeader, type TabKey, PrimaryButton, InlineNotice } from "../components";
import type { Session } from "../auth/session";
import { getInitials, getAvatarUri, splitName } from "../auth/session";
import { friendlyAuthError, updateProfile, uploadProfilePicture } from "../services/authApi";

type Props = {
	session: Session;
	onBack: (message?: string) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onSessionUpdate?: (session: Session) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_IMAGE_SIZE_MB = 5;

// Same rule as the register and login screens.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_ERROR = "Revisá el correo: tiene que ser algo como nombre@correo.com";

type Errors = { first?: string; email?: string; password?: string };

export function PersonalDataScreen({ session, onBack, activeTab, onSelectTab, onScanPress, onSessionUpdate }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	// What the server had when the screen opened: the base that "has anything
	// changed?" compares against.
	const [initial] = useState({
		first: splitName(session.user.name).firstName,
		last: splitName(session.user.name).lastName,
	});
	const [first, setFirst] = useState(initial.first);
	const [last, setLast] = useState(initial.last);
	const [email, setEmail] = useState(session.user.email);
	const [currentPassword, setCurrentPassword] = useState("");
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Errors>({});
	const [saveError, setSaveError] = useState<string | null>(null);
	// The screen the user tried to go to while there were unsaved changes.
	const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

	const firstRef = useRef<TextInput>(null);
	const lastRef = useRef<TextInput>(null);
	const emailRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);

	const [profilePic, setProfilePic] = useState<string | null>(session.user.profilePicture);
	const [picUploading, setPicUploading] = useState(false);
	const [picError, setPicError] = useState<{ message: string; settings: boolean } | null>(null);
	const [picSuccess, setPicSuccess] = useState(false);
	const [showSheet, setShowSheet] = useState(false);
	const [sheetMode, setSheetMode] = useState<"options" | "confirmDelete">("options");
	const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

	// The photo notices used to stay on screen until the next visit.
	useEffect(() => {
		if (!picSuccess && !picError) return;
		const id = setTimeout(() => {
			setPicSuccess(false);
			setPicError(null);
		}, 6000);
		return () => clearTimeout(id);
	}, [picSuccess, picError]);

	const emailChanged = email.trim() !== "" && email.trim().toLowerCase() !== session.user.email.toLowerCase();
	const dirty =
		first.trim() !== initial.first ||
		last.trim() !== initial.last ||
		emailChanged;

	/** Runs `action`, unless there are unsaved changes: then it asks first. */
	const leave = (action: () => void) => {
		if (dirty && !saving) setPendingLeave(() => action);
		else action();
	};

	const openSheet = () => {
		setPicError(null);
		setPicSuccess(false);
		setSheetMode("options");
		setShowSheet(true);
		Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
	};

	const closeSheet = () => {
		Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(() => setShowSheet(false));
	};

	const requestCameraPermission = async (): Promise<boolean> => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			setPicError({ message: "Necesitamos acceso a la cámara para tomar una foto de perfil.", settings: true });
			return false;
		}
		return true;
	};

	const requestGalleryPermission = async (): Promise<boolean> => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			setPicError({ message: "Necesitamos acceso a la galería para elegir una foto de perfil.", settings: true });
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
			onSessionUpdate?.({ ...session, user: { ...session.user, profilePicture: result.user.profilePicture } });
			setPicSuccess(true);
		} catch (err) {
			setPicError({ message: friendlyAuthError(err), settings: false });
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
			onSessionUpdate?.({ ...session, user: { ...session.user, profilePicture: null } });
			setPicSuccess(true);
		} catch (err) {
			setPicError({ message: friendlyAuthError(err), settings: false });
		} finally {
			setPicUploading(false);
		}
	};

	const handleSave = async () => {
		const next: Errors = {};
		if (!first.trim()) next.first = "Ingresá tu nombre";
		if (!email.trim()) next.email = "Ingresá tu correo electrónico";
		else if (emailChanged && !EMAIL_PATTERN.test(email.trim())) next.email = EMAIL_ERROR;
		if (emailChanged && !currentPassword) next.password = "Ingresá tu contraseña actual para cambiar el correo";
		setErrors(next);
		setSaveError(null);
		if (next.first) return void firstRef.current?.focus();
		if (next.email) return void emailRef.current?.focus();
		if (next.password) return void passwordRef.current?.focus();

		setSaving(true);
		try {
			const name = `${first.trim()} ${last.trim()}`.trim();
			const res = await updateProfile(session.token, {
				name,
				...(emailChanged ? { email: email.trim(), currentPassword } : {}),
			});
			// Without this the saved name and email never reached Perfil or the
			// Inicio greeting, and the new token (issued for the new email) was
			// dropped.
			onSessionUpdate?.({ token: res.token || session.token, user: res.user });
			onBack("Datos actualizados correctamente");
		} catch (err) {
			const message = friendlyAuthError(err);
			if (/contraseña actual/i.test(message)) setErrors({ password: message });
			else if (/ya está registrado/i.test(message)) setErrors({ email: "Ese correo ya tiene una cuenta." });
			else setSaveError(message);
		} finally {
			setSaving(false);
		}
	};

	const avatarUri = getAvatarUri(profilePic);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Datos personales" onBack={() => leave(() => onBack())} />

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
			<ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
				<View style={styles.avatarRow}>
					<View style={styles.avatar} accessible accessibilityRole="image" accessibilityLabel="Tu foto de perfil">
						{picUploading ? (
							<ActivityIndicator size="small" color={colors.navy} />
						) : avatarUri ? (
							<Image source={{ uri: avatarUri }} style={styles.avatarImage} />
						) : (
							<Text style={styles.avatarText}>{getInitials(session.user.name).toUpperCase()}</Text>
						)}
					</View>
					<Pressable
						onPress={openSheet}
						style={(state) => [styles.avatarEdit, state.pressed && { opacity: 0.7 }, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel={profilePic ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
					>
						<Ionicons name="camera-outline" size={16} color={colors.infoSoftText} />
						<Text style={styles.avatarEditText}>{profilePic ? "Cambiar foto" : "Agregar foto"}</Text>
					</Pressable>
				</View>

				{picError && (
					<View style={styles.picFeedbackBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
						<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
						<Text style={styles.picFeedbackTextError}>{picError.message}</Text>
						{picError.settings && (
							<Pressable
								onPress={() => Linking.openSettings().catch(() => {})}
								style={styles.picSettings}
								accessibilityRole="button"
								accessibilityLabel="Abrir los ajustes del teléfono"
							>
								<Text style={styles.picSettingsText}>Abrir ajustes</Text>
							</Pressable>
						)}
					</View>
				)}
				{picSuccess && (
					<InlineNotice variant="success" live message="Foto actualizada" />
				)}

				<>
						<InputField
							label="Nombre"
							value={first}
							onChangeText={(t) => {
								setFirst(t);
								setErrors((p) => (p.first ? { ...p, first: undefined } : p));
							}}
							error={errors.first}
							inputRef={firstRef}
							editable={!saving}
							autoComplete="given-name"
							textContentType="givenName"
							autoCapitalize="words"
							returnKeyType="next"
							onSubmitEditing={() => lastRef.current?.focus()}
						/>
						<InputField
							label="Apellido"
							value={last}
							onChangeText={setLast}
							inputRef={lastRef}
							editable={!saving}
							autoComplete="family-name"
							textContentType="familyName"
							autoCapitalize="words"
							returnKeyType="next"
							onSubmitEditing={() => emailRef.current?.focus()}
						/>
						<View style={{ gap: space.sm }}>
							<InputField
								label="Correo electrónico"
								value={email}
								onChangeText={(t) => {
									setEmail(t);
									setErrors((p) => (p.email ? { ...p, email: undefined } : p));
								}}
								onBlur={() => {
									if (email.trim() && emailChanged && !EMAIL_PATTERN.test(email.trim())) {
										setErrors((p) => ({ ...p, email: EMAIL_ERROR }));
									}
								}}
								error={errors.email}
								inputRef={emailRef}
								editable={!saving}
								keyboardType="email-address"
								autoComplete="email"
								textContentType="emailAddress"
								autoCapitalize="none"
								autoCorrect={false}
								returnKeyType={emailChanged ? "next" : "done"}
								onSubmitEditing={() => (emailChanged ? passwordRef.current?.focus() : undefined)}
							/>
							<Text style={styles.hint}>
								Es tu usuario para ingresar. Si lo cambiás, te pedimos tu contraseña actual.
							</Text>
						</View>
						{emailChanged && (
							<InputField
								label="Contraseña actual"
								value={currentPassword}
								onChangeText={(t) => {
									setCurrentPassword(t);
									setErrors((p) => (p.password ? { ...p, password: undefined } : p));
								}}
								error={errors.password}
								inputRef={passwordRef}
								editable={!saving}
								secureTextEntry
								showPasswordToggle
								autoComplete="current-password"
								textContentType="password"
								autoCapitalize="none"
								autoCorrect={false}
								returnKeyType="done"
								onSubmitEditing={saving || !dirty ? undefined : handleSave}
							/>
						)}

						{saveError && (
							<InlineNotice message={saveError} />
						)}
				</>
			</ScrollView>

			<View style={styles.footer}>
				<PrimaryButton label="Guardar cambios" onPress={handleSave} loading={saving} disabled={!dirty} />
			</View>
			</KeyboardAvoidingView>

			<Modal visible={showSheet} transparent animationType="none" onRequestClose={closeSheet}>
				<Pressable style={styles.sheetOverlay} onPress={closeSheet}>
					<Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
						<View style={styles.sheetContent} onStartShouldSetResponder={() => true}>
							<View style={styles.sheetHandle} />
							{sheetMode === "options" ? (
								<>
									<Text style={styles.sheetTitle} accessibilityRole="header">Foto de perfil</Text>
									<Text style={styles.sheetNote}>
										Se guarda en tu cuenta y se usa para tu perfil dentro de la app.
									</Text>

									<View style={styles.sheetOptions}>
										<Pressable
											onPress={handleTakePhoto}
											style={(state) => [styles.sheetPrimary, state.pressed && { opacity: 0.85 }, isFocused(state) && styles.focusRing]}
											accessibilityRole="button"
											accessibilityLabel="Tomar foto"
										>
											<Ionicons name="camera-outline" size={20} color={colors.actionText} />
											<Text style={styles.sheetPrimaryText}>Tomar foto</Text>
										</Pressable>

										<Pressable
											onPress={handlePickGallery}
											style={(state) => [styles.sheetSecondary, state.pressed && { opacity: 0.7 }, isFocused(state) && styles.focusRing]}
											accessibilityRole="button"
											accessibilityLabel="Elegir de la galería"
										>
											<Ionicons name="images-outline" size={20} color={colors.defaultText} />
											<Text style={styles.sheetSecondaryText}>Elegir de la galería</Text>
										</Pressable>

										{profilePic && (
											<Pressable
												onPress={() => setSheetMode("confirmDelete")}
												style={(state) => [styles.sheetQuiet, state.pressed && { opacity: 0.7 }, isFocused(state) && styles.focusRing]}
												accessibilityRole="button"
												accessibilityLabel="Eliminar foto actual"
											>
												<Ionicons name="trash-outline" size={18} color={colors.dangerSoftText} />
												<Text style={styles.sheetQuietText}>Eliminar foto actual</Text>
											</Pressable>
										)}
									</View>

									<Pressable
										onPress={closeSheet}
										style={(state) => [styles.sheetCancel, state.pressed && { opacity: 0.6 }, isFocused(state) && styles.focusRing]}
										accessibilityRole="button"
										accessibilityLabel="Cancelar"
									>
										<Text style={styles.sheetCancelText}>Cancelar</Text>
									</Pressable>
								</>
							) : (
								<ConfirmSheet
									icon="trash-outline"
									iconTone="danger"
									title="¿Eliminar tu foto?"
									subtitle="Vas a volver a ver tus iniciales en lugar de la foto."
									confirmLabel="Eliminar foto"
									confirmTone="danger"
									onConfirm={handleDeletePhoto}
									cancelLabel="Cancelar"
									onCancel={closeSheet}
								/>
							)}
						</View>
					</Animated.View>
				</Pressable>
			</Modal>

			<Modal visible={pendingLeave !== null} transparent animationType="fade" onRequestClose={() => setPendingLeave(null)}>
				<View style={styles.leaveOverlay}>
					<ConfirmSheet
						icon="alert-circle-outline"
						iconTone="danger"
						title="¿Salir sin guardar?"
						subtitle="Tenés cambios sin guardar. Si salís ahora, se pierden."
						confirmLabel="Salir sin guardar"
						confirmTone="danger"
						onConfirm={() => {
							const action = pendingLeave;
							setPendingLeave(null);
							action?.();
						}}
						cancelLabel="Seguir editando"
						onCancel={() => setPendingLeave(null)}
					/>
				</View>
			</Modal>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav
					active={activeTab}
					onSelect={(t) => leave(() => onSelectTab(t))}
					onScanPress={() => leave(onScanPress)}
				/>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	avatarRow: { alignItems: "center", gap: space.smPlus, paddingVertical: space.md },
	avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
	avatarImage: { width: "100%", height: "100%" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 26 },
	avatarEdit: { flexDirection: "row", alignItems: "center", gap: space.xsPlus, minHeight: 44, backgroundColor: colors.infoSoft, paddingHorizontal: space.lg, borderRadius: 22 },
	avatarEditText: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	picFeedbackBox: { paddingVertical: space.smPlus, paddingHorizontal: space.md, borderRadius: 10, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
	picFeedbackTextError: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, lineHeight: 18 },
	picSettings: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm },
	picSettingsText: { color: colors.dangerSoftText, fontFamily: typography.family.bold, fontSize: typography.sizes.caption, textDecorationLine: "underline" },
	hint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro, lineHeight: typography.lineHeights.micro },
	// Fixed under the form, like the register steps, so it never scrolls out of
	// reach when the keyboard is up. Navy in light, cyan in dark (actionFill).
	footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.divider },
	focusRing: focusRing(colors),
	sheetOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
	leaveOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", paddingHorizontal: space.xl },
	sheet: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xxl, paddingTop: space.md, paddingBottom: 40 },
	sheetContent: { gap: space.lg },
	sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder, alignSelf: "center" },
	sheetTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 18, textAlign: "center" },
	sheetNote: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption, textAlign: "center" },
	sheetOptions: { gap: space.smPlus },
	// One filled action, one outlined, one quiet: the three used to be identical
	// navy bars with the destructive one indistinguishable in weight.
	sheetPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.mdPlus, backgroundColor: colors.actionFill, height: 52, borderRadius: radii.md },
	sheetPrimaryText: { color: colors.actionText, fontFamily: typography.family.medium, fontSize: typography.sizes.body },
	sheetSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.mdPlus, height: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.inputBorder },
	sheetSecondaryText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.body },
	sheetQuiet: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm, minHeight: 44 },
	sheetQuietText: { color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.body },
	sheetCancel: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: space.xl, borderRadius: radii.sm },
	sheetCancelText: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.body },
	});
}
