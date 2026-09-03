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
import { space, typography,
	useThemeColors,
	useThemePreference,
	type ColorTokens,
	type ThemePreference, } from "../theme/designSystem";
import type { Session } from "../auth/session";
import { getInitials, getAvatarUri, splitName } from "../auth/session";
import { isBiometricAvailable } from "../auth/biometricAuth";
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
	hint?: string;
	action: keyof Pick<Props, "onOpenPersonalData" | "onOpenPayment" | "onOpenStores" | "onOpenPoints" | "onChangePassword">;
};

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IonName }[] = [
	{ value: "system", label: "Sistema", icon: "phone-portrait-outline" },
	{ value: "light", label: "Claro", icon: "sunny-outline" },
	{ value: "dark", label: "Oscuro", icon: "moon-outline" },
];

const ACCOUNT_ITEMS: LinkItem[] = [
	{ id: "personal", icon: "person-outline", label: "Datos personales", action: "onOpenPersonalData" },
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
	const [alertsEnabled, setAlertsEnabled] = useState(true);
	const [shareData, setShareData] = useState(false);
	const [biometricAvailable, setBiometricAvailable] = useState(false);
	const [alternativeBrands, setAlternativeBrands] = useState(
		session.user.alternativeBrandsEnabled ?? true,
	);
	const [savingPreference, setSavingPreference] = useState(false);

	useEffect(() => {
		isBiometricAvailable().then(setBiometricAvailable).catch(() => {});
	}, []);

	const handleToggleAlternativeBrands = async (value: boolean) => {
		// Optimistic: the switch should feel instant, and a failed save is
		// recoverable by toggling again rather than worth blocking the UI.
		setAlternativeBrands(value);
		setSavingPreference(true);
		try {
			const updated = await updateProfile(session.token, { alternativeBrandsEnabled: value });
			// The PUT may answer without re-issuing a token; keep the current one.
			onSessionUpdate?.({ token: updated.token || session.token, user: updated.user });
		} catch {
			setAlternativeBrands(!value);
		} finally {
			setSavingPreference(false);
		}
	};

	const handlers: Record<string, () => void> = {
		onOpenPersonalData,
		onOpenPayment,
		onOpenStores,
		onOpenPoints,
		onChangePassword: onChangePassword ?? (() => {}),
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Image
					source={require("../../assets/logo_ofertar.png")}
					style={styles.headerLogo}
				/>
				<Text style={styles.headerTitle}>Perfil</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<Pressable style={styles.profileCard} onPress={onOpenPersonalData}>
					<View style={styles.avatar}>
						{session.user.profilePicture ? (
							<Image source={{ uri: getAvatarUri(session.user.profilePicture) }} style={styles.avatarImage} />
						) : (
							<Text style={styles.avatarText}>{getInitials(session.user.name)}</Text>
						)}
					</View>
					<View style={{ flex: 1, gap: space.xs }}>
						<Text style={styles.profileName}>
							{splitName(session.user.name).firstName} {splitName(session.user.name).lastName}
						</Text>
						<Text style={styles.profileEmail}>{session.user.email}</Text>
						<View style={styles.levelBadge}>
							<Ionicons name="people" size={10} color={colors.infoSoftText} />
							<Text style={styles.levelBadgeText}>
								{referralPoints.toLocaleString("es-AR")} pts por referidos
							</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
				</Pressable>

				<Text style={styles.sectionLabel}>CUENTA</Text>
				<View style={styles.listCard}>
					{ACCOUNT_ITEMS.map((it, idx) => {
						const hint = it.id === "points" ? `${referralPoints.toLocaleString("es-AR")} pts` : it.hint;
						return (
							<View key={it.id}>
								<Pressable style={styles.listItem} onPress={handlers[it.action]}>
									<View style={styles.listIconWrap}>
										<Ionicons name={it.icon} size={16} color={colors.infoSoftText} />
									</View>
									<View style={{ flex: 1, gap: 2 }}>
										<Text style={styles.listLabel}>{it.label}</Text>
										{hint && <Text style={styles.listHint}>{hint}</Text>}
									</View>
									<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
								</Pressable>
								{idx < ACCOUNT_ITEMS.length - 1 && <View style={styles.listDivider} />}
							</View>
						);
					})}
				</View>

				<Text style={styles.sectionLabel}>PREFERENCIAS</Text>
				<View style={styles.listCard}>
					<View style={[styles.listItem, styles.themeRow]}>
						<View style={styles.listIconWrap}>
							<Ionicons name="contrast-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.listLabel}>Tema</Text>
							<Text style={styles.listHint}>Claro, oscuro, o el que uses en el sistema</Text>
						</View>
					</View>
					<View style={styles.themeOptionsRow}>
						{THEME_OPTIONS.map((opt) => {
							const active = themePreference === opt.value;
							return (
								<Pressable
									key={opt.value}
									onPress={() => setThemePreference(opt.value)}
									style={[styles.themeOption, active && styles.themeOptionActive]}
									accessibilityRole="button"
									accessibilityState={{ selected: active }}
									accessibilityLabel={`Tema ${opt.label}`}
								>
									<Ionicons
										name={opt.icon}
										size={15}
										color={active ? colors.buttonText : colors.mutedText2}
									/>
									<Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
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
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.listLabel}>Alertas de ofertas</Text>
							<Text style={styles.listHint}>Notificaciones push</Text>
						</View>
						<Switch
							value={alertsEnabled}
							onValueChange={setAlertsEnabled}
							trackColor={{ true: colors.cyan, false: colors.border }}
							thumbColor={colors.buttonText}
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="swap-horizontal-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.listLabel}>Marcas alternativas</Text>
							<Text style={styles.listHint}>
								Mostrarte ofertas del mismo producto en otras marcas
							</Text>
						</View>
						<Switch
							value={alternativeBrands}
							onValueChange={handleToggleAlternativeBrands}
							trackColor={{ true: colors.cyan, false: colors.border }}
							thumbColor={colors.buttonText}
							disabled={savingPreference}
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="shield-checkmark-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.listLabel}>Compartir datos anónimos</Text>
						</View>
						<Switch
							value={shareData}
							onValueChange={setShareData}
							trackColor={{ true: colors.cyan, false: colors.border }}
							thumbColor={colors.buttonText}
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="finger-print-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.listLabel}>Inicio de sesión biométrico</Text>
							<Text style={styles.listHint}>
								{biometricAvailable
									? "Usá tu huella para ingresar"
									: "No disponible en este dispositivo"}
							</Text>
						</View>
						<Switch
							value={biometricEnabled}
							onValueChange={(v) => onToggleBiometric?.(v)}
							trackColor={{ true: colors.cyan, false: colors.border }}
							thumbColor={colors.buttonText}
							disabled={!biometricAvailable}
						/>
					</View>
					<View style={styles.listDivider} />
					<Pressable style={styles.listItem} onPress={onOpenHelp}>
						<View style={styles.listIconWrap}>
							<Ionicons name="help-circle-outline" size={16} color={colors.infoSoftText} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.listLabel}>Centro de ayuda</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
					</Pressable>
				</View>

				<Pressable style={styles.logoutButton} onPress={onLogout}>
					<Ionicons name="log-out-outline" size={18} color={colors.danger} />
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
	header: { backgroundColor: colors.navy, paddingHorizontal: space.xl, height: 56, flexDirection: "row", alignItems: "center", gap: 10 },
	headerLogo: { width: 24, height: 24, borderRadius: 6 },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	scroll: { flex: 1 },
	scrollContent: { padding: space.lg, gap: space.md },
	profileCard: { backgroundColor: colors.card, borderRadius: 16, padding: space.lg, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: colors.divider },
	avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
	avatarImage: { width: "100%", height: "100%" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18 },
	profileName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 16 },
	profileEmail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12 },
	levelBadge: { alignSelf: "flex-start", backgroundColor: colors.infoSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: 2 },
	levelBadgeText: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: 11, letterSpacing: 0.3 },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: space.sm },
	listCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
	listItem: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
	listIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
	listLabel: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	listHint: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 12 },
	listDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 60 },
	themeRow: { paddingBottom: space.xs, minHeight: 0 },
	themeOptionsRow: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg, paddingBottom: 14 },
	themeOption: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 9,
		borderRadius: 8,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	themeOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	themeOptionText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 12 },
	themeOptionTextActive: { color: colors.buttonText },
	logoutButton: { marginTop: space.sm, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
	logoutText: { color: colors.danger, fontFamily: typography.family.medium, fontSize: 15 },
	});
}
