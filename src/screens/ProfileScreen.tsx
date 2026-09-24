import { useState, useEffect, useMemo } from "react";
import {
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { BottomNav, type TabKey } from "../components";
import { space, typography, radii,
	useIsDarkMode,
	useThemeColors,
	useThemePreference,
	type ColorTokens,
	type ThemePreference, } from "../theme/designSystem";
import type { Session } from "../auth/session";
import { getInitials, getAvatarUri, splitName } from "../auth/session";
import { isBiometricAvailable, useBiometricInfo } from "../auth/biometricAuth";
import { updateProfile } from "../services";

type IonName = ComponentProps<typeof Ionicons>["name"];

type Props = {
	session: Session;
	referralPoints: number;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onLogout: () => void;
	onOpenPersonalData: () => void;
	onOpenPayment: () => void;
	onOpenStores: () => void;
	onOpenPoints: () => void;
	onOpenHelp: () => void;
	onChangePassword?: () => void;
	biometricEnabled?: boolean;
	onToggleBiometric?: (enabled: boolean) => void;
	/** The switch below writes to the profile; without lifting the result
	 * back up, `session.user` keeps the old value and the screen re-reads it
	 * on the next visit, showing the preference the user just turned off. */
	onSessionUpdate?: (session: Session) => void;
};

type LinkItem = {
	id: string;
	icon: IonName;
	label: string;
	action: keyof Pick<Props, "onOpenPayment" | "onOpenStores" | "onOpenPoints" | "onChangePassword">;
};

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IonName }[] = [
	{ value: "system", label: "Sistema", icon: "phone-portrait-outline" },
	{ value: "light", label: "Claro", icon: "sunny-outline" },
	{ value: "dark", label: "Oscuro", icon: "moon-outline" },
];

const ACCOUNT_ITEMS: LinkItem[] = [
	{ id: "points", icon: "people-outline", label: "Puntos y referidos", action: "onOpenPoints" },
	{ id: "payment", icon: "card-outline", label: "Métodos de pago", action: "onOpenPayment" },
	{ id: "stores", icon: "location-outline", label: "Mis tiendas favoritas", action: "onOpenStores" },
	{ id: "password", icon: "lock-closed-outline", label: "Cambiar contraseña", action: "onChangePassword" },
];

