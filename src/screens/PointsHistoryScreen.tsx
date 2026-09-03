import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { BottomNav, EmptyState, ScreenHeader, type TabKey } from "../components";

type IonName = ComponentProps<typeof Ionicons>["name"];

export type PointsHistoryEntry = {
	id: string;
	icon: IonName;
	title: string;
	date: string;
	pts: number;
};

type Props = {
	entries: PointsHistoryEntry[];
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
};

export function PointsHistoryScreen({ entries, onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const earned = entries.filter((e) => e.pts > 0).reduce((sum, e) => sum + e.pts, 0);
	const spent = entries.filter((e) => e.pts < 0).reduce((sum, e) => sum + e.pts, 0);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Historial de puntos" onBack={onBack} />
			<ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
				<View style={styles.summary}>
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>SUMADOS</Text>
						<Text style={[styles.summaryValue, { color: colors.success }]}>
							+{earned.toLocaleString("es-AR")} pts
						</Text>
					</View>
					<View style={styles.summaryDivider} />
					<View style={styles.summaryItem}>
						<Text style={styles.summaryLabel}>USADOS</Text>
						<Text style={[styles.summaryValue, { color: colors.danger }]}>
							{spent.toLocaleString("es-AR")} pts
						</Text>
					</View>
				</View>

				{entries.length === 0 ? (
					<EmptyState
						icon="people-outline"
						title="Todavía no ganaste puntos"
						hint="Compartí tu código de referido para empezar a sumar."
					/>
				) : (
					<View style={styles.list}>
						{entries.map((e, idx) => {
							const positive = e.pts > 0;
							return (
								<View key={e.id}>
									<View style={styles.row}>
										<View
											style={[
												styles.iconWrap,
												{ backgroundColor: positive ? colors.successSoft : colors.dangerSoft },
											]}
										>
											<Ionicons
												name={e.icon}
												size={18}
												color={positive ? colors.successSoftText : colors.dangerSoftText}
											/>
										</View>
										<View style={{ flex: 1 }}>
											<Text style={styles.rowTitle}>{e.title}</Text>
											<Text style={styles.rowDate}>{e.date}</Text>
										</View>
										<Text
											style={[
												styles.pts,
												positive ? styles.ptsGreen : styles.ptsRed,
											]}
										>
											{positive ? "+" : ""}
											{e.pts.toLocaleString("es-AR")}
										</Text>
									</View>
									{idx < entries.length - 1 && <View style={styles.divider} />}
								</View>
							);
						})}
					</View>
				)}
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	summary: { backgroundColor: colors.card, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" },
	summaryItem: { flex: 1, alignItems: "center", gap: 4 },
	summaryDivider: { width: 1, height: 32, backgroundColor: colors.divider },
	summaryLabel: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: 10, letterSpacing: 1 },
	summaryValue: { fontFamily: typography.family.bold, fontSize: 16 },
	list: { backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
	iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	rowTitle: { color: colors.defaultText, fontFamily: typography.family.medium, fontSize: 14 },
	rowDate: { color: colors.subtleText, fontFamily: typography.family.regular, fontSize: 12, marginTop: 2 },
	pts: { fontFamily: typography.family.bold, fontSize: 14 },
	ptsGreen: { color: colors.success },
	ptsRed: { color: colors.danger },
	divider: { height: 1, backgroundColor: colors.divider, marginLeft: 62 },
	});
}
