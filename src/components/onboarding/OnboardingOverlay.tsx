import {
	Pressable,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import type { RefObject } from "react";
import { colors, typography } from "../../theme/designSystem";
import type { OnboardingTargetId } from "./OnboardingProvider";

export type SpotlightRect = {
	x: number;
	y: number;
	width: number;
	height: number;
	borderRadius?: number;
};
type Props = {
	step: { id: OnboardingTargetId; title: string; description: string };
	stepNumber: number;
	totalSteps: number;
	spotlight: SpotlightRect | null;
	onNext: () => void;
	onSkip: () => void;
	overlayRef: RefObject<View | null>;
};

export function OnboardingOverlay({
	step,
	stepNumber,
	totalSteps,
	spotlight,
	onNext,
	onSkip,
	overlayRef,
}: Props) {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const tooltipHeight = 190;
	const placeAbove = Boolean(
		spotlight &&
		spotlight.y + spotlight.height + 18 + tooltipHeight > windowHeight,
	);
	const tooltipTop = spotlight
		? placeAbove
			? Math.max(18, spotlight.y - tooltipHeight - 18)
			: spotlight.y + spotlight.height + 18
		: 180;
	const tooltipLeft = spotlight
		? Math.max(18, Math.min(spotlight.x, windowWidth - 318))
		: 18;
	const arrowLeft = spotlight
		? Math.max(
				24,
				Math.min(spotlight.x - tooltipLeft + spotlight.width / 2 - 9, 270),
			)
		: 30;
	return (
		<View ref={overlayRef} style={styles.overlay} pointerEvents="box-none">
			{spotlight && (
				<View pointerEvents="none" style={StyleSheet.absoluteFill}>
					<View style={[styles.shade, { height: spotlight.y }]} />
					<View
						style={[
							styles.shade,
							{ top: spotlight.y + spotlight.height, bottom: 0 },
						]}
					/>
					<View
						style={[
							styles.shade,
							{
								top: spotlight.y,
								height: spotlight.height,
								width: spotlight.x,
							},
						]}
					/>
					<View
						style={[
							styles.shade,
							{
								top: spotlight.y,
								height: spotlight.height,
								left: spotlight.x + spotlight.width,
								right: 0,
							},
						]}
					/>
					<View
						style={[
							styles.highlight,
							{
								top: spotlight.y,
								left: spotlight.x,
								width: spotlight.width,
								height: spotlight.height,
								borderRadius: spotlight.borderRadius ?? 14,
							},
						]}
					/>
				</View>
			)}
			<View style={[styles.tooltip, { top: tooltipTop, left: tooltipLeft }]}>
				<View
					style={[
						styles.arrow,
						placeAbove ? styles.arrowBelow : styles.arrowAbove,
						{ left: arrowLeft },
					]}
				/>
				<Text style={styles.step}>
					{stepNumber} / {totalSteps}
				</Text>
				<Text style={styles.title}>{step.title}</Text>
				<Text style={styles.description}>{step.description}</Text>
				<View style={styles.actions}>
					<Pressable onPress={onSkip} hitSlop={8}>
						<Text style={styles.skip}>Omitir tour</Text>
					</Pressable>
					<Pressable onPress={onNext} style={styles.next} hitSlop={4}>
						<Text style={styles.nextText}>
							{stepNumber === totalSteps ? "Entendido" : "Siguiente"}
						</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
	shade: {
		position: "absolute",
		left: 0,
		right: 0,
		backgroundColor: "rgba(3, 14, 32, 0.78)",
	},
	highlight: {
		position: "absolute",
		borderWidth: 2,
		borderColor: colors.cyan,
		borderRadius: 14,
		shadowColor: colors.cyan,
		shadowOpacity: 0.7,
		shadowRadius: 10,
		elevation: 8,
	},
	tooltip: {
		position: "absolute",
		width: 300,
		backgroundColor: colors.card,
		borderRadius: 16,
		padding: 18,
		shadowColor: colors.navy,
		shadowOpacity: 0.25,
		shadowRadius: 16,
		elevation: 10,
	},
	arrow: {
		position: "absolute",
		width: 18,
		height: 18,
		backgroundColor: colors.card,
		transform: [{ rotate: "45deg" }],
	},
	arrowAbove: { top: -9 },
	arrowBelow: { bottom: -9 },
	step: {
		color: colors.orange,
		fontFamily: typography.family.bold,
		fontSize: 11,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	title: {
		color: colors.navy,
		fontFamily: typography.family.bold,
		fontSize: 19,
		marginTop: 5,
	},
	description: {
		color: colors.mutedText,
		fontFamily: typography.family.regular,
		fontSize: 13,
		lineHeight: 19,
		marginTop: 7,
	},
	actions: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 16,
	},
	skip: {
		color: colors.mutedText,
		fontFamily: typography.family.medium,
		fontSize: 12,
	},
	next: {
		backgroundColor: colors.navy,
		borderRadius: 9,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	nextText: {
		color: colors.buttonText,
		fontFamily: typography.family.bold,
		fontSize: 12,
	},
});
