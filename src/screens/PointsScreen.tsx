import { useEffect, useMemo, useState } from "react";
import {
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BottomNav, ScreenHeader, type TabKey, PrimaryButton } from "../components";
import { radii, space, typography, useThemeColors, type ColorTokens, isFocused, focusRing } from "../theme/designSystem";
import { REWARDS, POINTS_REFERRED_SIGNUP, POINTS_REFERRER_ACTIVATION } from "../data/rewards";
import type { Session } from "../auth/session";


type Props = {
	session: Session;
	pointsBalance: number;
	onBack: () => void;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onSelectReward: (rewardId: string) => void;
	onShowHistory: () => void;
};

type CopyStatus = "idle" | "copied" | "failed";

const SORTED_REWARDS = [...REWARDS].sort((a, b) => a.points - b.points);

export function PointsScreen({
	session,
	pointsBalance,
	onBack,
	activeTab,
	onSelectTab,
	onScanPress,
	onSelectReward,
	onShowHistory,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
	// Only the code the backend issued: an accounts created before referrals
	// existed can lack one, and a code invented here is silently ignored when
	// the invited friend types it at signup.
	const referralCode = session.user.referralCode || null;

	const nextReward = SORTED_REWARDS.find((r) => r.points > pointsBalance);
	const progressToNext = nextReward
		? Math.min(100, Math.round((pointsBalance / nextReward.points) * 100))
		: 100;
	const remainingToNext = nextReward ? nextReward.points - pointsBalance : 0;

	// Ahora que el backend persiste el referido (columna referral_code + tabla
	// de puntos), sí podemos avisarle a quien comparte que alguien usó su
	// código. Las dos puntas ganan distinto a propósito: quien se registra
	// gana un puntaje fijo de bienvenida, y quien invita gana más pero recién
	// cuando ese amigo activa la cuenta de verdad (primer ticket escaneado) —
	// así "referí y ganá" deja de depender de altas fantasma. Ver /points/history.

	const handleShare = () => {
		if (!referralCode) return;
		const message = `Te invito a probar OfertAR, la app para ahorrar en el súper. Usá mi código ${referralCode} cuando te registres y arrancás con ${POINTS_REFERRED_SIGNUP} puntos.`;
		Share.share({ message }).catch(() => {});
	};

	const handleCopy = async () => {
		if (!referralCode) return;
		try {
			await Clipboard.setStringAsync(referralCode);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("failed");
		}
	};

	// Cleared with the screen, so it cannot set state after leaving it.
	useEffect(() => {
		if (copyStatus === "idle") return;
		const id = setTimeout(() => setCopyStatus("idle"), 2500);
		return () => clearTimeout(id);
	}, [copyStatus]);

	return (
		<View style={styles.safeArea}>
			<ScreenHeader
				title="Mis puntos"
				onBack={onBack}
			/>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.balanceCard}>
					<Text style={styles.balanceLabel}>PUNTOS POR REFERIR</Text>
					<Text style={styles.balanceValue}>
						{pointsBalance.toLocaleString("es-AR")} pts
					</Text>
					{nextReward ? (
						<>
							<View style={styles.progressRow}>
								<Text style={styles.progressLabel}>
									Próxima recompensa: {nextReward.title}
								</Text>
								<Text style={styles.progressValue}>
									Faltan {remainingToNext} pts
								</Text>
							</View>
							<View
								style={styles.progressTrack}
								accessible
								accessibilityRole="progressbar"
								accessibilityLabel={`Progreso hacia ${nextReward.title}`}
								accessibilityValue={{ min: 0, max: 100, now: progressToNext }}
							>
								<View style={[styles.progressFill, { width: `${progressToNext}%` }]} />
							</View>
						</>
					) : (
						<Text style={styles.progressLabel}>
							Ya desbloqueaste todas las recompensas disponibles.
						</Text>
					)}
				</View>

				<View style={styles.referralCard}>
					<View style={styles.referralHeader}>
						<Ionicons name="people" size={20} color={colors.cyan} />
						<Text style={styles.referralTitle} accessibilityRole="header">Referí y ganá</Text>
					</View>
					<Text style={styles.referralBody}>
						Tu amigo arranca con {POINTS_REFERRED_SIGNUP} puntos apenas se
						registra con tu código. Vos ganás {POINTS_REFERRER_ACTIVATION} cuando
						escanea su primer ticket, y más todavía si sigue usando la app.
					</Text>
					{referralCode ? (
						<>
							<Pressable
								style={(state) => [styles.codeBox, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								onPress={handleCopy}
								accessibilityRole="button"
								accessibilityLabel={`Copiar código de referido ${referralCode}`}
							>
								<Text style={styles.codeText}>{referralCode}</Text>
								<Ionicons
									name={copyStatus === "copied" ? "checkmark" : "copy-outline"}
									size={16}
									color={copyStatus === "copied" ? colors.success : colors.defaultText}
								/>
							</Pressable>
							{copyStatus !== "idle" && (
								<Text
									style={[styles.copyStatus, copyStatus === "failed" && styles.copyStatusFailed]}
									accessibilityLiveRegion="polite"
								>
									{copyStatus === "copied" ? "Código copiado" : "No pudimos copiar el código"}
								</Text>
							)}
							<PrimaryButton label="Compartir código" accessibilityLabel="Compartir código de referido" onPress={handleShare} icon="share-social-outline" size="medium" />
						</>
					) : (
						<Text style={styles.referralBody}>Tu código de invitación todavía no está disponible.</Text>
					)}
				</View>

				<Pressable
					style={(state) => [styles.quickItem, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
					onPress={onShowHistory}
					accessibilityRole="button"
					accessibilityLabel="Ver historial de puntos"
				>
					<Ionicons name="time-outline" size={20} color={colors.defaultText} />
					<Text style={styles.quickText}>Ver historial de puntos</Text>
					<Ionicons name="chevron-forward" size={16} color={colors.subtleText} />
				</Pressable>

				<Text style={styles.sectionTitle} accessibilityRole="header">CANJEÁ TUS PUNTOS</Text>

				<View style={styles.rewardsGrid}>
					{SORTED_REWARDS.map((r) => {
						const locked = pointsBalance < r.points;
						return (
							<Pressable
								key={r.id}
								style={(state) => [
										styles.rewardCard,
										locked && styles.rewardCardLocked,
										state.pressed && styles.pressed,
										isFocused(state) && styles.focusRing,
									]}
									onPress={() => onSelectReward(r.id)}
									accessibilityRole="button"
									accessibilityLabel={`${r.title}, ${r.points.toLocaleString("es-AR")} puntos, ${
										locked
											? `te faltan ${(r.points - pointsBalance).toLocaleString("es-AR")} puntos`
											: "podés canjearla"
									}`}
							>
								<Ionicons
									name={locked ? "lock-closed-outline" : r.icon}
									size={24}
									color={locked ? colors.mutedText : colors.infoSoftText}
								/>
								<Text style={[styles.rewardTitle, locked && { color: colors.mutedText }]}>
									{r.title}
								</Text>
								<View style={styles.rewardFooter}>
									<View
										style={[
											styles.rewardPointsBadge,
											locked && styles.rewardPointsBadgeLocked,
										]}
									>
										<Text
											style={[
												styles.rewardPointsText,
												locked && { color: colors.defaultText },
											]}
										>
											{r.points.toLocaleString("es-AR")} pts
										</Text>
									</View>
									<Ionicons
										name="arrow-forward"
										size={14}
										color={locked ? colors.mutedText : colors.infoSoftText}
									/>
								</View>
							</Pressable>
						);
					})}
				</View>
			</ScrollView>

			<View
				style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}
			>
				<BottomNav
					active={activeTab}
					onSelect={onSelectTab}
					onScanPress={onScanPress}
				/>
			</View>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	return StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	scrollContent: { padding: space.lg, gap: space.mdPlus, width: "100%", maxWidth: 640, alignSelf: "center" },
	balanceCard: {
		backgroundColor: colors.navy,
		borderRadius: radii.lg,
			padding: space.xl,
			gap: space.sm,
			// Navy on the dark page is ~1.1:1, so the edge is drawn.
			borderWidth: 1,
			borderColor: colors.navyHairline,
			shadowColor: colors.navy,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.35,
		shadowRadius: 24,
		elevation: 6,
	},
	balanceLabel: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: typography.sizes.micro, letterSpacing: 1.2 },
		balanceValue: { color: colors.buttonText, fontFamily: typography.family.bold, fontSize: typography.sizes.h1, lineHeight: typography.lineHeights.h1 },
	progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.sm, gap: space.sm },
	progressLabel: { flex: 1, color: colors.navyMutedText, fontFamily: typography.family.regular, fontSize: typography.sizes.caption },
	progressValue: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	progressTrack: { height: 6, backgroundColor: colors.navyHairline, borderRadius: radii.full, overflow: "hidden", marginTop: space.xsPlus },
	progressFill: { height: 6, backgroundColor: colors.cyan, borderRadius: radii.full },
	referralCard: {
		backgroundColor: colors.card,
		borderRadius: radii.lg,
			padding: space.xl,
			gap: space.smPlus,
		borderWidth: 1,
		borderColor: colors.divider,
	},
	referralHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
	referralTitle: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.subtitle },
	referralBody: { color: colors.mutedText2, fontFamily: typography.family.regular, fontSize: typography.sizes.caption, lineHeight: typography.lineHeights.caption },
		codeBox: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: space.sm,
		backgroundColor: colors.softNavy,
			borderRadius: radii.md,
			minHeight: 44,
			paddingVertical: space.md,
	},
	codeText: { color: colors.defaultText, fontFamily: typography.family.bold, fontSize: typography.sizes.body, letterSpacing: 0.5 },
	quickItem: { flexDirection: "row", alignItems: "center", gap: space.smPlus, backgroundColor: colors.card, borderRadius: radii.md, minHeight: 48, paddingVertical: space.mdPlus, paddingHorizontal: space.mdPlus, borderWidth: 1, borderColor: colors.divider },
	quickText: { flex: 1, color: colors.defaultText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption },
	sectionTitle: { color: colors.subtleText, fontFamily: typography.family.medium, fontSize: typography.sizes.micro, letterSpacing: 1.2, marginTop: space.xs },
	rewardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
	// No flexGrow: with three cards the last one used to stretch to a full row.
		rewardCard: { flexBasis: "47.5%", flexGrow: 0, backgroundColor: colors.infoSoft, borderRadius: radii.lg, padding: space.mdPlus, gap: space.xsPlus, minHeight: 110 },
	rewardCardLocked: { backgroundColor: colors.softWarm },
	rewardTitle: { color: colors.infoSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, marginTop: 2 },
	rewardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: space.xsPlus },
	rewardPointsBadge: { backgroundColor: colors.navy, paddingHorizontal: space.smPlus, paddingVertical: space.xsPlus, borderRadius: radii.sm },
	rewardPointsBadgeLocked: { backgroundColor: colors.divider },
	rewardPointsText: { color: colors.cyan, fontFamily: typography.family.medium, fontSize: typography.sizes.micro },
			copyStatus: { color: colors.successSoftText, fontFamily: typography.family.medium, fontSize: typography.sizes.caption, textAlign: "center" },
		copyStatusFailed: { color: colors.dangerSoftText },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		});
}
