import { useEffect, useState } from "react";
import {
	Alert,
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
import { InputField, BottomNav, ForgottenProductsSheet, forgottenIn, type TabKey } from "../components";
import type { RecurringProduct, TicketResponse } from "../services";
import type { Session } from "../auth/session";
import { updateTicket, deleteTicket, getRecurringProducts } from "../services";

/** Only nag about products bought on at least this many separate shopping
 * trips — one-off purchases aren't a habit worth reminding about. */

type Product = {
	id: number | null;
	name: string;
	quantity: number;
	unitPrice: number;
	originalPrice: number | null;
	category: string | null;
	discountAmount: number | null;
};

function formatCurrency(value: number | null): string {
	if (value == null) return "$0,00";
	return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// A whole number is units; a fraction only ever comes from a line the
// supermarket weighed, so it reads as kilos rather than "0,52 u".
function formatQuantity(value: number | null | undefined): string {
	if (value == null) return "1 u";
	if (Number.isInteger(value)) return `${value} u`;
	return `${value.toLocaleString("es-AR", { maximumFractionDigits: 3 })} kg`;
}

function buildProductsFromTicket(ticket: TicketResponse): Product[] {
	return ticket.items.map((item) => ({
		id: item.id ?? null,
		name: item.description,
		quantity: item.quantity,
		unitPrice: item.unitPrice,
		originalPrice: item.originalPrice,
		category: item.category,
		discountAmount: item.discountAmount,
	}));
}

type Props = {
	ticket: TicketResponse | null;
	session: Session;
	onBack: () => void;
	onFinish: () => void;
	onSelectProduct?: (productName: string) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function TicketProcessedScreen({ ticket, session, onBack, onFinish, onSelectProduct, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const initialProducts = ticket ? buildProductsFromTicket(ticket) : [];
	const [products, setProducts] = useState<Product[]>(initialProducts);
	const [editing, setEditing] = useState<Product | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [forgotten, setForgotten] = useState<RecurringProduct[]>([]);
	const [forgottenDismissed, setForgottenDismissed] = useState(false);

	useEffect(() => {
		if (ticket) {
			setProducts(buildProductsFromTicket(ticket));
		}
	}, [ticket]);

	useEffect(() => {
		if (!ticket || ticket.status !== "PROCESSED") return;
		setForgottenDismissed(false);
		getRecurringProducts(session.token, ticket.id)
			.then((all) => {
				setForgotten(forgottenIn(all));
			})
			.catch(() => setForgotten([]));
	}, [ticket, session.token]);

	const isFailed = ticket?.status === "FAILED";
	// Corrections are allowed only on the first visit after processing; once
	// confirmed the ticket feeds savings history and stops being editable.
	const isLocked = ticket?.reviewed === true;
	const supermarket = ticket?.storeName?.trim();
	const storeDisplay = supermarket || "Ticket escaneado";
	const storeBadge = (supermarket || "TI").slice(0, 2).toUpperCase();
	const ticketMeta = ticket?.ticketId
		? `ID: ${ticket.ticketId}`
		: ticket?.createdAt
			? new Date(ticket.createdAt).toLocaleDateString("es-AR", {
				day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
			})
			: "";
	const categoriesCount = ticket
		? new Set(ticket.items.map((i) => i.category).filter(Boolean)).size
		: 0;

	const computedSavings = products.reduce(
		(sum, p) => sum + (p.discountAmount ?? 0),
		0,
	);
	const computedTotal = products.reduce(
		(sum, p) => sum + p.unitPrice * p.quantity,
		0,
	);

	const handleSave = (updated: Product) => {
		setProducts((curr) =>
			curr.map((p) => (p.id === updated.id ? updated : p)),
		);
		setEditing(null);
	};

	const handleConfirm = async () => {
		if (!ticket) return;
		setSaving(true);
		try {
			const updatedItems = products.map((p) => ({
				id: p.id ?? undefined,
				description: p.name,
				quantity: p.quantity,
				unitPrice: p.unitPrice,
				originalPrice: p.originalPrice ?? undefined,
				discountAmount: p.discountAmount ?? undefined,
			}));

			await updateTicket(session.token, ticket.id, { items: updatedItems });
			onFinish();
		} catch (error) {
			Alert.alert(
				"Error",
				error instanceof Error ? error.message : "No se pudo guardar el ticket",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = async () => {
		if (!ticket) return;
		setDeleting(true);
		try {
			await deleteTicket(session.token, ticket.id);
			onBack();
		} catch (error) {
			Alert.alert(
				"Error",
				error instanceof Error ? error.message : "No se pudo eliminar el ticket",
			);
		} finally {
			setDeleting(false);
		}
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
				{isFailed ? (
					<View style={styles.failedBadge}>
						<Ionicons name="alert-circle" size={12} color="#E76F51" />
						<Text style={styles.failedText}>Error</Text>
					</View>
				) : (
					<View style={styles.ocrBadge}>
						<Ionicons name="checkmark-circle" size={12} color={colors.cyan} />
						<Text style={styles.ocrText}>OCR completo</Text>
					</View>
				)}
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{isFailed && (
					<View style={styles.failedBanner}>
						<Ionicons name="warning-outline" size={18} color="#E76F51" />
						<Text style={styles.failedBannerText}>
							No se pudo procesar este ticket. Reintentá escaneando nuevamente.
						</Text>
					</View>
				)}

				<View style={styles.summaryCard}>
					<View style={styles.summaryHeader}>
						<View style={[styles.storeBadge, supermarket ? undefined : { backgroundColor: "#5C6B84" }]}>
							<Text style={styles.storeBadgeText}>{storeBadge}</Text>
						</View>
						<View style={{ flex: 1 }}>
							<Text style={styles.storeName}>{storeDisplay}</Text>
							{ticketMeta ? (
								<Text style={styles.storeMeta}>{ticketMeta}</Text>
							) : null}
						</View>
					</View>
					<Text style={styles.totalLabel}>GASTO</Text>
					<Text style={styles.totalValue}>
						{formatCurrency(computedTotal)}
					</Text>
					<View style={styles.tagsRow}>
						<Tag text={`Productos ${products.length}`} />
						<Tag text={`Categorías ${categoriesCount}`} />
						{computedSavings > 0 && computedTotal > 0 && (
							<Tag
								text={`${((computedSavings / (computedTotal + computedSavings)) * 100).toFixed(1).replace(".", ",")}% ahorrado`}
								tone="cyan"
							/>
						)}
					</View>
				</View>

				<Text style={styles.sectionTitle}>PRODUCTOS ESCANEADOS</Text>
				<View style={styles.productsList}>
					{products.map((p, idx) => (
						<Pressable
							key={`${p.id ?? idx}`}
							style={[
								styles.productRow,
								idx === products.length - 1 && styles.productRowLast,
							]}
							onPress={() => {
								if (onSelectProduct) onSelectProduct(p.name);
								else if (!isLocked) setEditing(p);
							}}
						>
							<View style={{ flex: 1 }}>
								<View style={styles.productNameRow}>
									<Text style={styles.productName}>{p.name}</Text>
									{p.discountAmount != null && p.discountAmount > 0 && (
										<View style={styles.savingsChip}>
											<Text style={styles.savingsChipText}>
												Ahorraste {formatCurrency(p.discountAmount)}
											</Text>
										</View>
									)}
								</View>
								<View style={styles.priceRow}>
									<Text style={styles.productMeta}>
										{formatQuantity(p.quantity)} · {formatCurrency(p.unitPrice)}
									</Text>
									{p.discountAmount != null && p.discountAmount > 0
										&& p.originalPrice != null && p.originalPrice > p.unitPrice && (
										<Text style={styles.originalPrice}>{formatCurrency(p.originalPrice / p.quantity)}</Text>
									)}
								</View>
							</View>
							<Pressable
								hitSlop={8}
								disabled={isLocked}
								onPress={(e) => { e.stopPropagation(); if (!isLocked) setEditing(p); }}
							>
								<Ionicons
									name={isLocked ? "lock-closed-outline" : "create-outline"}
									size={18}
									color={isLocked ? "#C7CDD4" : colors.mutedText}
								/>
							</Pressable>
						</Pressable>
					))}
				</View>
			</ScrollView>

			{isLocked && !isFailed && (
				<View style={[styles.lockedBar, { paddingBottom: insets.bottom + 12 }]}>
					<Ionicons name="lock-closed" size={15} color="#6B7280" />
					<Text style={styles.lockedText}>Ticket confirmado — ya no se puede modificar</Text>
				</View>
			)}

			{!isFailed && !isLocked && (
				<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
					<Pressable
						style={[styles.primaryButton, saving && { opacity: 0.6 }]}
						onPress={handleConfirm}
						disabled={saving}
					>
						<Ionicons name="checkmark-circle" size={18} color={colors.buttonText} />
						<Text style={styles.primaryButtonText}>
							{saving ? "Guardando..." : "Confirmar ticket"}
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.cancelButton,
							deleting && { opacity: 0.6 },
						]}
						onPress={handleCancel}
						disabled={deleting}
					>
						<Text style={styles.cancelText}>
							{deleting ? "Cancelando..." : "Cancelar"}
						</Text>
					</Pressable>
				</View>
			)}

			<EditProductSheet
				product={editing}
				onClose={() => setEditing(null)}
				onSave={handleSave}
			/>

			<ForgottenProductsSheet
				products={forgotten}
				visible={forgotten.length > 0 && !forgottenDismissed}
				onClose={() => setForgottenDismissed(true)}
			/>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
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
			setQuantity(String(product.quantity));
			setUnitPrice(String(product.unitPrice));
		}
	}, [product]);

	const handleSave = () => {
		if (!product) return;
		onSave({
			...product,
			name,
			quantity: parseFloat(quantity) || 1,
			unitPrice: parseFloat(unitPrice) || 0,
		});
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
									keyboardType="numeric"
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
						{product && (
							<View style={styles.readOnlyInfo}>
								{product.category && (
									<Text style={styles.readOnlyText}>Categoría: {product.category}</Text>
								)}
								{product.originalPrice != null && product.originalPrice > 0 && (
									<Text style={styles.readOnlyText}>Precio original: {formatCurrency(product.originalPrice)}</Text>
								)}
								{product.discountAmount != null && product.discountAmount > 0 && (
									<Text style={styles.readOnlyText}>Descuento: {formatCurrency(product.discountAmount)}</Text>
								)}
							</View>
						)}
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
	failedBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: "rgba(231,111,81,0.18)",
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
	},
	failedText: {
		color: "#E76F51",
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	failedBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: "#FEF2F2",
		borderRadius: 12,
		padding: 14,
		marginBottom: 12,
	},
	failedBannerText: {
		flex: 1,
		color: "#991B1B",
		fontFamily: typography.family.medium,
		fontSize: 13,
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
	productNameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flexWrap: "wrap",
	},
	productName: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	savingsChip: {
		backgroundColor: "#E0F5EF",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
	},
	savingsChipText: {
		color: "#15803D",
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 8,
		marginTop: 2,
	},
	productMeta: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	originalPrice: {
		textDecorationLine: "line-through",
		color: colors.mutedText,
		opacity: 0.6,
		fontFamily: typography.family.regular,
		fontSize: 12,
	},
	footer: {
		paddingHorizontal: 20,
		paddingTop: 12,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		gap: 10,
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
	cancelButton: {
		height: 44,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: colors.border,
	},
	cancelText: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.45)",
		justifyContent: "flex-end",
	},
	lockedBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingTop: 12,
		paddingHorizontal: 20,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},
	lockedText: {
		color: "#6B7280",
		fontFamily: typography.family.medium,
		fontSize: 13,
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
	readOnlyInfo: {
		backgroundColor: colors.softNavy,
		borderRadius: 8,
		padding: 12,
		gap: 4,
	},
	readOnlyText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
});
