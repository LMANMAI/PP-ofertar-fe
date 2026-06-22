import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IonName = ComponentProps<typeof Ionicons>["name"];

export type TrackedProduct = {
	id: string;
	name: string;
	price: string;
	delta: string;
	icon: IonName;
};

export const TRACKED_PRODUCTS: TrackedProduct[] = [
	{ id: "1", name: "Leche\nSerenísima", price: "$1.780", delta: "-10%", icon: "cart-outline" },
	{ id: "2", name: "Yerba\nPlayadito", price: "$3.100", delta: "-9%", icon: "cart-outline" },
	{ id: "3", name: "Aceite\nNatura", price: "$2.010", delta: "-22%", icon: "cart-outline" },
];

export const HOME_SAVINGS = {
	amount: "$12.480",
	delta: "+18% vs abril",
	tickets: 12,
	points: 2430,
};
