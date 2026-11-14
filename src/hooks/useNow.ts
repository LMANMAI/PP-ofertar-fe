import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * La hora actual en ms, que se actualiza cada `intervalMs` alineado al reloj
 * (al cambio de minuto, con el valor por defecto) y al volver la app al frente.
 *
 * Para que "Abierto · cierra 22:00" pase a "Cerrado" mientras la pantalla está
 * abierta sin recalcular en cada render: quien lo usa re-renderiza una vez por
 * minuto, no más. Alineado al minuto porque si no el cartel cambiaría hasta 59 s
 * tarde; y al volver del fondo porque los timers no corren con la app dormida.
 */
export function useNow(intervalMs = 60_000): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | null = null;
		const schedule = () => {
			// +50 ms para caer del lado de adentro del minuto nuevo.
			const delay = intervalMs - (Date.now() % intervalMs) + 50;
			timer = setTimeout(tick, delay);
		};
		const tick = () => {
			setNow(Date.now());
			schedule();
		};
		schedule();
		const sub = AppState.addEventListener("change", (state) => {
			if (state !== "active") return;
			if (timer) clearTimeout(timer);
			tick();
		});
		return () => {
			if (timer) clearTimeout(timer);
			sub.remove();
		};
	}, [intervalMs]);

	return now;
}
