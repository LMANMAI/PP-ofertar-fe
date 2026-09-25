import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** True while the software keyboard is on screen. iOS reports the change
 * before the animation (Will*), Android only after it (Did*). */
export function useKeyboardVisible(): boolean {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setVisible(true));
		const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setVisible(false));
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);

	return visible;
}
