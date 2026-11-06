import { useEffect } from "react";
import { Linking } from "react-native";
import { useAuthFlowStore } from "../store";
import { referralCodeFromUrl } from "../utils/referralLink";

/** Guarda el código de un link de referido, abra o no la app desde cero. */
export function useReferralLink(): void {
	useEffect(() => {
		const handle = (url: string | null) => {
			const code = referralCodeFromUrl(url);
			if (code) useAuthFlowStore.getState().setLinkedReferralCode(code);
		};
		Linking.getInitialURL().then(handle).catch(() => {});
		const subscription = Linking.addEventListener("url", ({ url }) => handle(url));
		return () => subscription.remove();
	}, []);
}
