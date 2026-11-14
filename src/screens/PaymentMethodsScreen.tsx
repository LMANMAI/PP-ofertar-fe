import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomNav, ErrorBanner, InlineNotice, InputField, PrimaryButton, ScreenHeader, SectionLabel, type TabKey } from "../components";
import {
	focusRing,
	isFocused,
	radii,
	space,
	typography,
	useIsDarkMode,
	useThemeColors,
	type ColorTokens,
} from "../theme/designSystem";
import type { CatalogIssuer, MyPaymentMethods, PaymentCatalog, PaymentMethod, PaymentMethodInput } from "../services/bankPromosApi";
import {
	EMPTY_DRAFT,
	chooseCardType,
	chooseIssuer,
	chooseNetwork,
	draftToInput,
	filterIssuers,
	issuerInitials,
	methodDetail,
	methodLabel,
	stepBack,
	stepProgress,
	type AddDraft,
} from "../utils/bankPromos";

type Props = {
	activeTab: TabKey;
	onSelectTab: (t: TabKey) => void;
	onScanPress: () => void;
	onBack: () => void;
	catalog: PaymentCatalog | null;
	mine: MyPaymentMethods | null;
	/** Trae el catálogo y las tarjetas; lanza si falla. */
	onLoad: () => Promise<void>;
	/** Lanzan el error a mostrar si fallan. */
	onAdd: (method: PaymentMethodInput) => Promise<void>;
	onRemove: (id: number) => Promise<void>;
	onToggleBenefit: (benefit: string, enabled: boolean) => Promise<void>;
	/** Al calendario de promos de la semana (D9: se entra desde acá y desde Inicio). */
	onOpenCalendar: () => void;
};

const PRIVACY_TEXT = "Nunca te pedimos el número de tu tarjeta. Sólo el banco, la marca y si es de crédito o débito.";

const KIND_LABEL: Record<CatalogIssuer["kind"], string> = {
	bank: "Banco",
	wallet: "Billetera",
	card_issuer: "Tarjeta",
	club: "Club",
};

