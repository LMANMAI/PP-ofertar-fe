import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { getSavingsReport } from "../services";
import type { SavingsReportResponse } from "../services";
import type { Session } from "../auth/session";
import { BottomNav, ErrorBanner, LoadingState, ScreenHeader, type TabKey } from "../components";

function formatCurrency(value: number | null | undefined): string {
	if (value == null) return "$0";
	return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(date: Date): string {
	return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function yyyyMM(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}`;
}

type Props = {
	onBack: () => void;
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function MonthlyAnalysisScreen({ onBack, session, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const CAT_COLORS = useMemo(
		() => [colors.cyan, "#0D80CC", colors.success, "#F2B61D", colors.subtleText, colors.orange],
		[colors],
	);
	const [report, setReport] = useState<SavingsReportResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedMonth, setSelectedMonth] = useState(new Date());

	useEffect(() => {
		loadReport();
	}, [selectedMonth]);

	const loadReport = async () => {
		setLoading(true);
		setError(null);
		try {
			const monthKey = yyyyMM(selectedMonth);
			const data = await getSavingsReport(session.token, monthKey, monthKey);
			setReport(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cargar el reporte");
		} finally {
			setLoading(false);
		}
	};

	const prevMonth = () => {
		setSelectedMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
	};

	const nextMonth = () => {
		const now = new Date();
		const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
		if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) {
			setSelectedMonth(next);
		}
	};

	const savingsPct = report?.summary?.totalSavings != null
		&& report.summary.totalSavings > 0
		&& report.summary.totalSpent != null
		? ((report.summary.totalSavings / (report.summary.totalSpent + report.summary.totalSavings)) * 100)
				.toFixed(1).replace(".", ",")
		: null;

	const maxPercent = report?.byCategory?.length
		? Math.max(...report.byCategory.map((c) => c.totalDiscounts), 1)
		: 1;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Análisis mensual" onBack={onBack} />

			<View style={styles.monthSelector}>
				<Pressable onPress={prevMonth} style={styles.monthArrow} accessibilityRole="button" accessibilityLabel="Mes anterior">
					<Ionicons name="chevron-back" size={18} color={colors.defaultText} />
				</Pressable>
				<Text style={styles.monthLabel}>{formatMonth(selectedMonth)}</Text>
				<Pressable onPress={nextMonth} style={styles.monthArrow} accessibilityRole="button" accessibilityLabel="Mes siguiente">
					<Ionicons name="chevron-forward" size={18} color={colors.defaultText} />
				</Pressable>
			</View>

			{loading && <LoadingState />}

			{error && <ErrorBanner message={error} />}

			{!loading && !error && report && (
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
					<View style={styles.heroCard}>
						<Text style={styles.heroLabel}>
							GASTO TOTAL · {formatMonth(selectedMonth).toUpperCase()}
						</Text>
						<Text style={styles.heroValue}>
							{formatCurrency(report.summary.totalSpent)}
						</Text>
						<View style={styles.heroRow}>
							<Tag text={`${report.summary.ticketCount} tickets`} styles={styles} />
							{report.summary.totalSavings != null && report.summary.totalSavings > 0 && (
								<Tag text={`${formatCurrency(report.summary.totalSavings)} ahorrado`} tone="cyan" styles={styles} />
							)}
							{savingsPct && (
								<Tag text={`${savingsPct}% del total`} tone="cyan" styles={styles} />
							)}
						</View>
					</View>

					{report.byCategory.length > 0 && (
						<>
							<Text style={styles.sectionLabel}>AHORRO POR CATEGORÍA</Text>
							<View style={styles.catsCard}>
								{report.byCategory.map((c, idx) => (
									<View key={c.category} style={[styles.catRow, idx === report.byCategory.length - 1 && { borderBottomWidth: 0 }]}>
										<View style={[styles.catDot, { backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }]} />
										<View style={{ flex: 1 }}>
											<View style={styles.catHeader}>
												<Text style={styles.catName}>{c.category}</Text>
												<Text style={styles.catAmount}>{formatCurrency(c.totalDiscounts)}</Text>
											</View>
											<View style={styles.catBarTrack}>
												<View style={[styles.catBarFill, { width: `${(c.totalDiscounts / maxPercent) * 100}%`, backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }]} />
											</View>
										</View>
										<Text style={styles.catPct}>{c.itemCount} prod.</Text>
									</View>
								))}
							</View>
						</>
					)}

					{report.byStore.length > 0 && (
						<>
							<Text style={styles.sectionLabel}>AHORRO POR SUPERMERCADO</Text>
							<View style={styles.catsCard}>
								{report.byStore.map((s, idx) => (
									<View key={s.storeName} style={[styles.catRow, idx === report.byStore.length - 1 && { borderBottomWidth: 0 }]}>
										<Ionicons name="storefront-outline" size={16} color={colors.defaultText} />
										<View style={{ flex: 1 }}>
											<Text style={styles.catName}>{s.storeName}</Text>
										</View>
										<Text style={styles.catAmount}>{formatCurrency(s.totalDiscounts)}</Text>
									</View>
								))}
							</View>
						</>
					)}

					<View style={styles.highlightsRow}>
							<View style={styles.highlightPill}>
								<Ionicons name="trending-up-outline" size={16} color={colors.success} />
								<View>
									<Text style={styles.highlightValue}>
										{formatCurrency(report.summary.averageSavings)}
									</Text>
									<Text style={styles.highlightLabel}>prom. por ticket</Text>
								</View>
							</View>
							<View style={styles.highlightPill}>
								<Ionicons name="pricetags-outline" size={16} color={colors.defaultText} />
								<View>
									<Text style={styles.highlightValue}>{report.byCategory.length}</Text>
									<Text style={styles.highlightLabel}>categorías</Text>
								</View>
							</View>
						</View>
				</ScrollView>
			)}

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function Tag({ text, tone, styles }: { text: string; tone?: "cyan"; styles: ReturnType<typeof createStyles> }) {
	return (
		<View style={[styles.tag, tone === "cyan" ? styles.tagCyan : styles.tagMuted]}>
			<Text style={[styles.tagText, tone === "cyan" ? styles.tagTextCyan : styles.tagTextMuted]}>{text}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	monthSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
	monthArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
	monthLabel: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 15, textTransform: "capitalize" },
	heroCard: { backgroundColor: colors.navy, borderRadius: 16, padding: 20, gap: 8 },
	heroLabel: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	heroValue: { color: "#fff", fontFamily: typography.family.bold, fontSize: 34 },
	heroRow: { flexDirection: "row", gap: 6, marginTop: 4 },
	tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
	tagMuted: { backgroundColor: "rgba(255,255,255,0.12)" },
	tagCyan: { backgroundColor: colors.cyan },
	tagText: { fontFamily: typography.family.medium, fontSize: 11 },
	tagTextMuted: { color: "rgba(255,255,255,0.85)" },
	tagTextCyan: { color: colors.navy },
	sectionLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1.2 },
	catsCard: { backgroundColor: colors.card, borderRadius: 14, padding: 6 },
	catRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
	catDot: { width: 10, height: 10, borderRadius: 5 },
	catHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
	catName: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 13 },
	catAmount: { color: colors.mutedText2, fontFamily: typography.family.medium, fontSize: 12 },
	catBarTrack: { height: 6, backgroundColor: "#F8F9FB", borderRadius: 3, overflow: "hidden" },
	catBarFill: { height: 6, borderRadius: 3 },
	catPct: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 13, width: 54, textAlign: "right" },
	highlightsRow: {
		flexDirection: "row",
		gap: 10,
	},
	highlightPill: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: colors.card,
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	highlightValue: {
		color: colors.defaultText,
		fontFamily: typography.family.bold,
		fontSize: 15,
	},
	highlightLabel: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 11,
		marginTop: 1,
	},
	});
}
