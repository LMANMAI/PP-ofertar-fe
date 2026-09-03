import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "../theme/designSystem";
import { ConfirmSheet } from "../components";

type Props = { onCancel: () => void; onConfirm: () => void };

export function LogoutConfirmScreen({ onCancel, onConfirm }: Props) {
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.backdrop, { paddingTop: insets.top }]}>
			<StatusBar style="light" translucent />
			<ConfirmSheet
				icon="log-out-outline"
				iconTone="danger"
				title="¿Cerrar sesión?"
				subtitle="Vas a tener que volver a ingresar tu correo y contraseña para acceder."
				confirmLabel="Sí, cerrar sesión"
				confirmTone="danger"
				onConfirm={onConfirm}
				cancelLabel="Cancelar"
				onCancel={onCancel}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(10,31,68,0.7)", justifyContent: "center", paddingHorizontal: space.xxl },
});
