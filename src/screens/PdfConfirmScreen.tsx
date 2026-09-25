import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../components";
import { space, typography, useThemeColors, type ColorTokens, radii } from "../theme/designSystem";

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
			<ScreenHeader title="Confirmar PDF" onBack={onCancel} />

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
	content: {
		flex: 1,
		paddingHorizontal: space.xl,
		paddingTop: 32,
		justifyContent: "space-between",
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radii.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 32,
		alignItems: "center",
		gap: space.mdPlus,
		marginTop: space.xl,
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
		fontSize: typography.sizes.subtitle,
		textAlign: "center",
		lineHeight: 22,
	},
	hint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: typography.sizes.label,
		textAlign: "center",
	},
	actions: { gap: space.md, paddingBottom: space.md },
	primaryButton: {
		backgroundColor: colors.navy,
		height: 54,
		borderRadius: radii.md,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: space.sm,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.body,
	},
	secondaryButton: {
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card,
		height: 52,
		borderRadius: radii.md,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: typography.sizes.label,
	},
	});
}
