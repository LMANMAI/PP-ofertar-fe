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
	findNodeHandle,
	type LayoutChangeEvent,
	type View,
} from "react-native";
import { OnboardingOverlay, type SpotlightRect } from "./OnboardingOverlay";

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
	const [active, setActive] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
	const overlayRef = useRef<View>(null);
	const storageKey =
		userKey === null ? null : `${STORAGE_KEY_PREFIX}:${userKey}`;

	const measureTarget = useCallback((id: OnboardingTargetId) => {
		const node = targets.current.get(id);
		const overlay = overlayRef.current;
		if (
			!node ||
			!overlay ||
			!findNodeHandle(node) ||
			!findNodeHandle(overlay)
		) {
			return;
		}
		overlay.measureInWindow((overlayX, overlayY) => {
			node.measureInWindow((x, y, width, height) => {
				setSpotlight({
					x: x - overlayX,
					y: y - overlayY,
					width,
					height,
					borderRadius: STEP_RADIUS[id] ?? 14,
				});
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
			setActive(false);
			setStepIndex(0);
			setSpotlight(null);
		}
	}, [storageKey]);

	useEffect(() => {
		if (!eligible && active) {
			setActive(false);
			setSpotlight(null);
		}
	}, [active, eligible]);

	useEffect(() => {
		if (!active) return;
		setSpotlight(null);
		const id = STEPS[stepIndex]?.id;
		if (!id) return;
		const timer = setTimeout(() => measureTarget(id), 80);
		return () => clearTimeout(timer);
	}, [active, measureTarget, stepIndex]);

	const finish = useCallback(() => {
		setActive(false);
		setSpotlight(null);
		if (storageKey) AsyncStorage.setItem(storageKey, "true").catch(() => {});
	}, [storageKey]);
	const next = useCallback(() => {
		if (stepIndex === STEPS.length - 1) finish();
		else setStepIndex((current) => current + 1);
	}, [finish, stepIndex]);
	const contextValue = useMemo(
		() => ({ registerTarget, registerLayout }),
		[registerLayout, registerTarget],
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

export function useOnboardingTarget(id: OnboardingTargetId) {
	const context = useContext(OnboardingContext);
	if (!context)
		throw new Error(
			"useOnboardingTarget debe usarse dentro de OnboardingProvider",
		);
	return {
		ref: (node: View | null) => context.registerTarget(id, node),
		onLayout: (event: LayoutChangeEvent) => context.registerLayout(id, event),
	};
}
