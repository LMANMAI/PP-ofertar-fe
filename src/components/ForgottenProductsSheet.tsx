import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";
import type { RecurringProduct } from "../services";
import { isRecurring, MAX_FORGOTTEN_SHOWN } from "./forgottenProducts";

/**
 * "¿Olvidaste comprar algo?" — shown once a scanned ticket finishes processing,
 * listing the products of their habitual shop missing from it.
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
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const shown = products.slice(0, MAX_FORGOTTEN_SHOWN);
	const hidden = products.length - shown.length;
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
							? "Es parte de tu compra habitual, pero no aparece en este ticket."
							: "Son parte de tu compra habitual, pero no aparecen en este ticket."}
					</Text>

					<View style={styles.list}>
						{shown.map((p, idx) => (
							<View key={p.barcode || p.description}>
								<View style={styles.row}>
									<Ionicons name="cart-outline" size={18} color={colors.subtleText} />
									<View style={{ flex: 1 }}>
										<Text style={styles.name}>{p.description}</Text>
										<Text style={styles.meta}>
											{isRecurring(p) ? `En ${p.ticketCount} de tus compras` : "Lo sumaste a tu compra habitual"}
										</Text>
									</View>
								</View>
								{idx < shown.length - 1 && <View style={styles.divider} />}
							</View>
						))}
					</View>

					{hidden > 0 && <Text style={styles.meta}>{hidden === 1 ? "Y 1 más." : `Y ${hidden} más.`}</Text>}

					<Pressable style={styles.button} onPress={onClose}>
						<Text style={styles.buttonText}>Entendido</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.55)",
		justifyContent: "center",
		paddingHorizontal: space.xxl,
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: 18,
		padding: 22,
		alignItems: "center",
		gap: space.smPlus,
	},
	iconWrap: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: colors.infoSoft,
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 18,
		textAlign: "center",
	},
	subtitle: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.caption,
		textAlign: "center",
		lineHeight: 18,
	},
	list: {
		alignSelf: "stretch",
		backgroundColor: colors.background,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.divider,
		paddingHorizontal: space.md,
		paddingVertical: space.xs,
		marginTop: space.xs,
	},
	row: { flexDirection: "row", alignItems: "center", gap: space.smPlus, paddingVertical: space.smPlus },
	name: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	meta: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.overline, marginTop: 1 },
	divider: { height: 1, backgroundColor: colors.divider },
	button: {
		alignSelf: "stretch",
		backgroundColor: colors.navy,
		height: 44,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: space.xsPlus,
	},
	buttonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
	},
	});
}
