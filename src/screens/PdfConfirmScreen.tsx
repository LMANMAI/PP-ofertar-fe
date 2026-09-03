import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";

type Props = {
	pdfName: string;
	onSend: () => void;
	onCancel: () => void;
};

export function PdfConfirmScreen({ pdfName, onSend, onCancel }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onCancel} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Confirmar PDF</Text>
				<View style={{ width: 32 }} />
			</View>

			<View style={styles.content}>
				<View style={styles.card}>
					<View style={styles.iconWrap}>
						<Ionicons name="document-text" size={48} color={colors.orange} />
					</View>
					<Text style={styles.fileName} numberOfLines={2}>
						{pdfName}
					</Text>
					<Text style={styles.hint}>
						¿Querés procesar este ticket?
					</Text>
				</View>

				<View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
					<Pressable style={styles.primaryButton} onPress={onSend}>
						<Ionicons name="send" size={16} color={colors.buttonText} />
						<Text style={styles.primaryButtonText}>Enviar ticket</Text>
					</Pressable>
					<Pressable style={styles.secondaryButton} onPress={onCancel}>
						<Text style={styles.secondaryButtonText}>Cancelar</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		textAlign: "center",
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 32,
		justifyContent: "space-between",
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 32,
		alignItems: "center",
		gap: 14,
		marginTop: 20,
	},
	iconWrap: {
		width: 90,
		height: 90,
		borderRadius: 24,
		backgroundColor: colors.softWarm,
		alignItems: "center",
		justifyContent: "center",
	},
	fileName: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 16,
		textAlign: "center",
		lineHeight: 22,
	},
	hint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 14,
		textAlign: "center",
	},
	actions: { gap: 12, paddingBottom: 12 },
	primaryButton: {
		backgroundColor: colors.navy,
		height: 54,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		height: 52,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	});
}
