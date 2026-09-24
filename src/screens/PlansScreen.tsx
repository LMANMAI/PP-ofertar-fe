import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import { BottomNav, ScreenHeader, type TabKey, InlineNotice } from "../components";
import { FREE_TICKETS_PER_MONTH, PREMIUM_PRICE_ARS, PREMIUM_TICKETS_PER_MONTH } from "../data/plans";

type Props = { onBack: () => void; activeTab: TabKey; onSelectTab: (t: TabKey) => void; onScanPress: () => void };

type Plan = {
	id: string;
	name: string;
	price: string;
	period: string;
	features: string[];
	upcoming?: boolean;
};

const PLANS: Plan[] = [
	{
		id: "free",
		name: "Gratis",
		price: "$0",
		period: "sin costo",
		features: [`${FREE_TICKETS_PER_MONTH} tickets por mes`, "Con anuncios"],
	},
	{
		id: "premium",
		name: "Premium",
		price: `$${PREMIUM_PRICE_ARS.toLocaleString("es-AR")}`,
		period: "por mes",
		features: [`${PREMIUM_TICKETS_PER_MONTH} tickets por mes`, "Sin anuncios"],
		upcoming: true,
	},
];

export function PlansScreen({ onBack, activeTab, onSelectTab, onScanPress }: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Planes" onBack={onBack} />

			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.intro}>
					<Text style={styles.title} accessibilityRole="header">Así van a ser los planes</Text>
					<Text style={styles.subtitle}>
						Elegí cuánto escanear al mes y si querés ver anuncios. Los precios son en pesos argentinos.
					</Text>
				</View>

				<InlineNotice
					variant="info"
					live
					message="Todavía no se cobra nada: los límites de tickets y los anuncios de cada plan no están activos. Por ahora usás OfertAR sin costo."
				/>

				{PLANS.map((plan) => (
					<View
						key={plan.id}
						style={[styles.planCard, plan.upcoming && styles.planCardHighlight]}
						accessible
						accessibilityLabel={[
							`Plan ${plan.name}`,
							`${plan.price} ${plan.period}`,
							...plan.features,
							plan.upcoming ? "Próximamente" : null,
						]
							.filter(Boolean)
							.join(", ")}
					>
						<View style={styles.planHeader}>
							<Text style={styles.planName}>{plan.name}</Text>
							{plan.upcoming && (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>Próximamente</Text>
								</View>
							)}
						</View>

						<View style={styles.priceRow}>
							<Text style={styles.price}>{plan.price}</Text>
							<Text style={styles.period}>{plan.period}</Text>
						</View>

						<View style={styles.features}>
							{plan.features.map((feature) => (
								<View key={feature} style={styles.featureRow}>
									<Ionicons name="checkmark-circle" size={18} color={colors.successSoftText} />
									<Text style={styles.featureText}>{feature}</Text>
								</View>
							))}
						</View>
					</View>
				))}
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
		content: {
			padding: space.lg,
			gap: space.mdPlus,
			width: "100%",
			maxWidth: 640,
			alignSelf: "center",
		},
		intro: { gap: space.xsPlus, paddingBottom: space.xs },
		title: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.h2,
			lineHeight: typography.lineHeights.h2,
		},
		subtitle: {
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
		planCard: {
			backgroundColor: colors.card,
			borderRadius: radii.lg,
			borderWidth: 1,
			borderColor: colors.divider,
			padding: space.xl,
			gap: space.md,
		},
		// The plan that is not available yet is the one drawn with weight, so the
		// edge carries the action color: navy in light, cyan in dark.
		planCardHighlight: { borderWidth: 2, borderColor: colors.actionFill },
		planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
		planName: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.subtitle,
			lineHeight: typography.lineHeights.subtitle,
		},
		badge: {
			backgroundColor: colors.infoSoft,
			borderRadius: radii.full,
			paddingHorizontal: space.md,
			paddingVertical: space.xs,
		},
		badgeText: {
			color: colors.infoSoftText,
			fontFamily: typography.family.medium,
			fontSize: typography.sizes.micro,
			lineHeight: typography.lineHeights.micro,
		},
		priceRow: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
		price: {
			color: colors.defaultText,
			fontFamily: typography.family.bold,
			fontSize: typography.sizes.h1,
			lineHeight: typography.lineHeights.h1,
		},
		period: {
			color: colors.mutedText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.label,
			lineHeight: typography.lineHeights.label,
		},
		features: { gap: space.sm, paddingTop: space.xs },
		featureRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
		featureText: {
			flex: 1,
			color: colors.defaultText,
			fontFamily: typography.family.regular,
			fontSize: typography.sizes.body,
			lineHeight: typography.lineHeights.body,
		},
	});
}
