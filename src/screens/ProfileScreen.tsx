import { useState, useEffect } from "react";
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
import { colors, typography } from "../theme/designSystem";
import type { Session } from "../auth/session";
import { getInitials, getAvatarUri, splitName } from "../auth/session";
import { isBiometricAvailable } from "../auth/biometricAuth";
import { updateProfile } from "../services";

type IonName = ComponentProps<typeof Ionicons>["name"];

type Props = {
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onLogout: () => void;
	onOpenPersonalData: () => void;
	onOpenPayment: () => void;
	onOpenStores: () => void;
	onOpenSavings: () => void;
	onOpenHelp: () => void;
	onChangePassword?: () => void;
	biometricEnabled?: boolean;
	onToggleBiometric?: (enabled: boolean) => void;
};

type LinkItem = {
	id: string;
	icon: IonName;
	label: string;
	hint?: string;
	action: keyof Pick<Props, "onOpenPersonalData" | "onOpenPayment" | "onOpenStores" | "onOpenSavings" | "onChangePassword">;
};

const ACCOUNT_ITEMS: LinkItem[] = [
	{ id: "personal", icon: "person-outline", label: "Datos personales", action: "onOpenPersonalData" },
	{ id: "payment", icon: "card-outline", label: "Métodos de pago", hint: "2 tarjetas guardadas", action: "onOpenPayment" },
	{ id: "stores", icon: "location-outline", label: "Mis tiendas favoritas", action: "onOpenStores" },
	{ id: "savings", icon: "wallet-outline", label: "Mis últimos ahorros", action: "onOpenSavings" },
	{ id: "password", icon: "lock-closed-outline", label: "Cambiar contraseña", action: "onChangePassword" },
];

export function ProfileScreen({
	session,
	activeTab,
	onSelectTab,
	onScanPress,
	onLogout,
	onOpenPersonalData,
	onOpenPayment,
	onOpenStores,
	onOpenSavings,
	onOpenHelp,
	onChangePassword,
	biometricEnabled = false,
	onToggleBiometric,
}: Props) {
	const insets = useSafeAreaInsets();
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
			await updateProfile(session.token, { alternativeBrandsEnabled: value });
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
		onOpenSavings,
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
					<View style={{ flex: 1, gap: 4 }}>
						<Text style={styles.profileName}>
							{splitName(session.user.name).firstName} {splitName(session.user.name).lastName}
						</Text>
						<Text style={styles.profileEmail}>{session.user.email}</Text>
						<View style={styles.levelBadge}>
							<Ionicons name="star" size={10} color={colors.navy} />
							<Text style={styles.levelBadgeText}>Nivel Plata · 2.430 pts</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={18} color="#9CA3A8" />
				</Pressable>

				<Text style={styles.sectionLabel}>CUENTA</Text>
				<View style={styles.listCard}>
					{ACCOUNT_ITEMS.map((it, idx) => (
						<View key={it.id}>
							<Pressable style={styles.listItem} onPress={handlers[it.action]}>
								<View style={styles.listIconWrap}>
									<Ionicons name={it.icon} size={16} color={colors.navy} />
								</View>
								<View style={{ flex: 1, gap: 2 }}>
									<Text style={styles.listLabel}>{it.label}</Text>
									{it.hint && <Text style={styles.listHint}>{it.hint}</Text>}
								</View>
								<Ionicons name="chevron-forward" size={18} color="#9CA3A8" />
							</Pressable>
							{idx < ACCOUNT_ITEMS.length - 1 && <View style={styles.listDivider} />}
						</View>
					))}
				</View>

				<Text style={styles.sectionLabel}>PREFERENCIAS</Text>
				<View style={styles.listCard}>
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="notifications-outline" size={16} color={colors.navy} />
						</View>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.listLabel}>Alertas de ofertas</Text>
							<Text style={styles.listHint}>Notificaciones push</Text>
						</View>
						<Switch
							value={alertsEnabled}
							onValueChange={setAlertsEnabled}
							trackColor={{ true: colors.cyan, false: "#D9DEE5" }}
							thumbColor="#fff"
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="swap-horizontal-outline" size={16} color={colors.navy} />
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
							trackColor={{ true: colors.cyan, false: "#D9DEE5" }}
							thumbColor="#fff"
							disabled={savingPreference}
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="shield-checkmark-outline" size={16} color={colors.navy} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.listLabel}>Compartir datos anónimos</Text>
						</View>
						<Switch
							value={shareData}
							onValueChange={setShareData}
							trackColor={{ true: colors.cyan, false: "#D9DEE5" }}
							thumbColor="#fff"
						/>
					</View>
					<View style={styles.listDivider} />
					<View style={styles.listItem}>
						<View style={styles.listIconWrap}>
							<Ionicons name="finger-print-outline" size={16} color={colors.navy} />
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
							trackColor={{ true: colors.cyan, false: "#D9DEE5" }}
							thumbColor="#fff"
							disabled={!biometricAvailable}
						/>
					</View>
					<View style={styles.listDivider} />
					<Pressable style={styles.listItem} onPress={onOpenHelp}>
						<View style={styles.listIconWrap}>
							<Ionicons name="help-circle-outline" size={16} color={colors.navy} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.listLabel}>Centro de ayuda</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#9CA3A8" />
					</Pressable>
				</View>

				<Pressable style={styles.logoutButton} onPress={onLogout}>
					<Ionicons name="log-out-outline" size={18} color="#EF4444" />
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

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 20, height: 56, flexDirection: "row", alignItems: "center", gap: 10 },
	headerLogo: { width: 24, height: 24, borderRadius: 6 },
	headerTitle: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	scroll: { flex: 1 },
	scrollContent: { padding: 16, gap: 12 },
	profileCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#E5E7EB" },
	avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
	avatarImage: { width: "100%", height: "100%" },
	avatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18 },
	profileName: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 16 },
	profileEmail: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12 },
	levelBadge: { alignSelf: "flex-start", backgroundColor: "#E8F6FC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
	levelBadgeText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 11, letterSpacing: 0.3 },
	sectionLabel: { color: "#9CA3A8", fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2, marginTop: 8 },
	listCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
	listItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
	listIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#E8F6FC", alignItems: "center", justifyContent: "center" },
	listLabel: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	listHint: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 12 },
	listDivider: { height: 1, backgroundColor: "#E5E7EB", marginLeft: 60 },
	logoutButton: { marginTop: 8, height: 48, borderRadius: 10, borderWidth: 1, borderColor: "#EF4444", backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
	logoutText: { color: "#EF4444", fontFamily: typography.family.medium, fontSize: 15 },
});
