import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, BottomNav, ScreenHeader, type TabKey } from "../components";
import type { Session } from "../auth/session";
import { deleteAccount } from "../services/authApi";

type Props = {
	session: Session;
	onBack: () => void;
	onDeleted: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function DeleteAccountScreen({ session, onBack, onDeleted, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = password.length > 0 && !loading;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setError(null);
		setLoading(true);
		try {
			await deleteAccount(session.token, password);
			onDeleted();
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Eliminar cuenta" onBack={onBack} />

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: insets.bottom + 140 }} keyboardShouldPersistTaps="handled">
					<View style={styles.warningBox}>
						<Ionicons name="warning-outline" size={18} color={colors.dangerSoftText} />
						<Text style={styles.warningText}>
							Esto borra tu cuenta, tu historial de tickets y tus tiendas favoritas para siempre. No se puede deshacer.
						</Text>
					</View>

					<InputField label="Confirmá tu contraseña" value={password} onChangeText={setPassword} secureTextEntry showPasswordToggle />

					{error && (
						<View style={styles.errorBox}>
							<Ionicons name="alert-circle" size={16} color={colors.dangerSoftText} />
							<Text style={styles.errorText}>{error}</Text>
						</View>
					)}

					<Pressable
						onPress={canSubmit ? handleSubmit : undefined}
						style={({ pressed }) => [
							styles.submitBtn,
							!canSubmit && styles.submitBtnDisabled,
							pressed && canSubmit && { opacity: 0.85 },
						]}
						disabled={!canSubmit}
						accessibilityRole="button"
						accessibilityState={{ disabled: !canSubmit }}
					>
						{loading ? (
							<ActivityIndicator size="small" color={colors.buttonText} />
						) : (
							<Text style={styles.submitText}>Eliminar mi cuenta</Text>
						)}
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	warningBox: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", backgroundColor: colors.dangerSoft, padding: space.mdPlus, borderRadius: 10 },
	warningText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 18 },
	submitBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.danger,
		height: 52,
		borderRadius: 12,
		marginTop: space.xs,
	},
	submitBtnDisabled: { opacity: 0.5 },
	submitText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15, lineHeight: 18 },
	errorBox: { paddingVertical: space.smPlus, paddingHorizontal: space.md, borderRadius: 10, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: space.sm },
	errorText: { flex: 1, color: colors.dangerSoftText, fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	});
}
