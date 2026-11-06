import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	AccessibilityInfo,
	LayoutAnimation,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	type ScrollView,
	type View,
} from "react-native";
import { OnboardingOverlay, type SpotlightRect } from "./OnboardingOverlay";
import { revealDelta } from "./onboardingPlacement";

export type OnboardingTargetId =
	| "scan-ticket"
	| "offers"
	| "history"
	| "main-navigation";

type Step = { id: OnboardingTargetId; title: string; description: string };
const STORAGE_KEY_PREFIX = "ofertar_onboarding_completed_v2";
const STEP_RADIUS: Partial<Record<OnboardingTargetId, number>> = {
	"scan-ticket": 28,
};
/** Viven en la barra de abajo: siempre se ven, no hay nada que desplazar. */
const FIXED_TARGETS: readonly OnboardingTargetId[] = ["scan-ticket", "main-navigation"];
/** Si el contenido cambia de alto mientras carga, el destino se vuelve a buscar, pero no para siempre. */
const MAX_REVEALS_PER_STEP = 3;
const MEASURE_DELAY_MS = 80;
const STEPS: Step[] = [
	{
		id: "scan-ticket",
		title: "Escaneá tus tickets",
		description:
			"Encuadrá el ticket o producto, confirmá y dejá que OfertAR encuentre tus ahorros.",
	},
	{
		id: "history",
		title: "Tu historial y ahorro",
		description: "Consultá tus tickets escaneados y cuánto venís ahorrando.",
	},
	{
		id: "offers",
		title: "Tus ofertas detectadas",
		description:
			"Acá aparecen las ofertas que pueden interesarte según tus supermercados de preferencia.",
	},
	{
		id: "main-navigation",
		title: "Todo a mano",
		description:
			"Usá esta navegación para ir a Inicio, tus Tickets, Ofertas y tu Perfil.",
	},
];

type ContextValue = {
	registerTarget: (id: OnboardingTargetId, node: View | null) => void;
	registerLayout: (id: OnboardingTargetId, event: LayoutChangeEvent) => void;
	registerScroller: (node: ScrollView | null) => void;
	reportScroll: (offsetY: number) => void;
};
const OnboardingContext = createContext<ContextValue | null>(null);

