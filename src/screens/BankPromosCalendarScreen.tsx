import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomNav, ChainMarkerPin, ErrorBanner, InlineNotice, PrimaryButton, ScreenHeader, type TabKey } from "../components";
import { PromoConditionsSheet } from "../components/PromoConditionsSheet";
import type { PromoConditions } from "../components/promoConditions";
import type { Session } from "../auth/session";
import { getBankPromosWeek, type BankPromo, type BankPromoWeek } from "../services/bankPromosApi";
import { focusRing, isFocused, radii, space, typography, useThemeColors, type ColorTokens } from "../theme/designSystem";
import {
	DAY_SHORT,
	ROLLOVER_TEXT,
	argentinaToday,
	bankPromoConditions,
	bestOfDay,
	dayChipA11y,
	dayOfMonth,
	dayTitle,
	groupByRetailer,
	issuersText,
	joinNames,
	matchChip,
	promoA11yLabel,
	promoChips,
	promoValue,
	promoWeekdays,
	requiresText,
	showsRollover,
	sortDayPromos,
	USER_ZONE,
	weekdayOf,
	type PromoChip,
	type PromoEntry,
} from "../utils/bankPromos";

type Mode = "mine" | "all";

type Props = {
	session: Session;
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onBack: () => void;
	/** A Mis tarjetas, para sumar una. */
	onAddCards: () => void;
	/** Sube cuando cambian las tarjetas o los beneficios: la semana se vuelve a pedir. */
	refreshKey: number;
	/** false si ya se sabe que no hay tarjetas: abre directo en "Todas". */
	hasPaymentMethods: boolean | null;
};

const MODES: { value: Mode; label: string }[] = [
	{ value: "mine", label: "Con mis tarjetas" },
	{ value: "all", label: "Todas" },
];

/**
 * Calendario semanal de promos bancarias (OFT-55). Semana y no mes: estas promos se repiten por
 * día de la semana, así que una grilla mensual mostraría lo mismo cuatro veces. Arriba "Con mis
 * tarjetas" o "Todas", la tira de 7 días con el mejor % de cada uno, lo mejor del día y la lista
 * por súper. Cada promo abre la misma hoja de Condiciones de las ofertas (OFT-13).
 */
