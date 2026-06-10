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
} as const;

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
