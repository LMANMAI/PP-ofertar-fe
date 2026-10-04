/**
 * Comprueba, con el router de pila de React Navigation (JS puro), que las acciones que usa
 * `nav` (push, replace, popTo, reset) hacen lo que el resto de la app supone. Si una
 * actualización de la librería cambia alguno de estos comportamientos, falla acá y no en el celular.
 */
import { CommonActions, StackActions, StackRouter, type StackNavigationState } from "@react-navigation/routers";
import { describe, expect, it } from "vitest";

const routeNames = ["Welcome", "Login", "Main", "Points", "RewardDetail", "ConfirmRedeem", "RedeemSuccess", "TicketHistory"];
const router = StackRouter({});
const options = { routeNames, routeParamList: {}, routeGetIdList: {} };

type State = StackNavigationState<Record<string, object | undefined>>;

function desde(...nombres: string[]): State {
	return {
		stale: false,
		type: "stack",
		key: "stack",
		index: nombres.length - 1,
		routeNames,
		preloadedRoutes: [],
		routes: nombres.map((name, i) => ({ key: `${name}-${i}`, name })),
	} as State;
}

type Accion = Parameters<typeof router.getStateForAction>[1];

function aplicar(state: State, action: Accion): State {
	const next = router.getStateForAction(state, action, options);
	if (!next) throw new Error("la acción no se aplicó");
	return next as State;
}

const nombres = (s: State) => s.routes.map((r) => r.name);

describe("verbos de nav sobre la pila", () => {
	it("push agrega la pantalla encima", () => {
		expect(nombres(aplicar(desde("Main"), StackActions.push("Points")))).toEqual(["Main", "Points"]);
	});

	it("push de una pantalla que ya está en la pila la agrega otra vez (no vuelve a ella)", () => {
		expect(nombres(aplicar(desde("Main", "Points"), StackActions.push("Points")))).toEqual(["Main", "Points", "Points"]);
	});

	it("replace cambia la de arriba sin dejarla en el historial", () => {
		expect(nombres(aplicar(desde("Welcome", "Login"), StackActions.replace("Main")))).toEqual(["Welcome", "Main"]);
	});

	it("popTo vuelve a una pantalla de la pila y cierra las de encima", () => {
		const canje = desde("Main", "Points", "RewardDetail", "ConfirmRedeem");
		expect(nombres(aplicar(canje, StackActions.popTo("Points")))).toEqual(["Main", "Points"]);
	});

	it("popTo conserva la pantalla a la que vuelve (no la recrea)", () => {
		const antes = desde("Main", "Points", "RewardDetail");
		const despues = aplicar(antes, StackActions.popTo("Main"));
		expect(despues.routes[0].key).toBe(antes.routes[0].key);
	});

	it("reset deja exactamente las pantallas pedidas, la última a la vista", () => {
		const reseteado = aplicar(
			desde("Main", "Points", "RewardDetail"),
			CommonActions.reset({ index: 1, routes: [{ name: "Main" }, { name: "TicketHistory" }] }),
		);
		expect(nombres(reseteado)).toEqual(["Main", "TicketHistory"]);
		expect(reseteado.index).toBe(1);
	});

	it("goBack cierra la pantalla de arriba", () => {
		expect(nombres(aplicar(desde("Main", "Points"), CommonActions.goBack()))).toEqual(["Main"]);
	});
});