export function ProfileScreen({
	session,
	referralPoints,
	activeTab,
	onSelectTab,
	onScanPress,
	onLogout,
	onOpenPersonalData,
	onOpenPayment,
	onOpenStores,
	onOpenPoints,
	onOpenHelp,
	onChangePassword,
	biometricEnabled = false,
	onToggleBiometric,
	onSessionUpdate,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
	const isDark = useIsDarkMode();
	const [alertsEnabled, setAlertsEnabled] = useState(true);
	const [biometricAvailable, setBiometricAvailable] = useState(false);
	const biometric = useBiometricInfo();
	const [alternativeBrands, setAlternativeBrands] = useState(
		session.user.alternativeBrandsEnabled ?? true,
	);
	const [savingPreference, setSavingPreference] = useState(false);
	const [preferenceError, setPreferenceError] = useState<string | null>(null);
	const { firstName, lastName } = splitName(session.user.name);

	// The default cyan-track/white-thumb pairing is ~1.7:1 when on and the
	// off track vanishes into the card, so the state was readable only by
	// thumb position. Thumb flips to navy when on, and the off track gets a
	// real gray, so on/off differ in color as well as position.
	const offTrack = isDark ? colors.border : colors.mutedText2;
	const switchColors = (value: boolean) => ({
		trackColor: { true: colors.cyan, false: offTrack },
		thumbColor: value ? colors.navy : isDark ? colors.mutedText2 : colors.buttonText,
		ios_backgroundColor: offTrack,
	});

	useEffect(() => {
		isBiometricAvailable().then(setBiometricAvailable).catch(() => {});
	}, []);

	const handleToggleAlternativeBrands = async (value: boolean) => {
		// Optimistic: the switch should feel instant, and a failed save is
		// recoverable by toggling again rather than worth blocking the UI.
		setAlternativeBrands(value);
		setSavingPreference(true);
		setPreferenceError(null);
		try {
			const updated = await updateProfile(session.token, { alternativeBrandsEnabled: value });
			// The PUT may answer without re-issuing a token; keep the current one.
			onSessionUpdate?.({ token: updated.token || session.token, user: updated.user });
		} catch {
			setAlternativeBrands(!value);
			setPreferenceError("No pudimos guardar el cambio. Probá de nuevo.");
		} finally {
			setSavingPreference(false);
		}
	};

	const handlers: Record<string, () => void> = {
		onOpenPayment,
		onOpenStores,
		onOpenPoints,
		onChangePassword: onChangePassword ?? (() => {}),
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" />

			<View style={[styles.header, { paddingLeft: space.xl + insets.left, paddingRight: space.xl + insets.right }]}>
				<Image
					source={require("../../assets/logo_ofertar.png")}
					style={styles.headerLogo}
					accessible={false}
				/>
				<Text style={styles.headerTitle} accessibilityRole="header">Perfil</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingLeft: space.lg + insets.left, paddingRight: space.lg + insets.right },
				]}
				showsVerticalScrollIndicator={false}
			>
				<Pressable
					style={styles.profileCard}
					onPress={onOpenPersonalData}
					accessibilityRole="button"
					accessibilityLabel={`Datos personales. ${firstName} ${lastName}, ${session.user.email}`}
				>
					<View style={styles.avatar}>
						{session.user.profilePicture ? (
							<Image source={{ uri: getAvatarUri(session.user.profilePicture) }} style={styles.avatarImage} />
						) : (
							<Text style={styles.avatarText}>{getInitials(session.user.name)}</Text>
						)}
					</View>
					<View style={{ flex: 1, gap: space.xs }}>
						<Text style={styles.profileName} numberOfLines={1}>
							{firstName} {lastName}
						</Text>
						<Text style={styles.profileEmail} numberOfLines={1}>{session.user.email}</Text>
						<View style={styles.levelBadge}>
							<Ionicons name="people" size={10} color={colors.infoSoftText} />
							<Text style={styles.levelBadgeText}>
								{referralPoints.toLocaleString("es-AR")} pts por referidos
							</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
				</Pressable>

				<Text style={styles.sectionLabel} accessibilityRole="header">CUENTA</Text>
				<View style={styles.listCard}>
					{ACCOUNT_ITEMS.map((it, idx) => {
						return (
							<View key={it.id}>
								<Pressable
									style={styles.listItem}
									onPress={handlers[it.action]}
									accessibilityRole="button"
									accessibilityLabel={it.label}
								>
									<View style={styles.listIconWrap}>
										<Ionicons name={it.icon} size={16} color={colors.infoSoftText} />
									</View>
									<View style={{ flex: 1, gap: space.xs }}>
										<Text style={styles.listLabel}>{it.label}</Text>
									</View>
									<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
								</Pressable>
								{idx < ACCOUNT_ITEMS.length - 1 && <View style={styles.listDivider} />}
							</View>
						);
					})}
				</View>

				<Text style={styles.sectionLabel} accessibilityRole="header">PREFERENCIAS</Text>
				<View style={styles.listCard}>
					<View style={[styles.listItem, styles.themeRow]}>
						<View style={styles.listIconWrap}>
							<Ionicons name="contrast-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: space.xs }}>
							<Text style={styles.listLabel}>Tema</Text>
							<Text style={styles.listHint}>Claro, oscuro, o el que uses en el sistema</Text>
						</View>
					</View>
					<View style={styles.themeOptionsRow} accessibilityRole="radiogroup" accessibilityLabel="Tema">
						{THEME_OPTIONS.map((opt) => {
							const active = themePreference === opt.value;
							return (
								<Pressable
									key={opt.value}
									onPress={() => setThemePreference(opt.value)}
									style={[styles.themeOption, active && styles.themeOptionActive]}
									accessibilityRole="radio"
									accessibilityState={{ checked: active }}
									accessibilityLabel={`Tema ${opt.label}`}
								>
									<Ionicons
										name={opt.icon}
										size={15}
										color={active ? colors.buttonText : colors.mutedText2}
									/>
									<Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]} numberOfLines={1}>
										{opt.label}
									</Text>
								</Pressable>
							);
						})}
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="notifications-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: space.xs }}>
							<Text style={styles.listLabel}>Alertas de ofertas</Text>
							<Text style={styles.listHint}>Notificaciones push</Text>
						</View>
						<Switch
							value={alertsEnabled}
							onValueChange={setAlertsEnabled}
							{...switchColors(alertsEnabled)}
							accessibilityLabel="Alertas de ofertas"
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="swap-horizontal-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: space.xs }}>
							<Text style={styles.listLabel}>Marcas alternativas</Text>
							<Text style={styles.listHint}>
								Mostrarte ofertas del mismo producto en otras marcas
							</Text>
							{preferenceError && (
								<View style={styles.errorRow} accessibilityLiveRegion="polite">
									<Ionicons name="alert-circle" size={13} color={colors.dangerSoftText} />
									<Text style={styles.errorText}>{preferenceError}</Text>
								</View>
							)}
						</View>
						<Switch
							value={alternativeBrands}
							onValueChange={handleToggleAlternativeBrands}
							{...switchColors(alternativeBrands)}
							disabled={savingPreference}
							accessibilityLabel="Marcas alternativas"
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="shield-checkmark-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: space.xs }}>
							<Text style={styles.listLabel}>Compartir datos anónimos</Text>
							<Text style={styles.listHint}>Próximamente: todavía no compartimos ningún dato</Text>
						</View>
						<Switch
							value={false}
							disabled
							{...switchColors(false)}
							accessibilityLabel="Compartir datos anónimos, próximamente"
						/>
					</View>
					{biometricAvailable && (
						<>
							<View style={styles.listDivider} />
							<View style={styles.listItem}>
								<View style={styles.listIconWrap}>
									<Ionicons name={biometric.icon} size={16} color={colors.infoSoftText} />
								</View>
								<View style={{ flex: 1, gap: space.xs }}>
									<Text style={styles.listLabel}>Inicio de sesión biométrico</Text>
									<Text style={styles.listHint}>
										Usá {biometric.hint} para ingresar
									</Text>
								</View>
								<Switch
									value={biometricEnabled}
									onValueChange={(v) => onToggleBiometric?.(v)}
									{...switchColors(biometricEnabled)}
									accessibilityLabel="Inicio de sesión biométrico"
								/>
							</View>
						</>
					)}
					<View style={styles.listDivider} />
					<Pressable
						style={styles.listItem}
						onPress={onOpenHelp}
						accessibilityRole="button"
						accessibilityLabel="Centro de ayuda"
					>
						<View style={styles.listIconWrap}>
							<Ionicons name="help-circle-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.listLabel}>Centro de ayuda</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
					</Pressable>
				</View>

				<Pressable
					style={styles.logoutButton}
					onPress={onLogout}
					accessibilityRole="button"
					accessibilityLabel="Cerrar sesión"
				>
					<Ionicons name="log-out-outline" size={18} color={colors.dangerSoftText} />
					<Text style={styles.logoutText}>Cerrar sesión</Text>
				</Pressable>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav
					active={activeTab}
					onSelect={onSelectTab}
					onScanPress={onScanPress}
				/>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: space.xl, height: 56, flexDirection: "row", alignItems: "center", gap: space.smPlus },
	headerLogo: { width: 24, height: 24, borderRadius: 6 },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: typography.sizes.bodyL },
	scroll: { flex: 1 },
	scrollContent: { padding: space.lg, gap: space.md, width: "100%", maxWidth: 640, alignSelf: "center" },
	profileCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.mdPlus, borderWidth: 1, borderColor: colors.divider },
	avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
	avatarImage: { width: "100%", height: "100%" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: typography.sizes.bodyL },
	profileName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.subtitle },
	profileEmail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro },
	levelBadge: { alignSelf: "flex-start", backgroundColor: colors.infoSoft, paddingHorizontal: space.smPlus, paddingVertical: space.xsPlus, borderRadius: radii.sm, flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs },
	levelBadgeText: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.overline, letterSpacing: 0.3 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: typography.sizes.overline, letterSpacing: 1.2, marginTop: space.sm },
	listCard: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
	listItem: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
	listIconWrap: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
	listLabel: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.label },
	listHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.micro },
	listDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 60 },
	themeRow: { paddingBottom: space.xs, minHeight: 0 },
	themeOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.mdPlus },
	themeOption: {
		flexGrow: 1,
		flexBasis: 90,
		minHeight: 48,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.xsPlus,
		paddingVertical: space.smPlus,
		borderRadius: radii.sm,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	themeOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	themeOptionText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	themeOptionTextActive: { color: colors.buttonText },
	logoutButton: { marginTop: space.sm, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
	logoutText: { color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.body },
	errorRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
	});
}
