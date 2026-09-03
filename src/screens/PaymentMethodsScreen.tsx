import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { BottomNav, InputField, type TabKey } from "../components";

type Card = { id: string; brand: string; last4: string; expiry: string; primary?: boolean; color: string };

const INITIAL_CARDS: Card[] = [
	{ id: "1", brand: "Visa", last4: "4471", expiry: "12/27", primary: true, color: "#1A1F71" },
	{ id: "2", brand: "Mastercard", last4: "8809", expiry: "08/26", color: "#EB001B" },
];

const CARD_COLORS = ["#1A1F71", "#EB001B", "#0A1F44", "#006747"];

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function PaymentMethodsScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
	const [showSheet, setShowSheet] = useState(false);
	const [brand, setBrand] = useState("");
	const [number, setNumber] = useState("");
	const [expiry, setExpiry] = useState("");
	const [error, setError] = useState<string | null>(null);

	const resetForm = () => {
		setBrand("");
		setNumber("");
		setExpiry("");
		setError(null);
	};

	const handleAddCard = () => {
		const last4 = number.trim().slice(-4);
		if (!brand.trim() || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
			setError("Ingresá una marca y un número de tarjeta válido (mínimo 4 dígitos)");
			return;
		}
		if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) {
			setError("Ingresá el vencimiento en formato MM/AA");
			return;
		}
		setCards((prev) => [
			...prev,
			{
				id: String(Date.now()),
				brand: brand.trim(),
				last4,
				expiry: expiry.trim(),
				color: CARD_COLORS[prev.length % CARD_COLORS.length],
			},
		]);
		setShowSheet(false);
		resetForm();
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />
			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Métodos de pago</Text>
			</View>

			<ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
				{cards.map((c) => (
					<View key={c.id} style={[styles.card, { backgroundColor: c.color }]}>
						<View style={styles.cardTop}>
							<Ionicons name="card" size={20} color="#fff" />
							{c.primary && (
								<View style={styles.primaryBadge}>
									<Text style={styles.primaryText}>Principal</Text>
								</View>
							)}
						</View>
						<Text style={styles.cardNumber}>•••• •••• •••• {c.last4}</Text>
						<View style={styles.cardBottom}>
							<View>
								<Text style={styles.cardMeta}>MARCA</Text>
								<Text style={styles.cardValue}>{c.brand}</Text>
							</View>
							<View>
								<Text style={styles.cardMeta}>VENCE</Text>
								<Text style={styles.cardValue}>{c.expiry}</Text>
							</View>
						</View>
					</View>
				))}

				<Pressable style={styles.addCard} onPress={() => setShowSheet(true)}>
					<Ionicons name="add-circle-outline" size={20} color={colors.navy} />
					<Text style={styles.addCardText}>Agregar nueva tarjeta</Text>
				</Pressable>

				<View style={styles.note}>
					<Ionicons name="shield-checkmark-outline" size={16} color="#15803D" />
					<Text style={styles.noteText}>
						Tus datos de pago están protegidos con encriptación de nivel bancario.
					</Text>
				</View>
			</ScrollView>

			<Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
				<View style={styles.sheetBackdrop}>
					<View style={styles.sheet}>
						<View style={styles.sheetHandle} />
						<Text style={styles.sheetTitle}>Agregar tarjeta</Text>
						<View style={styles.sheetForm}>
							<InputField label="Marca (ej. Visa, Mastercard)" value={brand} onChangeText={setBrand} />
							<InputField
								label="Número de tarjeta"
								value={number}
								onChangeText={setNumber}
								keyboardType="numeric"
							/>
							<InputField
								label="Vencimiento (MM/AA)"
								value={expiry}
								onChangeText={setExpiry}
								keyboardType="numeric"
							/>
						</View>
						{error && (
							<View style={styles.errorBox}>
								<Ionicons name="alert-circle" size={16} color="#A8341E" />
								<Text style={styles.errorText}>{error}</Text>
							</View>
						)}
						<Pressable style={styles.sheetSave} onPress={handleAddCard}>
							<Text style={styles.sheetSaveText}>Guardar tarjeta</Text>
						</Pressable>
						<Pressable
							style={styles.sheetCancel}
							onPress={() => {
								setShowSheet(false);
								resetForm();
							}}
						>
							<Text style={styles.sheetCancelText}>Cancelar</Text>
						</Pressable>
					</View>
				</View>
			</Modal>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: { backgroundColor: colors.navy, paddingHorizontal: 12, height: 56, flexDirection: "row", alignItems: "center", gap: 8 },
	backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	headerTitle: { flex: 1, color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 17 },
	card: { borderRadius: 14, padding: 18, gap: 18, height: 170, justifyContent: "space-between" },
	cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	primaryBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
	primaryText: { color: "#fff", fontFamily: typography.family.medium, fontSize: 11 },
	cardNumber: { color: "#fff", fontFamily: typography.family.bold, fontSize: 20, letterSpacing: 2 },
	cardBottom: { flexDirection: "row", justifyContent: "space-between" },
	cardMeta: { color: "rgba(255,255,255,0.6)", fontFamily: typography.family.medium, fontSize: 9, letterSpacing: 1 },
	cardValue: { color: "#fff", fontFamily: typography.family.medium, fontSize: 13, marginTop: 4 },
	addCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.divider, borderStyle: "dashed", justifyContent: "center" },
	addCardText: { color: colors.navy, fontFamily: typography.family.medium, fontSize: 14 },
	note: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#F0FDF4", padding: 12, borderRadius: 10 },
	noteText: { flex: 1, color: "#15803D", fontFamily: typography.family.regular, fontSize: 12, lineHeight: 16 },
	sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
	sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 },
	sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider, alignSelf: "center" },
	sheetTitle: { color: colors.navy, fontFamily: typography.family.bold, fontSize: 18, textAlign: "center" },
	sheetForm: { gap: 14 },
	sheetSave: { backgroundColor: colors.navy, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
	sheetSaveText: { color: colors.buttonText, fontFamily: typography.family.medium, fontSize: 15 },
	sheetCancel: { height: 40, alignItems: "center", justifyContent: "center" },
	sheetCancelText: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 14 },
	errorBox: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#FDECEA", borderWidth: 1, borderColor: "#F5C1B8", flexDirection: "row", alignItems: "center", gap: 8 },
	errorText: { flex: 1, color: "#A8341E", fontFamily: typography.family.medium, fontSize: 13, lineHeight: 18 },
});
