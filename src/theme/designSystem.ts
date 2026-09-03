import { useColorScheme } from "react-native";

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
	subtleText: "#9CA3A8",
	divider: "#E5E7EB",
	success: "#22C55E",
	danger: "#EF4444",
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
	subtleText: "#7B879E",
	divider: "#2A3650",
	success: "#22C55E",
	danger: "#EF4444",
};

/**
 * Tokens de color que reaccionan a la apariencia del sistema (Dark Mode /
 * Dark theme). Los componentes compartidos deben preferir este hook sobre
 * el `colors` estático para adaptarse correctamente.
 */
export function useThemeColors(): ColorTokens {
	const scheme = useColorScheme();
	return scheme === "dark" ? darkColors : colors;
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
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	xxl: 24,
} as const;
