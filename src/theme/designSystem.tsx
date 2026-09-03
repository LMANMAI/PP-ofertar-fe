import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { useColorScheme, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Breakpoint above which the phone-width single column restructures into a
 * tablet layout (grid columns, capped/centered content) instead of stretching. */
export const TABLET_BREAKPOINT = 768;

export function useIsTablet(): boolean {
	const { width } = useWindowDimensions();
	return width >= TABLET_BREAKPOINT;
}

export const colors = {
	navy: "#0A1F44",
	cyan: "#7DD4F5",
	orange: "#E76F51",
	background: "#F8FAFC",
	defaultText: "#0F172A",
	mutedText: "#5C6B84",
	card: "#FFFFFF",
	border: "#D8E1EE",
	softNavy: "#EAF1FA",
	softCyan: "#E0F5FD",
	softWarm: "#F1F5F9",
	buttonText: "#FFFFFF",
	// Roles recurrentes que antes se repetían como hex sueltos por pantalla.
	mutedText2: "#6B7280",
	subtleText: "#6A7482",
	divider: "#E5E7EB",
	success: "#22C55E",
	danger: "#EF4444",
	// Color de sombra: navy funciona sobre el fondo claro, pero se vuelve
	// invisible sobre superficies oscuras (ver darkColors.shadow).
	shadow: "#0A1F44",
	// Fondos "soft" + texto a juego para banners/badges de estado (error,
	// éxito, alerta, info). Antes eran pasteles sueltos por pantalla que no
	// se adaptaban al tema oscuro; acá quedan como tokens con variante propia.
	successSoft: "#E0F5EF",
	successSoftText: "#15803D",
	dangerSoft: "#FEF2F2",
	dangerSoftText: "#991B1B",
	warningSoft: "#FFF7ED",
	warningSoftText: "#B45A14",
	infoSoft: "#E8F6FC",
	infoSoftText: "#0A1F44",
	// Chip de condición "no es simplemente un % off" (ej. "2da unidad al 50%") —
	// deliberadamente más cálido que warningSoft para no leerse como alerta.
	warmChip: "#FDECE6",
	warmChipText: "#B44A2E",
	// Texto secundario/caption sobre una superficie navy fija — repetido como
	// hex suelto en 6 pantallas antes de nombrarlo. Igual en los dos temas,
	// como el resto de la paleta navy: la superficie no cambia con el tema.
	navyMutedText: "#99B2CC",
} as const;

export type ColorTokens = Record<keyof typeof colors, string>;

// Paleta oscura equivalente, misma forma que `colors`. El tinte de marca
// (navy/cyan/orange) se mantiene igual en ambas apariencias; lo que cambia
// son los roles de fondo/superficie/texto.
export const darkColors: ColorTokens = {
	navy: "#0A1F44",
	cyan: "#7DD4F5",
	orange: "#E76F51",
	background: "#0B1220",
	defaultText: "#E7ECF5",
	mutedText: "#8B97AE",
	card: "#111A2C",
	border: "#25314A",
	softNavy: "#16233D",
	softCyan: "#12303A",
	softWarm: "#1B2333",
	buttonText: "#FFFFFF",
	mutedText2: "#9AA5BC",
	subtleText: "#9BA6BC",
	divider: "#2A3650",
	success: "#22C55E",
	danger: "#EF4444",
	// Negro puro en vez de navy: navy tiene casi la misma luminosidad que el
	// fondo oscuro, así que una sombra "navy" se volvía invisible ahí.
	shadow: "#000000",
	// Mismos roles que en `colors`, pero como tintes oscuros y desaturados en
	// vez de pasteles — un pastel de modo claro sobre una card oscura se lee
	// como un error de render, no como una decisión de diseño.
	successSoft: "#173226",
	successSoftText: "#4ADE80",
	dangerSoft: "#3A1717",
	dangerSoftText: "#F87171",
	warningSoft: "#3A2A14",
	warningSoftText: "#FBBF24",
	infoSoft: "#12303A",
	infoSoftText: "#7DD4F5",
	warmChip: "#3A2118",
	warmChipText: "#F4A387",
	navyMutedText: "#99B2CC",
};

export type ThemePreference = "system" | "light" | "dark";
const THEME_PREFERENCE_KEY = "ofertar_theme_preference";

type ThemePreferenceContextValue = {
	preference: ThemePreference;
	setPreference: (next: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

/**
 * Wrap the app once, near the root, so every screen's `useThemeColors()`
 * resolves against the same manual override instead of always following the
 * OS setting. Defaults to "system" until the persisted preference (if any)
 * loads from AsyncStorage.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
	const [preference, setPreferenceState] = useState<ThemePreference>("system");

	useEffect(() => {
		AsyncStorage.getItem(THEME_PREFERENCE_KEY)
			.then((stored) => {
				if (stored === "light" || stored === "dark" || stored === "system") {
					setPreferenceState(stored);
				}
			})
			.catch(() => {});
	}, []);

	const setPreference = (next: ThemePreference) => {
		setPreferenceState(next);
		AsyncStorage.setItem(THEME_PREFERENCE_KEY, next).catch(() => {});
	};

	return (
		<ThemePreferenceContext.Provider value={{ preference, setPreference }}>
			{children}
		</ThemePreferenceContext.Provider>
	);
}

/** The user's manual light/dark/system choice, for the settings toggle. */
export function useThemePreference(): ThemePreferenceContextValue {
	const ctx = useContext(ThemePreferenceContext);
	// No provider above (e.g. a screen rendered in isolation) falls back to
	// system-only behavior rather than throwing, matching the pre-toggle default.
	if (!ctx) return { preference: "system", setPreference: () => {} };
	return ctx;
}

/**
 * Tokens de color que reaccionan a la apariencia elegida: la preferencia
 * manual del usuario si la fijó, o la apariencia del sistema operativo por
 * default. Los componentes deben preferir este hook sobre el objeto `colors`
 * estático para adaptarse correctamente.
 */
function useResolvedScheme(): "light" | "dark" {
	const systemScheme = useColorScheme();
	const { preference } = useThemePreference();
	const resolved = preference === "system" ? systemScheme : preference;
	return resolved === "dark" ? "dark" : "light";
}

export function useThemeColors(): ColorTokens {
	return useResolvedScheme() === "dark" ? darkColors : colors;
}

/** For the handful of cases a color token can't express — a MapView's
 * `customMapStyle`, a native library's own light/dark prop. */
export function useIsDarkMode(): boolean {
	return useResolvedScheme() === "dark";
}

export const typography = {
	family: {
		regular: "PlusJakartaSans_400Regular",
		medium: "PlusJakartaSans_500Medium",
		bold: "PlusJakartaSans_700Bold",
	},
	sizes: {
		display: 36,
		h1: 28,
		h2: 22,
		h3: 20,
		bodyL: 17,
		subtitle: 16,
		body: 15,
		label: 14,
		caption: 13,
		micro: 12,
		overline: 11,
		tiny: 10,
	},
	lineHeights: {
		display: 44,
		h1: 36,
		h2: 28,
		h3: 26,
		bodyL: 26,
		subtitle: 22,
		body: 22,
		label: 19,
		caption: 18,
		micro: 16,
		overline: 14,
		tiny: 13,
	},
	weights: {
		regular: "400",
		medium: "500",
		bold: "700",
	} as const,
} as const;

// Radios y espaciados recurrentes, para dejar de repetir números sueltos
// por pantalla (29 radios distintos y ninguna escala de spacing existían
// antes de esto).
export const radii = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	full: 999,
} as const;

export const space = {
	xs: 4,
	// The half-steps below were already the app's de-facto convention for
	// tight icon/chip/card spacing (6/10/14 shows up 90+ times across the
	// screens) — named here instead of left as bare numbers.
	xsPlus: 6,
	sm: 8,
	smPlus: 10,
	md: 12,
	mdPlus: 14,
	lg: 16,
	xl: 20,
	xxl: 24,
} as const;
