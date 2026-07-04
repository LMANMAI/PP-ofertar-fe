import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

// Generador determinista de "QR" pseudoaleatorio para placeholder visual.
// (Para QR real necesitaríamos react-native-svg + qrcode.)
const QR_SIZE = 21;

function useQrPattern(seed: string) {
	return useMemo(() => {
		const pattern: boolean[][] = [];
		let s = 0;
		for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) & 0xffff;
		for (let y = 0; y < QR_SIZE; y++) {
			const row: boolean[] = [];
			for (let x = 0; x < QR_SIZE; x++) {
				s = (s * 1103515245 + 12345) & 0xffffffff;
				row.push(((s >> 16) & 1) === 1);
			}
			pattern.push(row);
		}
		// Posiciones de los 3 finder patterns en QR reales
		const finder = (cx: number, cy: number) => {
			for (let y = 0; y < 7; y++) {
				for (let x = 0; x < 7; x++) {
					const ring =
						x === 0 || x === 6 || y === 0 || y === 6 ||
						(x >= 2 && x <= 4 && y >= 2 && y <= 4);
					if (cy + y < QR_SIZE && cx + x < QR_SIZE) {
						pattern[cy + y][cx + x] = ring;
					}
				}
			}
		};
		finder(0, 0);
		finder(QR_SIZE - 7, 0);
		finder(0, QR_SIZE - 7);
		return pattern;
	}, [seed]);
}

export function OfferCodeScreen({ offer, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const qr = useQrPattern(offer.id);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
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
							<Ionicons name="checkmark" size={12} color="#22C55E" />
							<Text style={styles.activatedText}>Activada</Text>
						</View>
					</View>

					<Text style={styles.title}>{offer.title}</Text>
					<Text style={styles.subtitle}>{offer.subtitle}</Text>

					<View style={styles.pointsRow}>
						<Text style={styles.pointsText}>{offer.points} al pagar</Text>
					</View>

					<View style={styles.divider} />

					<View style={styles.qrWrap}>
						<View style={styles.qrCanvas}>
							{qr.map((row, y) => (
								<View key={y} style={styles.qrRow}>
									{row.map((cell, x) => (
										<View
											key={x}
											style={[
												styles.qrCell,
												cell ? styles.qrCellOn : styles.qrCellOff,
											]}
										/>
									))}
								</View>
							))}
						</View>
					</View>

					<Text style={styles.helper}>
						Mostrá este código en caja{"\n"}antes de pagar
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
		borderColor: "#E5E7EB",
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
		color: "#22C55E",
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
		color: "#6B7280",
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
		backgroundColor: "#E5E7EB",
		marginTop: 14,
	},
	qrWrap: { alignItems: "center", paddingVertical: 18 },
	qrCanvas: {
		padding: 12,
		backgroundColor: "#fff",
		borderRadius: 12,
	},
	qrRow: { flexDirection: "row" },
	qrCell: { width: 8, height: 8 },
	qrCellOn: { backgroundColor: "#0A1F44" },
	qrCellOff: { backgroundColor: "#fff" },
	helper: {
		textAlign: "center",
		color: "#6B7280",
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 18,
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
