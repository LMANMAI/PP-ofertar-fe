/**
 * Google Maps night-mode style array. Android (Google Maps SDK) applies this
 * fully; iOS (Apple Maps via react-native-maps' default provider) ignores
 * `customMapStyle` — there PROVIDER_GOOGLE would be required for parity, which
 * these screens don't currently request, so iOS keeps the system map style.
 */
import type { MapStyleElement } from "react-native-maps";

export const DARK_MAP_STYLE: MapStyleElement[] = [
	{ elementType: "geometry", stylers: [{ color: "#111A2C" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#111A2C" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#8B97AE" }] },
	{
		featureType: "administrative",
		elementType: "geometry",
		stylers: [{ color: "#25314A" }],
	},
	{
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: "#1B2333" }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.fill",
		stylers: [{ color: "#8B97AE" }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#16233D" }],
	},
	{
		featureType: "road",
		elementType: "geometry",
		stylers: [{ color: "#25314A" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#1B2333" }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: "#9AA5BC" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#2A3650" }],
	},
	{
		featureType: "transit",
		elementType: "geometry",
		stylers: [{ color: "#1B2333" }],
	},
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#0B1220" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#8B97AE" }],
	},
];
