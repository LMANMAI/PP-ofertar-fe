import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { colors, typography } from "../theme/designSystem";
import { getStoredToken, clearStoredToken } from "../auth/biometricAuth";
import type { Session } from "../auth/session";

type Props = {
	onSuccess: (session: Session) => void;
	onFallback: () => void;
};

export function BiometricLockScreen({ onSuccess, onFallback }: Props) {
	const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [attempts, setAttempts] = useState(0);

	const handleAuthenticate = async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await LocalAuthentication.authenticateAsync({
				promptMessage: "Usá tu huella para ingresar",
				fallbackLabel: "Usar contraseña",
				disableDeviceFallback: false,
			});

			if (!result.success) {
				if (result.error === "user_cancel" || result.error === "system_cancel") {
					setLoading(false);
					return;
				}
				if (result.error === "lockout") {
					setError("Demasiados intentos. Iniciá sesión con tu contraseña.");
					setLoading(false);
					return;
				}
				setAttempts((prev) => prev + 1);
				setError("No se pudo verificar tu identidad. Intentá de nuevo.");
				setLoading(false);
				return;
			}

			const token = await getStoredToken();
			if (!token) {
				setError("No se encontraron credenciales guardadas. Iniciá sesión con tu contraseña.");
				setLoading(false);
				return;
			}

			try {
				const res = await fetch(
					"https://ofertar-backend-ofertar-backend.qr2vg3.easypanel.host/users/me",
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);

				if (!res.ok) {
					await clearStoredToken();
					setError("Tu sesión expiró. Iniciá sesión con tu contraseña.");
					setLoading(false);
					return;
				}

				const user = await res.json();
				onSuccess({ token, user });
			} catch {
				setError("Error de conexión. Verificá tu internet.");
				setLoading(false);
			}
		} catch {
			setError("Error al autenticar. Intentá de nuevo.");
			setLoading(false);
		}
	};

	useEffect(() => {
		handleAuthenticate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleFallback = async () => {
		await clearStoredToken();
		onFallback();
	};

	return (
		<View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
			<StatusBar style="light" translucent />
			<View style={styles.content}>
				<Pressable
					onPress={loading ? undefined : handleAuthenticate}
					style={({ pressed }) => [
						styles.fingerprintCircle,
						pressed && !loading && { opacity: 0.8 },
					]}
					disabled={loading}
				>
					{loading && attempts === 0 ? (
						<ActivityIndicator size="large" color={colors.navy} />
					) : (
						<Ionicons name="finger-print-outline" size={56} color={colors.navy} />
					)}
				</Pressable>

				<Text style={styles.title}>
					{loading && attempts === 0 ? "Verificando..." : "Usá tu huella para ingresar"}
				</Text>
				<Text style={styles.hint}>
					Tocá el ícono para intentar de nuevo
				</Text>

				{error && (
					<View style={styles.errorBox}>
						<Ionicons name="alert-circle" size={16} color="#FCA5A5" />
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}
			</View>

			<Pressable
				onPress={handleFallback}
				style={({ pressed }) => [
					styles.fallbackBtn,
					pressed && { opacity: 0.75 },
				]}
			>
				<Ionicons name="mail-outline" size={18} color={colors.cyan} />
				<Text style={styles.fallbackText}>Iniciar sesión con contraseña</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.navy },
	content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, paddingHorizontal: 32 },
	fingerprintCircle: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: colors.cyan,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	title: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 18, textAlign: "center" },
	hint: { color: "#99B2CC", fontFamily: typography.family.regular, fontSize: 14, textAlign: "center" },
	errorBox: { marginTop: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", flexDirection: "row", alignItems: "flex-start", gap: 10, maxWidth: 320 },
	errorText: { flex: 1, color: "#FCA5A5", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
	fallbackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
	fallbackText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 15 },
});
