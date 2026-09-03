import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { BottomNav, ScreenHeader, type TabKey } from "../components";

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

export function PaymentMethodsScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Métodos de pago" onBack={onBack} />

			<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
				<View style={styles.emptyWrap}>
					<View style={styles.emptyIconWrap}>
						<Ionicons name="card-outline" size={32} color={colors.subtleText} />
					</View>
					<Text style={styles.emptyTitle}>Todavía no hay métodos de pago</Text>
					<Text style={styles.emptyBody}>
						OfertAR todavía no cobra ninguna suscripción, así que no hay nada que
						guardar acá por ahora. Esta pantalla es una vista previa de cómo se
						va a ver cuando esa función esté disponible.
					</Text>
				</View>
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
	emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, paddingTop: 40 },
	emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.softWarm, alignItems: "center", justifyContent: "center", marginBottom: 4 },
	emptyTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: 16, textAlign: "center" },
	emptyBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: 13, lineHeight: 19, textAlign: "center" },
	});
}
