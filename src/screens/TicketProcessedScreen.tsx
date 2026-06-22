import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "../theme/designSystem";
import { InputField } from "../components";

type Product = {
	id: string;
	name: string;
	quantity: string;
	unitPrice: string;
};

const MOCK_PRODUCTS: Product[] = [
	{ id: "1", name: "Aceite Natura 1.5L", quantity: "1 u", unitPrice: "$2.450" },
	{ id: "2", name: "Leche La Serenísima 1L", quantity: "2 u", unitPrice: "$1.960" },
	{ id: "3", name: "Pan Lactal Bimbo", quantity: "1 u", unitPrice: "$1.850" },
	{ id: "4", name: "Yerba Playadito 1kg", quantity: "1 u", unitPrice: "$3.200" },
	{ id: "5", name: "Detergente Magistral", quantity: "1 u", unitPrice: "$1.490" },
];

type Props = {
	onBack: () => void;
	onFinish: () => void;
	onSelectProduct?: (productName: string) => void;
};

export function TicketProcessedScreen({ onBack, onFinish, onSelectProduct }: Props) {
	const insets = useSafeAreaInsets();
	const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
	const [editing, setEditing] = useState<Product | null>(null);

	const handleSave = (updated: Product) => {
		setProducts((curr) =>
			curr.map((p) => (p.id === updated.id ? updated : p)),
		);
		setEditing(null);
	};

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton}>
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Ticket procesado</Text>
				<View style={styles.ocrBadge}>
					<Ionicons name="checkmark-circle" size={12} color={colors.cyan} />
					<Text style={styles.ocrText}>OCR completo</Text>
				</View>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.summaryCard}>
					<View style={styles.summaryHeader}>
						<View style={styles.storeBadge}>
							<Text style={styles.storeBadgeText}>CO</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.storeName}>COTO — AV. CABILDO</Text>
							<Text style={styles.storeMeta}>12 may · 18:42</Text>
						</View>
					</View>
					<Text style={styles.totalLabel}>TOTAL RECONOCIDO</Text>
					<Text style={styles.totalValue}>$9.970,00</Text>
					<View style={styles.tagsRow}>
						<Tag text={`Productos ${products.length}`} />
						<Tag text="Categorías 3" />
						<Tag text="+85 pts ganados" tone="cyan" />
					</View>
				</View>

				<Text style={styles.sectionTitle}>OTROS PRODUCTOS</Text>
				<View style={styles.productsList}>
					{products.map((p, idx) => (
						<Pressable
							key={p.id}
							style={[
								styles.productRow,
								idx === products.length - 1 && styles.productRowLast,
							]}
							onPress={() => onSelectProduct ? onSelectProduct(p.name) : setEditing(p)}
						>
							<View style={{ flex: 1 }}>
								<Text style={styles.productName}>{p.name}</Text>
								<Text style={styles.productMeta}>
									{p.quantity} · {p.unitPrice}
								</Text>
							</View>
							<Pressable
								hitSlop={8}
								onPress={(e) => { e.stopPropagation(); setEditing(p); }}
							>
								<Ionicons
									name="create-outline"
									size={18}
									color={colors.mutedText}
								/>
							</Pressable>
						</Pressable>
					))}
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
				<Pressable style={styles.primaryButton} onPress={onFinish}>
					<Ionicons name="add" size={18} color={colors.buttonText} />
					<Text style={styles.primaryButtonText}>Agregar producto</Text>
				</Pressable>
			</View>

			<EditProductSheet
				product={editing}
				onClose={() => setEditing(null)}
				onSave={handleSave}
			/>
		</View>
	);
}

function Tag({ text, tone }: { text: string; tone?: "cyan" }) {
	return (
		<View
			style={[styles.tag, tone === "cyan" ? styles.tagCyan : styles.tagMuted]}
		>
			<Text
				style={[
					styles.tagText,
					tone === "cyan" ? styles.tagTextCyan : styles.tagTextMuted,
				]}
			>
				{text}
			</Text>
		</View>
	);
}

function EditProductSheet({
	product,
	onClose,
	onSave,
}: {
	product: Product | null;
	onClose: () => void;
	onSave: (p: Product) => void;
}) {
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("");
	const [unitPrice, setUnitPrice] = useState("");

	useEffect(() => {
		if (product) {
			setName(product.name);
			setQuantity(product.quantity);
			setUnitPrice(product.unitPrice);
		}
	}, [product]);

	const handleSave = () => {
		if (!product) return;
		onSave({ ...product, name, quantity, unitPrice });
	};

	return (
		<Modal
			visible={!!product}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.modalBackdrop}>
				<View style={styles.modalSheet}>
					<View style={styles.modalHeader}>
						<Pressable onPress={onClose}>
							<Text style={styles.modalCancel}>Cancelar</Text>
						</Pressable>
						<Text style={styles.modalTitle}>Editar producto</Text>
						<Pressable onPress={handleSave}>
							<Text style={styles.modalSave}>Listo</Text>
						</Pressable>
					</View>

					<View style={styles.modalForm}>
						<InputField
							label="Nombre del producto"
							leftIcon=""
							value={name}
							onChangeText={setName}
						/>
						<View style={styles.modalRow}>
							<View style={{ flex: 1 }}>
								<InputField
									label="Cantidad"
									leftIcon=""
									value={quantity}
									onChangeText={setQuantity}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<InputField
									label="Precio unitario"
									leftIcon=""
									value={unitPrice}
									onChangeText={setUnitPrice}
									keyboardType="numeric"
								/>
							</View>
						</View>
					</View>
				</View>
			</View>
		</Modal>
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
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	ocrBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: "rgba(125,212,245,0.18)",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	ocrText: {
		color: colors.cyan,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	scroll: { flex: 1 },
	scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
	summaryCard: {
		backgroundColor: colors.navy,
		borderRadius: 16,
		padding: 16,
		gap: 8,
	},
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#E1352F",
		alignItems: "center",
		justifyContent: "center",
	},
	storeBadgeText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 11,
	},
	storeName: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	storeMeta: {
		color: "rgba(255,255,255,0.55)",
		fontFamily: typography.family.regular,
		fontSize: 11,
	},
	totalLabel: {
		color: "rgba(255,255,255,0.55)",
		fontFamily: typography.family.medium,
		fontSize: 10,
		letterSpacing: 1.3,
		marginTop: 6,
	},
	totalValue: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 28,
		lineHeight: 34,
	},
	tagsRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
	tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
	tagMuted: { backgroundColor: "rgba(255,255,255,0.12)" },
	tagCyan: { backgroundColor: colors.cyan },
	tagText: { fontFamily: typography.family.medium, fontSize: 11 },
	tagTextMuted: { color: "rgba(255,255,255,0.85)" },
	tagTextCyan: { color: colors.navy },
	sectionTitle: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 1.4,
		marginTop: 22,
		marginBottom: 8,
	},
	productsList: {
		backgroundColor: colors.card,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
	},
	productRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	productRowLast: { borderBottomWidth: 0 },
	productName: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	productMeta: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 12,
		marginTop: 2,
	},
	footer: {
		paddingHorizontal: 20,
		paddingTop: 12,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	primaryButton: {
		backgroundColor: colors.navy,
		height: 52,
		borderRadius: 10,
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
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.45)",
		justifyContent: "flex-end",
	},
	modalSheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 20,
		paddingTop: 14,
		paddingBottom: 28,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	modalCancel: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	modalTitle: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 16,
	},
	modalSave: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 14,
	},
	modalForm: { paddingTop: 18, gap: 14 },
	modalRow: { flexDirection: "row", gap: 12 },
});
