import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useIsDarkMode, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { PrimaryButton } from "../components";

type Props = { onGoToLogin: () => void };

export function PasswordSuccessScreen({ onGoToLogin }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={[styles.safeArea, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
			<StatusBar style={isDark ? "light" : "dark"} />
			<View style={styles.content}>
				<View style={styles.checkCircle}>
					<Ionicons name="checkmark" size={48} color={colors.success} />
				</View>
				<Text style={styles.title}>¡Contraseña actualizada!</Text>
				<Text style={styles.body}>
					Ya podés ingresar a OfertAR con tu nueva contraseña.
				</Text>
			</View>
			<PrimaryButton label="Ir a iniciar sesión" onPress={onGoToLogin} />
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.xxl },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.mdPlus },
	checkCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.success, alignItems: "center", justifyContent: "center" },
	title: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 24, textAlign: "center", marginTop: space.md },
	body: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.label, textAlign: "center", lineHeight: 20 },
	});
}