export function BankPromosCalendarScreen({
	session,
	activeTab,
	onSelectTab,
	onScanPress,
	onBack,
	onAddCards,
	refreshKey,
	hasPaymentMethods,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const [mode, setMode] = useState<Mode>(hasPaymentMethods === false ? "all" : "mine");
	const [weeks, setWeeks] = useState<Partial<Record<Mode, BankPromoWeek>>>({});
	const [failed, setFailed] = useState<Mode | null>(null);
	const [attempt, setAttempt] = useState(0);
	const [noCards, setNoCards] = useState(hasPaymentMethods === false);
	const [dayIndex, setDayIndex] = useState(0);
	const [sheet, setSheet] = useState<PromoConditions | null>(null);

	// Cambiaron las tarjetas: lo pedido ya no vale. Estado derivado de props, sin efecto.
	const [seenKey, setSeenKey] = useState(refreshKey);
	if (seenKey !== refreshKey) {
		setSeenKey(refreshKey);
		setWeeks({});
	}

	useEffect(() => {
		if (weeks[mode]) return;
		let alive = true;
		getBankPromosWeek(session.token, { mine: mode === "mine", province: USER_ZONE })
			.then((week) => {
				if (!alive) return;
				setWeeks((prev) => ({ ...prev, [mode]: week }));
				setFailed(null);
				setNoCards(!week.hasPaymentMethods);
				// Sin tarjetas cargadas "Con mis tarjetas" está vacío por definición (SPEC §5).
				if (!week.hasPaymentMethods && mode === "mine") setMode("all");
			})
			.catch(() => {
				if (alive) setFailed(mode);
			});
		return () => {
			alive = false;
		};
	}, [mode, weeks, session.token, attempt]);

	const retry = useCallback(() => {
		setFailed(null);
		setAttempt((a) => a + 1);
	}, []);

	const week = weeks[mode];
	const day = week ? (week.days[dayIndex] ?? week.days[0]) : null;
	const mine = mode === "mine";
	const today = argentinaToday();

	const sorted = useMemo(() => (day ? sortDayPromos(day.promos, mine) : []), [day, mine]);
	const groups = useMemo(() => groupByRetailer(sorted), [sorted]);
	const hero = useMemo(() => bestOfDay(sorted, mine), [sorted, mine]);
	const usable = sorted.filter((p) => p.match === "match" || p.match === "all").length;

	const openEntry = useCallback(
		(entry: PromoEntry) => {
			if (!week) return;
			setSheet(bankPromoConditions(entry, promoWeekdays(week, [entry.promo.id])));
		},
		[week],
	);

	const heroEntry: PromoEntry | null = hero
		? (groups.flatMap((g) => g.entries).find((e) => e.promo.id === hero.id) ?? {
				promo: hero,
				retailers: [{ slug: hero.retailer, name: hero.retailerName }],
			})
		: null;

	const countText = noCards
		? `${sorted.length} ${sorted.length === 1 ? "promo" : "promos"} este día`
		: mine
			? `${usable} ${usable === 1 ? "promo" : "promos"} con tus tarjetas`
			: `${usable} con tus tarjetas · ${sorted.length} en total`;

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title="Promos con tus tarjetas" onBack={onBack} />

			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
				<View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Qué promos mostrar">
					{MODES.map((m) => {
						const active = mode === m.value;
						return (
							<Pressable
								key={m.value}
								onPress={() => setMode(m.value)}
								style={(state) => [styles.segmentBtn, active && styles.segmentBtnActive, isFocused(state) && styles.focusRingInset]}
								accessibilityRole="radio"
								accessibilityState={{ checked: active }}
								accessibilityLabel={m.label}
							>
								<Text style={[styles.segmentText, active && styles.segmentTextActive]}>{m.label}</Text>
							</Pressable>
						);
					})}
				</View>

				{noCards ? (
					<InlineNotice variant="info" icon="card-outline" live={false} message="Sumá tus tarjetas y te marcamos qué promos podés usar.">
						<PrimaryButton label="Agregar mis tarjetas" size="compact" icon="add" onPress={onAddCards} style={styles.noticeBtn} />
					</InlineNotice>
				) : null}

				{failed === mode ? (
					<ErrorBanner message="No pudimos cargar las promos de la semana." onRetry={retry} />
				) : !week || !day ? (
					<View style={styles.loading} accessible accessibilityLabel="Cargando las promos de la semana">
						<View style={styles.skeletonStrip} />
						<View style={styles.skeletonCard} />
						<View style={styles.skeletonCard} />
					</View>
				) : (
					<>
						<View style={styles.week} accessibilityRole="tablist" accessibilityLabel="Próximos 7 días">
							{week.days.map((d, i) => {
								const selected = i === dayIndex;
								const isToday = d.date === today;
								return (
									<Pressable
										key={d.date}
										onPress={() => setDayIndex(i)}
										style={(state) => [styles.day, selected && styles.daySelected, isFocused(state) && styles.focusRing]}
										accessibilityRole="tab"
										accessibilityState={{ selected }}
										accessibilityLabel={dayChipA11y(d.date, isToday, d.bestPercent)}
									>
										<Text style={[styles.dayName, selected && styles.dayTextSelected]}>
											{isToday ? "hoy" : DAY_SHORT[weekdayOf(d.date) - 1]}
										</Text>
										<Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>{dayOfMonth(d.date)}</Text>
										<Text style={[styles.dayPct, d.bestPercent == null && styles.dayPctNone, selected && styles.dayPctSelected]}>
											{d.bestPercent != null ? `${d.bestPercent}%` : "—"}
										</Text>
									</Pressable>
								);
							})}
						</View>

						<View style={styles.dayHead}>
							<Text style={styles.dayTitle} accessibilityRole="header">
								{dayTitle(day.date, day.date === today)}
							</Text>
							<Text style={styles.dayCount}>{countText}</Text>
						</View>

						{showsRollover(week, day.date) ? (
							<InlineNotice variant="warning" icon="calendar-outline" live={false} message={ROLLOVER_TEXT} />
						) : null}

						{heroEntry ? (
							<Pressable
								onPress={() => openEntry(heroEntry)}
								style={(state) => [styles.hero, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel={`Lo mejor del día. ${promoA11yLabel(day.date, heroEntry)}`}
								accessibilityHint="Abre las condiciones de la promo"
							>
								<Text style={styles.heroValue}>{promoValue(heroEntry.promo).big}</Text>
								<View style={styles.heroCopy}>
									<Text style={styles.heroOverline}>Lo mejor del día</Text>
									<Text style={styles.heroText} numberOfLines={2}>
										{joinNames(heroEntry.retailers.map((r) => r.name))} con {issuersText(heroEntry.promo)}
									</Text>
									{/* En "Todas" puede ser una que no es de tus tarjetas: se dice, no sólo se insinúa. */}
									{heroEntry.promo.match === "near" || heroEntry.promo.match === "none" ? (
										<Text style={styles.heroNote}>{matchChip(heroEntry.promo).text}</Text>
									) : null}
								</View>
								<Ionicons name="chevron-forward" size={18} color={colors.navyMutedText} />
							</Pressable>
						) : null}

						{sorted.length === 0 ? (
							<View style={styles.empty}>
								<Ionicons name="calendar-clear-outline" size={32} color={colors.subtleText} />
								<Text style={styles.emptyTitle}>
									{mine ? "Ninguna de tus tarjetas tiene promo este día" : "No hay promos cargadas para este día"}
								</Text>
								<Text style={styles.emptyHint}>
									{mine ? "Mirá todas las promos o sumá otra tarjeta en Mis tarjetas." : "Revisá otro día de la semana."}
								</Text>
								{mine ? (
									<PrimaryButton label="Ver todas" size="compact" onPress={() => setMode("all")} />
								) : null}
							</View>
						) : null}

						{groups.map((group) => (
							<View key={group.key} style={styles.group}>
								<View style={styles.groupHead}>
									<View style={styles.pins} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
										{group.retailers.map((r) => (
											<ChainMarkerPin key={r.slug} chainSlug={r.slug} chainName={r.name} size={22} />
										))}
									</View>
									<Text style={styles.groupTitle} accessibilityRole="header">
										{group.title}
									</Text>
								</View>
								{group.entries.map((entry) => (
									<PromoCard
										key={entry.promo.id}
										entry={entry}
										date={day.date}
										styles={styles}
										onPress={() => openEntry(entry)}
									/>
								))}
							</View>
						))}

						<Text style={styles.source}>Fuente: sitios de cada súper. Verificá las condiciones antes de pagar.</Text>
					</>
				)}
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>

			<PromoConditionsSheet conditions={sheet} onClose={() => setSheet(null)} />
		</View>
	);
}

function PromoCard({
	entry,
	date,
	styles,
	onPress,
}: {
	entry: PromoEntry;
	date: string;
	styles: ReturnType<typeof createStyles>;
	onPress: () => void;
}) {
	const p: BankPromo = entry.promo;
	const value = promoValue(p);
	const req = requiresText(p);
	return (
		<Pressable
			onPress={onPress}
			style={(state) => [styles.promo, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
			accessibilityRole="button"
			accessibilityLabel={promoA11yLabel(date, entry)}
			accessibilityHint="Abre las condiciones de la promo"
		>
			<View style={styles.promoValueCol}>
				<Text style={styles.promoBig} numberOfLines={2} adjustsFontSizeToFit>
					{value.big}
				</Text>
				{value.small ? <Text style={styles.promoSmall}>{value.small}</Text> : null}
			</View>
			<View style={styles.promoBody}>
				<Text style={styles.promoIssuer}>{issuersText(p)}</Text>
				{req ? <Text style={styles.promoSub}>{req}</Text> : null}
				<View style={styles.chips}>
					{promoChips(p).map((chip) => (
						<Chip key={chip.text} chip={chip} styles={styles} />
					))}
				</View>
			</View>
		</Pressable>
	);
}

/** Ícono + texto: el estado se lee aunque no se distingan los colores. */
function Chip({ chip, styles }: { chip: PromoChip; styles: ReturnType<typeof createStyles> }) {
	const tone = {
		ok: { box: styles.chipOk, text: styles.chipOkText },
		near: { box: styles.chipNear, text: styles.chipNearText },
		info: { box: styles.chipInfo, text: styles.chipInfoText },
		neutral: { box: styles.chipNeutral, text: styles.chipNeutralText },
	}[chip.tone];
	return (
		<View style={[styles.chip, tone.box]}>
			<Ionicons name={chip.icon} size={12} color={tone.text.color} />
			<Text style={[styles.chipText, tone.text]}>{chip.text}</Text>
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights, family } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		content: { padding: space.lg, gap: space.md, width: "100%", maxWidth: 640, alignSelf: "center" },
		segment: {
			flexDirection: "row",
			backgroundColor: colors.softWarm,
			borderRadius: radii.button,
			padding: 3,
			gap: 3,
		},
		segmentBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },
		segmentBtnActive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
		segmentText: { color: colors.mutedText2, fontFamily: family.bold, fontSize: sizes.caption },
		segmentTextActive: { color: colors.defaultText },
		noticeBtn: { alignSelf: "flex-start", marginTop: space.xs },
		loading: { gap: space.md },
		skeletonStrip: { height: 64, borderRadius: radii.button, backgroundColor: colors.softWarm },
		skeletonCard: { height: 96, borderRadius: radii.md, backgroundColor: colors.softWarm },
		week: { flexDirection: "row", gap: space.xs },
		day: {
			flex: 1,
			minWidth: 0,
			minHeight: 64,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: space.xsPlus,
			borderRadius: radii.button,
			borderWidth: 1,
			borderColor: colors.border,
			backgroundColor: colors.card,
		},
		daySelected: { backgroundColor: colors.navy, borderColor: colors.navy },
		dayName: { color: colors.mutedText2, fontFamily: family.bold, fontSize: sizes.tiny, textTransform: "uppercase" },
		dayNumber: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.subtitle, lineHeight: lineHeights.subtitle },
		dayTextSelected: { color: colors.buttonText },
		dayPct: { color: colors.warmChipText, fontFamily: family.bold, fontSize: sizes.tiny },
		dayPctNone: { color: colors.mutedText2 },
		dayPctSelected: { color: colors.cyan },
		dayHead: { gap: 2 },
		dayTitle: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.subtitle, lineHeight: lineHeights.subtitle },
		dayCount: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption },
		hero: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.md,
			backgroundColor: colors.navy,
			borderRadius: radii.lg,
			padding: space.lg,
			minHeight: 72,
		},
		heroValue: { color: colors.cyan, fontFamily: family.bold, fontSize: sizes.h1, lineHeight: lineHeights.h1 },
		heroCopy: { flex: 1, gap: 2 },
		heroOverline: { color: colors.navyMutedText, fontFamily: family.medium, fontSize: sizes.micro, textTransform: "uppercase", letterSpacing: 0.8 },
		heroNote: { color: colors.navyMutedText, fontFamily: family.medium, fontSize: sizes.caption },
		heroText: { color: colors.buttonText, fontFamily: family.medium, fontSize: sizes.body, lineHeight: lineHeights.body },
		empty: {
			alignItems: "center",
			gap: space.sm,
			padding: space.xl,
			borderRadius: radii.md,
			borderWidth: 1,
			borderStyle: "dashed",
			borderColor: colors.border,
			backgroundColor: colors.card,
		},
		emptyTitle: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.body, textAlign: "center" },
		emptyHint: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption, textAlign: "center" },
		group: { gap: space.sm },
		groupHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
		pins: { flexDirection: "row", gap: 2 },
		groupTitle: { flex: 1, color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.label },
		promo: {
			flexDirection: "row",
			gap: space.md,
			padding: space.md,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			backgroundColor: colors.card,
			minHeight: 72,
		},
		promoValueCol: { width: 76, alignItems: "flex-start" },
		promoBig: { color: colors.warmChipText, fontFamily: family.bold, fontSize: sizes.h2, lineHeight: lineHeights.h2 },
		promoSmall: { color: colors.mutedText2, fontFamily: family.medium, fontSize: sizes.overline, lineHeight: lineHeights.overline },
		promoBody: { flex: 1, gap: space.xs },
		promoIssuer: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.label, lineHeight: lineHeights.label },
		promoSub: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption },
		chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: 2 },
		chip: {
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingHorizontal: space.sm,
			paddingVertical: 3,
			borderRadius: radii.full,
		},
		chipText: { fontFamily: family.medium, fontSize: sizes.overline, lineHeight: lineHeights.overline },
		chipOk: { backgroundColor: colors.successSoft },
		chipOkText: { color: colors.successSoftText },
		chipNear: { backgroundColor: colors.warningSoft },
		chipNearText: { color: colors.warningSoftText },
		chipInfo: { backgroundColor: colors.infoSoft },
		chipInfoText: { color: colors.infoSoftText },
		chipNeutral: { backgroundColor: colors.softWarm },
		chipNeutralText: { color: colors.mutedText2 },
		source: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.micro, textAlign: "center", marginTop: space.sm },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		focusRingInset: focusRing(colors, true),
	});
}
