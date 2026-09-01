import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import type { RecurringProduct } from "../services";

/**
 * "¿Olvidaste comprar algo?" — shown once a scanned ticket finishes processing,
 * listing the habitual products missing from it.
 *
 * Lives in components rather than inside a screen because two screens raise it:
 * the ticket-processed view and the history, which is where the user actually
 * waits while the OCR runs on the server.
 */
export function ForgottenProductsSheet({
	products,
	visible,
	onClose,
}: {
	products: RecurringProduct[];
	visible: boolean;
	onClose: () => void;
}) {
	return (
		<Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<View style={styles.card}>
					<View style={styles.iconWrap}>
						<Ionicons name="bulb-outline" size={26} color={colors.cyan} />
					</View>
					<Text style={styles.title}>
						{products.length === 1 ? "¿Olvidaste comprar esto?" : "¿Olvidaste comprar algo?"}
					</Text>
					<Text style={styles.subtitle}>
						{products.length === 1
							? "Solés comprarlo seguido, pero no aparece en este ticket."
							: "Solés comprarlos seguido, pero no aparecen en este ticket."}
					</Text>

					<View style={styles.list}>
						{products.map((p, idx) => (
							<View key={p.barcode || p.description}>
								<View style={styles.row}>
									<Ionicons name="cart-outline" size={18} color="#9CA3A8" />
									<View style={{ flex: 1 }}>
										<Text style={styles.name}>{p.description}</Text>
										<Text style={styles.meta}>En {p.ticketCount} de tus compras</Text>
									</View>
								</View>
								{idx < products.length - 1 && <View style={styles.divider} />}
							</View>
						))}
					</View>

					<Pressable style={styles.button} onPress={onClose}>
						<Text style={styles.buttonText}>Entendido</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.55)",
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: 18,
		padding: 22,
		alignItems: "center",
		gap: 10,
	},
	iconWrap: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#E8F6FC",
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 18,
		textAlign: "center",
	},
	subtitle: {
		color: "#6B7280",
		fontFamily: typography.family.regular,
		fontSize: 13,
		textAlign: "center",
		lineHeight: 18,
	},
	list: {
		alignSelf: "stretch",
		backgroundColor: "#F8FAFC",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginTop: 4,
	},
	row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
	name: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 13 },
	meta: { color: "#6B7280", fontFamily: typography.family.regular, fontSize: 11, marginTop: 1 },
	divider: { height: 1, backgroundColor: "#E5E7EB" },
	button: {
		alignSelf: "stretch",
		backgroundColor: colors.navy,
		height: 44,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 6,
	},
	buttonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
});
