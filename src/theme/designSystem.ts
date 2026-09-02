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
		bodyL: 17,
		overline: 11,
		body: 15,
		caption: 13,
	},
	lineHeights: {
		display: 44,
		h1: 36,
		bodyL: 26,
		overline: 14,
		body: 22,
		caption: 18,
	},
	weights: {
		regular: "400",
		medium: "500",
		bold: "700",
	} as const,
} as const;
