import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, type TabKey } from "../components";

type Props = {
	offer: {
		id: string;
		storeBadge: string;
		storeBadgeColor: string;
		storeName: string;
		title: string;
		subtitle: string;
		points: string;
		expiresAt: string; // "Vence el 20 may · 10 días restantes"
	};
	code: string;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function OfferCodeScreen({ offer, code, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await Clipboard.setStringAsync(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Código de oferta</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.card}>
					<View style={styles.cardTop}>
						<View style={styles.storeRow}>
							<View
								style={[
									styles.storeBadge,
									{ backgroundColor: offer.storeBadgeColor },
								]}
							>
								<Text style={styles.storeBadgeText}>{offer.storeBadge}</Text>
							</View>
							<Text style={styles.storeName}>{offer.storeName}</Text>
						</View>
						<View style={styles.activatedBadge}>
							<Ionicons name="checkmark" size={12} color={colors.success} />
							<Text style={styles.activatedText}>Activada</Text>
						</View>
					</View>

					<Text style={styles.title}>{offer.title}</Text>
					<Text style={styles.subtitle}>{offer.subtitle}</Text>

					<View style={styles.pointsRow}>
						<Text style={styles.pointsText}>{offer.points} al pagar</Text>
					</View>

					<View style={styles.divider} />

					<Text style={styles.codeLabel}>TU CÓDIGO</Text>
					<Pressable
						style={styles.codeBox}
						onPress={handleCopy}
						accessibilityRole="button"
						accessibilityLabel="Copiar código"
					>
						<Text style={styles.codeText}>{code}</Text>
						<Ionicons
							name={copied ? "checkmark" : "copy-outline"}
							size={18}
							color={copied ? colors.success : colors.cyan}
						/>
					</Pressable>

					<Text style={styles.helper}>
						Decile este código al cajero{"\n"}antes de pagar
					</Text>

					<View style={styles.expiryBanner}>
						<Ionicons name="time-outline" size={14} color="#B45A14" />
						<Text style={styles.expiryText}>{offer.expiresAt}</Text>
					</View>
				</View>
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: {
		flex: 1,
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 17,
	},
	scroll: { flex: 1 },
	scrollContent: { padding: 16 },
	card: {
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.divider,
		borderRadius: 16,
		padding: 18,
		gap: 8,
	},
	cardTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	storeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	storeBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 9,
	},
	storeName: {
		color: colors.navy,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	activatedBadge: {
		backgroundColor: "rgba(34,197,94,0.15)",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	activatedText: {
		color: colors.success,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	title: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 22,
		marginTop: 8,
	},
	subtitle: {
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	pointsRow: {
		alignSelf: "flex-start",
		backgroundColor: colors.navy,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
		marginTop: 8,
	},
	pointsText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	divider: {
		height: 1,
		backgroundColor: colors.divider,
		marginTop: 14,
	},
	codeLabel: {
		color: colors.subtleText,
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1.2,
		marginTop: 18,
	},
	codeBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		backgroundColor: "#F8F9FB",
		borderWidth: 1,
		borderColor: colors.divider,
		borderRadius: 8,
		paddingVertical: 14,
		marginTop: 8,
	},
	codeText: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 20,
		letterSpacing: 1,
	},
	helper: {
		textAlign: "center",
		color: colors.mutedText2,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
		marginTop: 14,
	},
	expiryBanner: {
		marginTop: 12,
		backgroundColor: "#FFF7ED",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	expiryText: {
		color: "#B45A14",
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
});
