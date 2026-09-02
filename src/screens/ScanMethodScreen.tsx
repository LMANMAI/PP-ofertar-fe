import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";

type Props = {
	onChoosePhotos: () => void;
	onChoosePdf: () => void;
	onChooseBarcode: () => void;
	onBack: () => void;
};

export function ScanMethodScreen({
	onChoosePhotos,
	onChoosePdf,
	onChooseBarcode,
	onBack,
}: Props) {
	const insets = useSafeAreaInsets();

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Escanear</Text>
				<View style={{ width: 32 }} />
			</View>

			<View style={styles.content}>
				<Text style={styles.title}>¿Qué querés hacer?</Text>
				<Text style={styles.subtitle}>
					Cargá un ticket para registrar tu compra, o escaneá un producto
					para ver dónde está más barato.
				</Text>

				<View style={styles.cards}>
					<OptionCard
						icon="camera"
						title="Sacar fotos"
						description="Capturá cada parte del ticket y envialas en orden."
						onPress={onChoosePhotos}
						accent={colors.cyan}
					/>

					<OptionCard
						icon="document-attach"
						title="Adjuntar PDF"
						description="Seleccioná el archivo PDF del ticket desde tu dispositivo."
						onPress={onChoosePdf}
						accent={colors.orange}
						badge="Más rápido"
					/>

					<OptionCard
						icon="barcode"
						title="Escanear producto"
						description="Apuntá al código de barras y mirá el precio en cada supermercado."
						onPress={onChooseBarcode}
						accent={colors.softNavy}
					/>
				</View>

				<View style={styles.ecoTip}>
					<Ionicons name="leaf-outline" size={20} color="#1D9E75" />
					<Text style={styles.ecoTipText}>
						Elegí PDF: es más rápido y ahorramos papel. ¡Cada ticket cuenta!
					</Text>
				</View>
			</View>
		</View>
	);
}

function OptionCard({
	icon,
	title,
	description,
	onPress,
	accent,
	badge,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	description: string;
	onPress: () => void;
	accent: string;
	badge?: string;
}) {
	return (
		<Pressable style={styles.card} onPress={onPress}>
			<View style={[styles.iconWrap, { backgroundColor: accent }]}>
				<Ionicons name={icon} size={28} color={colors.navy} />
			</View>
			<View style={styles.cardText}>
				<View style={styles.cardTitleRow}>
					<Text style={styles.cardTitle}>{title}</Text>
					{badge ? (
						<View style={styles.badge}>
							<Text style={styles.badgeText}>{badge}</Text>
						</View>
					) : null}
				</View>
				<Text style={styles.cardDescription}>{description}</Text>
			</View>
			<Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
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
		paddingTop: 28,
		paddingBottom: 24,
	},
	title: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 22,
		lineHeight: 28,
	},
	subtitle: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	cards: { marginTop: 28, gap: 14 },
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		backgroundColor: colors.card,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	iconWrap: {
		width: 52,
		height: 52,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	cardText: { flex: 1, gap: 4 },
	cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	cardTitle: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	cardDescription: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
	},
	badge: {
		backgroundColor: "#E0F5EF",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	badgeText: {
		color: "#1D9E75",
		fontFamily: typography.family.medium,
		fontSize: 10,
	},
	ecoTip: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
		backgroundColor: "#E0F5EF",
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginTop: 24,
	},
	ecoTipText: {
		flex: 1,
		color: "#1D9E75",
		fontFamily: typography.family.medium,
		fontSize: 13,
		lineHeight: 19,
	},
});
