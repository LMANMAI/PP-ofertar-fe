import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useIsDarkMode, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Account = { id: string; name: string; email: string; initials: string; color: string };

const ACCOUNTS: Account[] = [
	{ id: "1", name: "Martina Álvarez", email: "martina.a@gmail.com", initials: "MA", color: "#7DD4F5" },
	{ id: "2", name: "Martina Personal", email: "martina.personal@gmail.com", initials: "MP", color: "#F2B61D" },
];

type Props = { onBack: () => void; onSelect: () => void };

export function GoogleChooseAccountScreen({ onBack, onSelect }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style={isDark ? "light" : "dark"} translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="close" size={22} color={colors.defaultText} />
				</Pressable>
			</View>

			<View style={styles.content}>
				<Ionicons name="logo-google" size={40} color="#4285F4" style={{ marginBottom: 12 }} />
				<Text style={styles.title}>Elegí una cuenta</Text>
				<Text style={styles.subtitle}>para continuar con OfertAR</Text>

				<View style={styles.accountList}>
					{ACCOUNTS.map((a) => (
						<Pressable key={a.id} style={styles.accountRow} onPress={onSelect}>
							<View style={[styles.accAvatar, { backgroundColor: a.color }]}>
								<Text style={styles.accAvatarText}>{a.initials}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.accName}>{a.name}</Text>
								<Text style={styles.accEmail}>{a.email}</Text>
							</View>
						</Pressable>
					))}
					<Pressable style={styles.accountRow}>
						<View style={styles.addAccount}>
							<Ionicons name="person-add-outline" size={20} color={colors.mutedText2} />
						</View>
						<Text style={styles.addText}>Usar otra cuenta</Text>
					</Pressable>
				</View>

				<Text style={styles.legal}>
					Para continuar, Google compartirá tu nombre, dirección de email e idioma con OfertAR.
				</Text>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.card },
	statusBarBg: { backgroundColor: colors.card },
	header: { height: 56, paddingHorizontal: 12, justifyContent: "center" },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 24 },
	subtitle: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 14, marginTop: 4 },
	accountList: { marginTop: 24, gap: 4 },
	accountRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 4 },
	accAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
	accAvatarText: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 14 },
	accName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	accEmail: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, marginTop: 1 },
	addAccount: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8F9FB", alignItems: "center", justifyContent: "center" },
	addText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
	legal: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 11, lineHeight: 16, marginTop: 32 },
	});
}