export function OnboardingProvider({
	children,
	eligible,
	userKey,
}: {
	children: ReactNode;
	eligible: boolean;
	userKey: number | string | null;
}) {
	const targets = useRef(new Map<OnboardingTargetId, View>());
	/** La pantalla con scroll donde están los destinos, y cuánto está desplazada. */
	const scroller = useRef<ScrollView | null>(null);
	const scrollOffset = useRef(0);
	const reveals = useRef(0);
	const [active, setActive] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
	/** Sube cada vez que el tour desplazó la pantalla y hay que volver a medir el destino. */
	const [remeasure, setRemeasure] = useState(0);
	const overlayRef = useRef<View>(null);
	const reduceMotion = useRef(false);
	const storageKey =
		userKey === null ? null : `${STORAGE_KEY_PREFIX}:${userKey}`;

	useEffect(() => {
		AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
			reduceMotion.current = enabled;
		});
		const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
			reduceMotion.current = enabled;
		});
		return () => sub.remove();
	}, []);

	const measureTarget = useCallback((id: OnboardingTargetId) => {
		const node = targets.current.get(id);
		const overlay = overlayRef.current;
		if (!node || !overlay) return;
		overlay.measureInWindow((overlayX, overlayY, _overlayWidth, overlayHeight) => {
			node.measureInWindow((x, y, width, height) => {
				const place = (visibleBottom: number) => {
					// Un destino debajo del pliegue se trae a la vista antes de señalarlo.
					const delta = FIXED_TARGETS.includes(id) ? 0 : revealDelta(y - overlayY + height, visibleBottom);
					const list = scroller.current;
					if (delta > 0 && list && reveals.current < MAX_REVEALS_PER_STEP) {
						reveals.current += 1;
						scrollOffset.current += delta;
						list.scrollTo({ y: scrollOffset.current, animated: false });
						setRemeasure((n) => n + 1);
						return;
					}
					// The highlight was teleporting straight from one target to the
					// next with no transition — animating the layout pass this
					// triggers makes it read as the spotlight moving to the next
					// thing to notice, which is the entire point of a guided tour.
					if (!reduceMotion.current) {
						LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
					}
					setSpotlight({
						x: x - overlayX,
						y: y - overlayY,
						width,
						height,
						borderRadius: STEP_RADIUS[id] ?? 14,
					});
				};
				// Lo visible termina donde empieza la barra de abajo, no donde termina la pantalla.
				const bar = targets.current.get("main-navigation");
				if (bar) bar.measureInWindow((_barX, barY) => place(barY - overlayY));
				else place(overlayHeight);
			});
		});
	}, []);
	const registerTarget = useCallback(
		(id: OnboardingTargetId, node: View | null) => {
			// Los refs se registran y desregistran con el ciclo de vida de cada pantalla.
			if (node) targets.current.set(id, node);
			else targets.current.delete(id);
		},
		[],
	);
	const registerScroller = useCallback((node: ScrollView | null) => {
		scroller.current = node;
		if (!node) scrollOffset.current = 0;
	}, []);
	const reportScroll = useCallback((offsetY: number) => {
		scrollOffset.current = offsetY;
	}, []);
	const registerLayout = useCallback(
		(id: OnboardingTargetId, _event: LayoutChangeEvent) => {
			if (active && STEPS[stepIndex]?.id === id) measureTarget(id);
		},
		[active, measureTarget, stepIndex],
	);

	useEffect(() => {
		if (!eligible || active || !storageKey) return;
		let cancelled = false;
		AsyncStorage.getItem(storageKey)
			.then((value) => {
				if (!cancelled && value !== "true") {
					setStepIndex(0);
					setActive(true);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [active, eligible, storageKey]);

	useEffect(() => {
		if (storageKey) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- resets the tour when the logged-in user changes
			setActive(false);
			setStepIndex(0);
			setSpotlight(null);
		}
	}, [storageKey]);

	useEffect(() => {
		if (!eligible && active) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- ends the tour when the surface stops being eligible mid-run
			setActive(false);
			setSpotlight(null);
		}
	}, [active, eligible]);

	useEffect(() => {
		if (!active) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- clears the previous step's highlight before measuring the next target
		setSpotlight(null);
		reveals.current = 0;
		const id = STEPS[stepIndex]?.id;
		if (!id) return;
		const timer = setTimeout(() => measureTarget(id), MEASURE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [active, measureTarget, stepIndex]);

	useEffect(() => {
		const id = STEPS[stepIndex]?.id;
		if (!active || !id || remeasure === 0) return;
		const timer = setTimeout(() => measureTarget(id), MEASURE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [active, measureTarget, remeasure, stepIndex]);

	const finish = useCallback(() => {
		setActive(false);
		setSpotlight(null);
		// El tour pudo dejar la pantalla desplazada: se devuelve como estaba.
		scroller.current?.scrollTo({ y: 0, animated: false });
		if (storageKey) AsyncStorage.setItem(storageKey, "true").catch(() => {});
	}, [storageKey]);
	const next = useCallback(() => {
		if (stepIndex === STEPS.length - 1) finish();
		else setStepIndex((current) => current + 1);
	}, [finish, stepIndex]);
	const contextValue = useMemo(
		() => ({ registerTarget, registerLayout, registerScroller, reportScroll }),
		[registerLayout, registerScroller, registerTarget, reportScroll],
	);

	return (
		<OnboardingContext.Provider value={contextValue}>
			{children}
			{active && (
				<OnboardingOverlay
					overlayRef={overlayRef}
					step={STEPS[stepIndex]}
					stepNumber={stepIndex + 1}
					totalSteps={STEPS.length}
					spotlight={spotlight}
					onNext={next}
					onSkip={finish}
				/>
			)}
		</OnboardingContext.Provider>
	);
}

/** Para la pantalla con scroll que contiene destinos del tour: así puede traerlos a la vista. */
export function useOnboardingScroll() {
	const context = useContext(OnboardingContext);
	if (!context)
		throw new Error(
			"useOnboardingScroll debe usarse dentro de OnboardingProvider",
		);
	const { registerScroller, reportScroll } = context;
	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => reportScroll(event.nativeEvent.contentOffset.y),
		[reportScroll],
	);
	return { attachRef: registerScroller, onScroll };
}

export function useOnboardingTarget(id: OnboardingTargetId) {
	const context = useContext(OnboardingContext);
	if (!context)
		throw new Error(
			"useOnboardingTarget debe usarse dentro de OnboardingProvider",
		);
	const attachRef = useCallback(
		(node: View | null) => context.registerTarget(id, node),
		[context, id],
	);
	const onLayout = useCallback(
		(event: LayoutChangeEvent) => context.registerLayout(id, event),
		[context, id],
	);
	return { attachRef, onLayout };
}