function errorText(err: unknown, fallback: string): string {
	return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Mis tarjetas (OFT-54), en lugar de la vieja "Métodos de pago" vacía. Una lista tipo billetera,
 * el alta en 3 pasos (emisor, marca y tipo; las billeteras saltan directo a confirmar) y los
 * beneficios que algunas promos piden (D6). Nunca se pide el número de la tarjeta.
 */
export function PaymentMethodsScreen({
	activeTab,
	onSelectTab,
	onScanPress,
	onBack,
	catalog,
	mine,
	onLoad,
	onAdd,
	onRemove,
	onToggleBenefit,
	onOpenCalendar,
}: Props) {
	const insets = useSafeAreaInsets();
	const colors = useThemeColors();
	const isDark = useIsDarkMode();
	const styles = useMemo(() => createStyles(colors), [colors]);

	const [loadError, setLoadError] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const [draft, setDraft] = useState<AddDraft | null>(null);
	const [query, setQuery] = useState("");
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState<number | null>(null);
	const [togglingBenefit, setTogglingBenefit] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		onLoad()
			.then(() => alive && setLoadError(false))
			.catch(() => alive && setLoadError(true));
		return () => {
			alive = false;
		};
	}, [onLoad, attempt]);

	const goBack = useCallback(() => {
		setError(null);
		if (draft) setDraft(stepBack(draft));
		else onBack();
	}, [draft, onBack]);

	// Atrás de Android dentro del alta vuelve un paso, no sale de la pantalla.
	useEffect(() => {
		if (!draft) return;
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			setDraft(stepBack(draft));
			return true;
		});
		return () => sub.remove();
	}, [draft]);

	const startAdd = () => {
		setError(null);
		setDone(null);
		setQuery("");
		setDraft(EMPTY_DRAFT);
	};

	const save = async () => {
		const input = draft && draftToInput(draft);
		if (!input) return;
		setSaving(true);
		setError(null);
		try {
			await onAdd(input);
			setDraft(null);
			setDone("Listo, sumamos la tarjeta.");
		} catch (err) {
			setError(errorText(err, "No pudimos guardar la tarjeta. Probá de nuevo."));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (m: PaymentMethod) => {
		setRemoving(m.id);
		setError(null);
		setDone(null);
		try {
			await onRemove(m.id);
			setDone(`Quitamos ${methodLabel(m, catalog?.networks, catalog?.cardTypes)}.`);
		} catch (err) {
			setError(errorText(err, "No pudimos quitar la tarjeta. Probá de nuevo."));
		} finally {
			setRemoving(null);
		}
	};

	const toggleBenefit = async (slug: string, enabled: boolean) => {
		setTogglingBenefit(slug);
		setError(null);
		try {
			await onToggleBenefit(slug, enabled);
		} catch (err) {
			setError(errorText(err, "No pudimos guardar el cambio. Probá de nuevo."));
		} finally {
			setTogglingBenefit(null);
		}
	};

	// Mismo par de colores que los switches de Perfil: encendido y apagado se distinguen
	// también por color, no sólo por la posición del círculo.
	const offTrack = isDark ? colors.border : colors.mutedText2;
	const switchColors = (value: boolean) => ({
		trackColor: { true: colors.cyan, false: offTrack },
		thumbColor: value ? colors.navy : isDark ? colors.mutedText2 : colors.buttonText,
		ios_backgroundColor: offTrack,
	});

	return (
		<View style={styles.safeArea}>
			<ScreenHeader title={draft ? "Agregar tarjeta" : "Mis tarjetas"} onBack={goBack} />

			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}
				keyboardShouldPersistTaps="handled"
			>
				<InlineNotice variant="info" icon="lock-closed-outline" live={false} message={PRIVACY_TEXT} />

				{error ? <InlineNotice variant="error" message={error} /> : null}
				{done && !draft ? <InlineNotice variant="success" message={done} /> : null}

				{loadError && (!catalog || !mine) ? (
					<ErrorBanner message="No pudimos cargar tus tarjetas." onRetry={() => setAttempt((a) => a + 1)} />
				) : !catalog || !mine ? (
					<View style={styles.loading} accessible accessibilityLabel="Cargando tus tarjetas">
						<View style={styles.skeleton} />
						<View style={styles.skeleton} />
					</View>
				) : draft ? (
					<AddFlow
						draft={draft}
						catalog={catalog}
						query={query}
						onQuery={setQuery}
						onDraft={(d) => {
							setError(null);
							setDraft(d);
						}}
						onSave={save}
						onCancel={() => setDraft(null)}
						saving={saving}
						styles={styles}
					/>
				) : (
					<>
						<SectionLabel style={styles.sectionLabel}>TARJETAS Y BILLETERAS</SectionLabel>
						{mine.methods.length === 0 ? (
							<View style={styles.empty}>
								<Ionicons name="card-outline" size={32} color={colors.subtleText} />
								<Text style={styles.emptyTitle}>Todavía no sumaste tarjetas</Text>
								<Text style={styles.emptyHint}>Sumá las que usás y te mostramos qué día te conviene comprar.</Text>
								<PrimaryButton label="Agregá tu primera tarjeta" icon="add" size="medium" onPress={startAdd} />
							</View>
						) : (
							<>
								{mine.methods.map((m) => {
									const label = methodLabel(m, catalog.networks, catalog.cardTypes);
									const detail = methodDetail(m, catalog.networks, catalog.cardTypes);
									return (
										<View key={m.id} style={styles.wcard}>
											<View style={styles.wcardInitials} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
												<Text style={styles.wcardInitialsText}>{issuerInitials(m.issuer.name)}</Text>
											</View>
											<View style={styles.wcardCopy} accessible accessibilityLabel={`${m.issuer.name}. ${detail}`}>
												<Text style={styles.wcardName}>{m.issuer.name}</Text>
												<Text style={styles.wcardDetail}>{detail}</Text>
											</View>
											<Pressable
												onPress={() => remove(m)}
												disabled={removing != null}
												style={(state) => [styles.removeBtn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
												accessibilityRole="button"
												accessibilityLabel={`Quitar ${label}`}
												accessibilityState={{ disabled: removing != null, busy: removing === m.id }}
											>
												<Text style={styles.removeText}>{removing === m.id ? "Quitando…" : "Quitar"}</Text>
											</Pressable>
										</View>
									);
								})}
								<PrimaryButton label="Agregar tarjeta o billetera" icon="add" size="medium" onPress={startAdd} />
							</>
						)}

						<Pressable
							onPress={onOpenCalendar}
							style={(state) => [styles.linkRow, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
							accessibilityRole="button"
							accessibilityLabel="Ver las promos de la semana con tus tarjetas"
						>
							<View style={styles.linkIcon}>
								<Ionicons name="calendar-outline" size={18} color={colors.infoSoftText} />
							</View>
							<Text style={styles.linkText}>Ver las promos de la semana</Text>
							<Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
						</Pressable>

						<SectionLabel style={styles.sectionLabel}>BENEFICIOS</SectionLabel>
						<Text style={styles.hint}>Algunas promos piden un requisito. Marcá los que tenés.</Text>
						<View style={styles.listCard}>
							{catalog.benefits.map((b, i) => {
								const on = mine.benefits.includes(b.slug);
								const busy = togglingBenefit != null;
								return (
									<View key={b.slug}>
										<Pressable
											onPress={() => toggleBenefit(b.slug, !on)}
											disabled={busy}
											style={(state) => [styles.benefitRow, isFocused(state) && styles.focusRingInset]}
											accessibilityRole="switch"
											accessibilityLabel={`${b.name}. ${b.description}`}
											accessibilityState={{ checked: on, disabled: busy }}
										>
											<View style={styles.benefitCopy}>
												<Text style={styles.benefitName}>{b.name}</Text>
												<Text style={styles.benefitDesc}>{b.description}</Text>
											</View>
											<Switch
												value={on}
												onValueChange={(v) => toggleBenefit(b.slug, v)}
												disabled={busy}
												{...switchColors(on)}
												accessibilityElementsHidden
												importantForAccessibility="no-hide-descendants"
											/>
										</Pressable>
										{i < catalog.benefits.length - 1 ? <View style={styles.divider} /> : null}
									</View>
								);
							})}
						</View>
					</>
				)}
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom, backgroundColor: colors.card }}>
				<BottomNav active={activeTab} onSelect={onSelectTab} onScanPress={onScanPress} />
			</View>
		</View>
	);
}

function AddFlow({
	draft,
	catalog,
	query,
	onQuery,
	onDraft,
	onSave,
	onCancel,
	saving,
	styles,
}: {
	draft: AddDraft;
	catalog: PaymentCatalog;
	query: string;
	onQuery: (q: string) => void;
	onDraft: (d: AddDraft) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
	styles: ReturnType<typeof createStyles>;
}) {
	const progress = stepProgress(draft);
	const issuers = filterIssuers(catalog.issuers, query);
	const typeOptions = catalog.cardTypes.filter((t) => t.slug !== "wallet");

	return (
		<View style={styles.flow}>
			{progress ? (
				<View style={styles.stepper} accessible accessibilityLabel={`Paso ${progress.current} de ${progress.total}`}>
					{[1, 2, 3].map((n) => (
						<View key={n} style={[styles.stepBar, n <= progress.current && styles.stepBarOn]} />
					))}
					<Text style={styles.stepText}>
						Paso {progress.current} de {progress.total}
					</Text>
				</View>
			) : null}

			{draft.step === "issuer" ? (
				<>
					<Text style={styles.question} accessibilityRole="header">
						¿De qué banco o billetera?
					</Text>
					<InputField label="Buscar" leftIcon="search" value={query} onChangeText={onQuery} autoCapitalize="none" autoCorrect={false} />
					<View style={styles.listCard}>
						{issuers.length === 0 ? (
							<Text style={styles.noResults}>No encontramos “{query}”. Probá con otro nombre.</Text>
						) : (
							issuers.map((issuer, i) => (
								<View key={issuer.slug}>
									<Pressable
										onPress={() => onDraft(chooseIssuer(issuer))}
										style={(state) => [styles.option, state.pressed && styles.pressed, isFocused(state) && styles.focusRingInset]}
										accessibilityRole="button"
										accessibilityLabel={`${issuer.name}, ${KIND_LABEL[issuer.kind].toLowerCase()}`}
									>
										<View style={styles.optionInitials}>
											<Text style={styles.optionInitialsText}>{issuerInitials(issuer.name)}</Text>
										</View>
										<Text style={styles.optionName}>{issuer.name}</Text>
										<Text style={styles.optionKind}>{KIND_LABEL[issuer.kind]}</Text>
									</Pressable>
									{i < issuers.length - 1 ? <View style={styles.divider} /> : null}
								</View>
							))
						)}
					</View>
				</>
			) : null}

			{draft.step === "network" && draft.issuer ? (
				<>
					<Text style={styles.question} accessibilityRole="header">
						¿Qué marca es tu tarjeta de {draft.issuer.name}?
					</Text>
					<View style={styles.pills}>
						{[...catalog.networks, { slug: "", name: "No sé" }].map((n) => (
							<Pressable
								key={n.slug || "no-se"}
								onPress={() => onDraft(chooseNetwork(draft, n.slug || null))}
								style={(state) => [styles.pill, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel={n.slug ? `Marca ${n.name}` : "No sé la marca"}
							>
								<Text style={styles.pillText}>{n.name}</Text>
							</Pressable>
						))}
					</View>
					<Text style={styles.hint}>
						La marca aparece en el frente de la tarjeta. Si no la sabés, te mostramos igual las promos de tu banco.
					</Text>
				</>
			) : null}

			{draft.step === "cardType" ? (
				<>
					<Text style={styles.question} accessibilityRole="header">
						¿Es de crédito o de débito?
					</Text>
					<View style={styles.pills}>
						{typeOptions.map((t) => (
							<Pressable
								key={t.slug}
								onPress={() => onDraft(chooseCardType(draft, t.slug))}
								style={(state) => [styles.pill, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
								accessibilityRole="button"
								accessibilityLabel={`Tarjeta de ${t.name.toLowerCase()}`}
							>
								<Text style={styles.pillText}>{t.name}</Text>
							</Pressable>
						))}
					</View>
				</>
			) : null}

			{draft.step === "confirm" && draft.issuer ? (
				<>
					<Text style={styles.question} accessibilityRole="header">
						¿Guardamos esta tarjeta?
					</Text>
					<View style={styles.wcard}>
						<View style={styles.wcardInitials}>
							<Text style={styles.wcardInitialsText}>{issuerInitials(draft.issuer.name)}</Text>
						</View>
						<View style={styles.wcardCopy}>
							<Text style={styles.wcardName}>{draft.issuer.name}</Text>
							<Text style={styles.wcardDetail}>
								{methodDetail(
									{ id: 0, issuer: draft.issuer, network: draft.network, cardType: draft.cardType },
									catalog.networks,
									catalog.cardTypes,
								)}
							</Text>
						</View>
					</View>
					<Text style={styles.hint}>Sólo guardamos el banco, la marca y el tipo. Podés quitarla cuando quieras.</Text>
					<PrimaryButton label="Guardar tarjeta" icon="checkmark" onPress={onSave} loading={saving} />
					<Pressable
						onPress={onCancel}
						style={(state) => [styles.ghostBtn, state.pressed && styles.pressed, isFocused(state) && styles.focusRing]}
						accessibilityRole="button"
						accessibilityLabel="Cancelar el alta"
					>
						<Text style={styles.ghostText}>Cancelar</Text>
					</Pressable>
				</>
			) : null}
		</View>
	);
}

function createStyles(colors: ColorTokens) {
	const { sizes, lineHeights, family } = typography;
	return StyleSheet.create({
		safeArea: { flex: 1, backgroundColor: colors.background },
		content: { padding: space.lg, gap: space.md, width: "100%", maxWidth: 640, alignSelf: "center" },
		loading: { gap: space.md },
		skeleton: { height: 76, borderRadius: radii.lg, backgroundColor: colors.softWarm },
		sectionLabel: { marginTop: space.sm },
		hint: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption, lineHeight: lineHeights.caption },
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
		emptyHint: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption, textAlign: "center", marginBottom: space.xs },
		// Tarjeta tipo billetera: navy en los dos temas, como las otras superficies de marca.
		wcard: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.md,
			backgroundColor: colors.navy,
			borderRadius: radii.lg,
			padding: space.lg,
			minHeight: 76,
		},
		wcardInitials: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.cyan, alignItems: "center", justifyContent: "center" },
		wcardInitialsText: { color: colors.navy, fontFamily: family.bold, fontSize: sizes.label },
		wcardCopy: { flex: 1, gap: 2 },
		wcardName: { color: colors.buttonText, fontFamily: family.bold, fontSize: sizes.body },
		wcardDetail: { color: colors.navyMutedText, fontFamily: family.regular, fontSize: sizes.caption },
		removeBtn: {
			minHeight: 44,
			minWidth: 44,
			paddingHorizontal: space.md,
			borderRadius: radii.full,
			borderWidth: 1,
			borderColor: colors.navyMutedText,
			alignItems: "center",
			justifyContent: "center",
		},
		removeText: { color: colors.buttonText, fontFamily: family.medium, fontSize: sizes.caption },
		linkRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: space.md,
			minHeight: 56,
			paddingHorizontal: space.lg,
			borderRadius: radii.md,
			borderWidth: 1,
			borderColor: colors.divider,
			backgroundColor: colors.card,
		},
		linkIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.infoSoft, alignItems: "center", justifyContent: "center" },
		linkText: { flex: 1, color: colors.defaultText, fontFamily: family.medium, fontSize: sizes.label },
		listCard: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" },
		divider: { height: 1, backgroundColor: colors.divider, marginLeft: space.lg },
		benefitRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
		benefitCopy: { flex: 1, gap: 2 },
		benefitName: { color: colors.defaultText, fontFamily: family.medium, fontSize: sizes.label },
		benefitDesc: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption },
		flow: { gap: space.md },
		stepper: { flexDirection: "row", alignItems: "center", gap: space.xs },
		stepBar: { flex: 1, height: 4, borderRadius: radii.full, backgroundColor: colors.border },
		stepBarOn: { backgroundColor: colors.actionFill },
		stepText: { marginLeft: space.sm, color: colors.mutedText2, fontFamily: family.medium, fontSize: sizes.micro },
		question: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.subtitle, lineHeight: lineHeights.subtitle },
		option: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, minHeight: 56 },
		optionInitials: { width: 34, height: 34, borderRadius: radii.full, backgroundColor: colors.softNavy, alignItems: "center", justifyContent: "center" },
		optionInitialsText: { color: colors.defaultText, fontFamily: family.bold, fontSize: sizes.micro },
		optionName: { flex: 1, color: colors.defaultText, fontFamily: family.medium, fontSize: sizes.label },
		optionKind: { color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.micro },
		noResults: { padding: space.lg, color: colors.mutedText2, fontFamily: family.regular, fontSize: sizes.caption },
		pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
		pill: {
			minHeight: 48,
			paddingHorizontal: space.lg,
			borderRadius: radii.full,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.card,
			alignItems: "center",
			justifyContent: "center",
		},
		pillText: { color: colors.defaultText, fontFamily: family.medium, fontSize: sizes.label },
		ghostBtn: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.button },
		ghostText: { color: colors.defaultText, fontFamily: family.medium, fontSize: sizes.body, textDecorationLine: "underline" },
		pressed: { opacity: 0.88 },
		focusRing: focusRing(colors),
		focusRingInset: focusRing(colors, true),
	});
}
