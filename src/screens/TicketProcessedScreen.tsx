import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { InputField, BottomNav, ConfirmSheet, ForgottenProductsSheet, forgottenIn, Tag, type TabKey } from "../components";
import type { RecurringProduct, TicketResponse } from "../services";
import type { Session } from "../auth/session";
import { updateTicket, deleteTicket, getRecurringProducts, offerBadge } from "../services";
import { formatCurrencyExact, formatQuantity, formatTicketTimestamp } from "../utils/format";

type Product = {
	id: number | null;
	name: string;
	quantity: number;
	unitPrice: number;
	originalPrice: number | null;
	category: string | null;
	discountAmount: number | null;
	barcode: string | null;
};

function buildProductsFromTicket(ticket: TicketResponse): Product[] {
	return ticket.items.map((item) => ({
		id: item.id ?? null,
		name: item.description,
		quantity: item.quantity,
		unitPrice: item.unitPrice,
		originalPrice: item.originalPrice,
		category: item.category,
		discountAmount: item.discountAmount,
		barcode: item.barcode,
	}));
}

type Props = {
	ticket: TicketResponse | null;
	session: Session;
	onBack: () => void;
	onFinish: () => void;
	onSelectProduct?: (productName: string, barcode: string | null) => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function TicketProcessedScreen({ ticket, session, onBack, onFinish, onSelectProduct, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const initialProducts = ticket ? buildProductsFromTicket(ticket) : [];
	const [products, setProducts] = useState<Product[]>(initialProducts);
	const [editing, setEditing] = useState<Product | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [forgotten, setForgotten] = useState<RecurringProduct[]>([]);
	const [forgottenDismissed, setForgottenDismissed] = useState(false);
	const [edited, setEdited] = useState(false);
	const [confirmDiscardVisible, setConfirmDiscardVisible] = useState(false);

	useEffect(() => {
		if (ticket) {
			setProducts(buildProductsFromTicket(ticket));
			setEdited(false);
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
	const badge = offerBadge(supermarket ?? null);
	const ticketMeta = ticket?.ticketId
		? `ID: ${ticket.ticketId}`
		: ticket?.createdAt
			? formatTicketTimestamp(ticket.createdAt)
			: "";
	const categoriesCount = ticket
		? new Set(ticket.items.map((i) => i.category).filter(Boolean)).size
		: 0;

	// Discounts are stored with the sign the receipt printed them with, so the
	// backend sums them as absolute values; mirror that or a ticket full of
	// "MERCADOPAGO 10% OF -162,49" lines reports negative savings.
	const computedSavings = products.reduce(
		(sum, p) => sum + Math.abs(p.discountAmount ?? 0),
		0,
	);
	/** What the receipt lists per line, before its discounts. */
	const computedGross = products.reduce(
		(sum, p) => sum + p.unitPrice * p.quantity,
		0,
	);
	// The label is GASTO: what the shopper actually paid, which is the printed
	// TOTAL — gross minus the discounts below it, not the sum of the lines.
	const computedTotal = computedGross - computedSavings;
	// Until something is corrected, show the figures the backend stored: those
	// come from the TOTAL printed on the receipt, which the item sum does not
	// reproduce while the OCR reads some lines gross and others net. Showing
	// the sum here would contradict the same ticket's detail screen.
	const showStored = !edited && ticket?.total != null;
	const displayTotal = showStored ? (ticket?.total as number) : computedTotal;
	const displaySavings = showStored && ticket?.totalDiscounts != null
		? ticket.totalDiscounts
		: computedSavings;
	const displayGross = showStored && ticket?.subtotal != null
		? ticket.subtotal
		: computedGross;

	const handleSave = (updated: Product) => {
		setProducts((curr) =>
			curr.map((p) => (p.id === updated.id ? updated : p)),
		);
		setEdited(true);
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

	const performDiscard = async () => {
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

	const handleDiscard = () => setConfirmDiscardVisible(true);

	return (
		<View style={styles.safeArea}>
			<View style={[styles.statusBarBg, { height: insets.top }]} />
			<StatusBar style="light" translucent />

			<View style={styles.header}>
				<Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
					<Ionicons name="chevron-back" size={22} color={colors.buttonText} />
				</Pressable>
				<Text style={styles.headerTitle}>Ticket procesado</Text>
				{isFailed ? (
					<View style={styles.failedBadge}>
						<Ionicons name="alert-circle" size={12} color={colors.orange} />
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
						<Ionicons name="warning-outline" size={18} color={colors.orange} />
						<Text style={styles.failedBannerText}>
							No se pudo procesar este ticket. Reintentá escaneando nuevamente.
						</Text>
					</View>
				)}

				<View style={styles.summaryCard}>
					<View style={styles.summaryHeader}>
						<View style={[styles.storeBadge, { backgroundColor: badge.color }]}>
							<Text style={styles.storeBadgeText}>{badge.badge}</Text>
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
						{formatCurrencyExact(displayTotal)}
					</Text>
					<View style={styles.tagsRow}>
						<Tag text={`Productos ${products.length}`} />
						<Tag text={`Categorías ${categoriesCount}`} />
						{displaySavings > 0 && displayGross > 0 && (
							<Tag
								text={`${((displaySavings / displayGross) * 100).toFixed(1).replace(".", ",")}% ahorrado`}
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
								if (onSelectProduct) onSelectProduct(p.name, p.barcode);
								else if (!isLocked) setEditing(p);
							}}
						>
							<View style={{ flex: 1 }}>
								<View style={styles.productNameRow}>
									<Text style={styles.productName}>{p.name}</Text>
									{p.discountAmount != null && p.discountAmount > 0 && (
										<View style={styles.savingsChip}>
											<Text style={styles.savingsChipText}>
												Ahorraste {formatCurrencyExact(p.discountAmount)}
											</Text>
										</View>
									)}
								</View>
								<View style={styles.priceRow}>
									<Text style={styles.productMeta}>
										{formatQuantity(p.quantity)} · {formatCurrencyExact(p.unitPrice)}
									</Text>
									{p.discountAmount != null && p.discountAmount > 0
										&& p.originalPrice != null && p.originalPrice > p.unitPrice && (
										<Text style={styles.originalPrice}>{formatCurrencyExact(p.originalPrice / p.quantity)}</Text>
									)}
								</View>
							</View>
							<Pressable
								hitSlop={8}
								disabled={isLocked}
								onPress={(e) => { e.stopPropagation(); if (!isLocked) setEditing(p); }}
								accessibilityRole="button"
								accessibilityLabel={isLocked ? "Producto bloqueado" : "Editar producto"}
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
					<Ionicons name="lock-closed" size={15} color={colors.mutedText2} />
					<Text style={styles.lockedText}>Ticket confirmado — ya no se puede modificar</Text>
				</View>
			)}

			{!isFailed && !isLocked && (
				<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
					<Text style={styles.confirmHint}>
						Después de confirmar no vas a poder editar los productos.
					</Text>
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
						onPress={handleDiscard}
						disabled={deleting}
						accessibilityRole="button"
						accessibilityLabel="Descartar ticket"
					>
						<Ionicons name="trash-outline" size={16} color={colors.danger} />
						<Text style={styles.cancelText}>
							{deleting ? "Descartando..." : "Descartar ticket"}
						</Text>
					</Pressable>
				</View>
			)}

			<EditProductSheet
				product={editing}
				onClose={() => setEditing(null)}
				onSave={handleSave}
				styles={styles}
			/>

			<ForgottenProductsSheet
				products={forgotten}
				visible={forgotten.length > 0 && !forgottenDismissed}
				onClose={() => setForgottenDismissed(true)}
			/>

			<DiscardConfirmSheet
				visible={confirmDiscardVisible}
				onCancel={() => setConfirmDiscardVisible(false)}
				onConfirm={() => {
					setConfirmDiscardVisible(false);
					performDiscard();
				}}
				styles={styles}
			/>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

/** Same branded confirm-sheet shape as LogoutConfirmScreen/ConfirmRedeemScreen,
 * instead of a bare native Alert — this is the one moment the user is about
 * to lose scanned ticket data, and every other confirm-before-loss moment in
 * the app looks like this, not like an OS dialog. */
function DiscardConfirmSheet({
	visible,
	onCancel,
	onConfirm,
	styles,
}: {
	visible: boolean;
	onCancel: () => void;
	onConfirm: () => void;
	styles: ReturnType<typeof createStyles>;
}) {
	return (
		<Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
			<View style={styles.discardBackdrop}>
				<ConfirmSheet
					icon="trash-outline"
					iconTone="danger"
					title="¿Descartar este ticket?"
					subtitle="Se borra de tu historial y no lo vas a poder recuperar."
					confirmLabel="Descartar"
					confirmTone="danger"
					onConfirm={onConfirm}
					cancelLabel="Seguir editando"
					onCancel={onCancel}
				/>
			</View>
		</Modal>
	);
}

function EditProductSheet({
	product,
	onClose,
	onSave,
	styles,
}: {
	product: Product | null;
	onClose: () => void;
	onSave: (p: Product) => void;
	styles: ReturnType<typeof createStyles>;
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
			<KeyboardAvoidingView
				style={styles.modalBackdrop}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
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
							value={name}
							onChangeText={setName}
						/>
						<View style={styles.modalRow}>
							<View style={{ flex: 1 }}>
								<InputField
									label="Cantidad"
									value={quantity}
									onChangeText={setQuantity}
									keyboardType="numeric"
								/>
							</View>
							<View style={{ flex: 1 }}>
								<InputField
									label="Precio unitario"
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
									<Text style={styles.readOnlyText}>Precio original: {formatCurrencyExact(product.originalPrice)}</Text>
								)}
								{product.discountAmount != null && product.discountAmount > 0 && (
									<Text style={styles.readOnlyText}>Descuento: {formatCurrencyExact(product.discountAmount)}</Text>
								)}
							</View>
						)}
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	statusBarBg: { backgroundColor: colors.navy },
	header: {
		backgroundColor: colors.navy,
		paddingHorizontal: space.md,
		paddingTop: space.sm,
		paddingBottom: space.lg,
		flexDirection: "row",
		alignItems: "center",
		gap: space.sm,
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
		color: colors.orange,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	failedBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: colors.dangerSoft,
		borderRadius: 12,
		padding: 14,
		marginBottom: space.md,
	},
	failedBannerText: {
		flex: 1,
		color: colors.dangerSoftText,
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	scroll: { flex: 1 },
	scrollContent: { paddingHorizontal: space.xl, paddingTop: 18, paddingBottom: space.xxl },
	summaryCard: {
		backgroundColor: colors.navy,
		borderRadius: 16,
		padding: space.lg,
		gap: space.sm,
	},
	summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
	storeBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
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
	tagsRow: { flexDirection: "row", gap: 6, marginTop: space.sm, flexWrap: "wrap" },
	sectionTitle: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 11,
		letterSpacing: 1.4,
		marginTop: 22,
		marginBottom: space.sm,
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
		paddingHorizontal: space.lg,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	productRowLast: { borderBottomWidth: 0 },
	productNameRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.sm,
		flexWrap: "wrap",
	},
	productName: {
		color: colors.defaultText,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	savingsChip: {
		backgroundColor: colors.successSoft,
		paddingHorizontal: space.sm,
		paddingVertical: 2,
		borderRadius: 999,
	},
	savingsChipText: {
		color: colors.successSoftText,
		fontFamily: typography.family.medium,
		fontSize: 11,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: space.sm,
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
		paddingHorizontal: space.xl,
		paddingTop: space.md,
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
		gap: space.sm,
	},
	primaryButtonText: {
		color: colors.buttonText,
		fontFamily: typography.family.medium,
		fontSize: 15,
	},
	confirmHint: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 12,
		textAlign: "center",
	},
	cancelButton: {
		height: 44,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 6,
		borderWidth: 1,
		borderColor: colors.danger,
	},
	cancelText: {
		color: colors.danger,
		fontFamily: typography.family.medium,
		fontSize: 14,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(15,23,42,0.45)",
		justifyContent: "flex-end",
	},
	discardBackdrop: { flex: 1, backgroundColor: "rgba(10,31,68,0.7)", justifyContent: "center", paddingHorizontal: space.xxl },
	lockedBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		paddingTop: space.md,
		paddingHorizontal: space.xl,
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.divider,
	},
	lockedText: {
		color: colors.mutedText2,
		fontFamily: typography.family.medium,
		fontSize: 13,
	},
	modalSheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: space.xl,
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
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 14,
	},
	modalForm: { paddingTop: 18, gap: 14 },
	modalRow: { flexDirection: "row", gap: space.md },
	readOnlyInfo: {
		backgroundColor: colors.softNavy,
		borderRadius: 8,
		padding: space.md,
		gap: space.xs,
	},
	readOnlyText: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
	},
	});
}
