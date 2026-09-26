import {
	AuthLoginScreen,
	AuthWelcomeScreen,
	BiometricLockScreen,
	BiometricPromptScreen,
	ChangePasswordScreen,
	CheckEmailScreen,
	LoaderScreen,
	LocationPermissionScreen,
	PasswordRecoveryScreen,
	PasswordSuccessScreen,
	RegisterStep1,
	RegisterStep2,
	WelcomeTransitionScreen,
} from "../../screens";
import { splitName } from "../../auth/session";
import { getBiometricPreference, setPromptDismissed, storeToken } from "../../auth/biometricAuth";
import { useAuthFlowStore, useSessionStore } from "../../store";
import { handlePostLogin } from "../actions";
import { nav } from "../nav";
import { useSession } from "./useRouteProps";

/** Ingreso: bienvenida, login, registro, biometría y recuperación de contraseña. */

export function WelcomeRoute() {
	const showBiometricButton = useSessionStore((s) => s.showBiometricOnWelcome);
	return (
		<AuthWelcomeScreen
			onAlreadyHaveAccount={() => nav.push("Login")}
			onCreateAccount={() => nav.push("Register1")}
			showBiometricButton={showBiometricButton}
			onBiometricLogin={() => nav.push("BiometricLock")}
		/>
	);
}

export function LoginRoute() {
	const showBiometricButton = useSessionStore((s) => s.showBiometricOnWelcome);
	return (
		<AuthLoginScreen
			onBackPress={nav.goBack}
			onGoToRegister={() => nav.replace("Register1")}
			onLoginSuccess={async (s) => {
				useSessionStore.getState().setSession(s);
				nav.resetTo({ name: "Loader" });
				const pref = await getBiometricPreference();
				if (pref) {
					useSessionStore.getState().setBiometricEnabled(true);
					await storeToken(s.token);
				}
			}}
			onForgotPassword={() => nav.push("PasswordRecovery")}
			showBiometricButton={showBiometricButton}
			onBiometricLogin={() => nav.push("BiometricLock")}
		/>
	);
}

export function Register1Route() {
	const registerData = useAuthFlowStore((s) => s.registerData);
	return (
		<RegisterStep1
			initialData={registerData}
			onBack={nav.goBack}
			onNext={(data) => {
				useAuthFlowStore.getState().setRegisterData(data);
				nav.push("Register2");
			}}
			onGoToLogin={() => nav.replace("Login")}
		/>
	);
}

export function Register2Route() {
	const registerData = useAuthFlowStore((s) => s.registerData);
	if (!registerData) return null;
	return (
		<RegisterStep2
			firstName={registerData.firstName}
			lastName={registerData.lastName}
			email={registerData.email}
			referralCode={registerData.referralCode}
			onBack={nav.goBack}
			onGoToLogin={() => nav.replace("Login")}
			onNext={(s) => {
				// El código viaja en el propio POST /auth/register (ver src/services/authApi.ts). El
				// backend acredita ahí los puntos de bienvenida; useAppBootstrap los trae apenas se
				// setea la sesión acá.
				useSessionStore.getState().setSession(s);
				nav.replace("LocationPermission");
			}}
		/>
	);
}

export function LocationPermissionRoute() {
	return <LocationPermissionScreen onAllow={() => nav.replace("WelcomeTransition")} onSkip={() => nav.replace("WelcomeTransition")} />;
}

export function WelcomeTransitionRoute() {
	const session = useSession();
	if (!session) return null;
	return <WelcomeTransitionScreen name={splitName(session.user.name).firstName} onDone={() => nav.goMain("home")} />;
}

export function LoaderRoute() {
	return <LoaderScreen onDone={handlePostLogin} />;
}

export function BiometricLockRoute() {
	return (
		<BiometricLockScreen
			onSuccess={(s) => {
				useSessionStore.getState().setSession(s);
				nav.goMain("home");
			}}
			onFallback={() => {
				useSessionStore.getState().setBiometricEnabled(false);
				nav.resetTo({ name: "Welcome" });
			}}
		/>
	);
}

export function BiometricPromptRoute() {
	const session = useSession();
	if (!session) return null;
	return (
		<BiometricPromptScreen
			session={session}
			onEnable={() => {
				useSessionStore.getState().setBiometricEnabled(true);
				nav.goMain("home");
			}}
			onDismiss={async () => {
				await setPromptDismissed();
				nav.goMain("home");
			}}
		/>
	);
}

export function PasswordRecoveryRoute() {
	return (
		<PasswordRecoveryScreen
			onBack={nav.goBack}
			onSent={(email) => {
				useAuthFlowStore.getState().setRecovery({ email });
				nav.push("CheckEmail");
			}}
		/>
	);
}

export function CheckEmailRoute() {
	const email = useAuthFlowStore((s) => s.recoveryEmail);
	return (
		<CheckEmailScreen
			email={email}
			onBack={nav.goBack}
			onVerified={(code) => {
				useAuthFlowStore.getState().setRecovery({ code });
				nav.push("ChangePassword");
			}}
		/>
	);
}

export function ChangePasswordRoute() {
	const email = useAuthFlowStore((s) => s.recoveryEmail);
	const code = useAuthFlowStore((s) => s.recoveryCode);
	return (
		<ChangePasswordScreen
			email={email}
			code={code}
			onBack={nav.goBack}
			onSuccess={() => {
				useAuthFlowStore.getState().setRecovery({ code: "" });
				nav.resetTo({ name: "PasswordSuccess" });
			}}
		/>
	);
}

export function PasswordSuccessRoute() {
	// Al volver a "Iniciar sesión" el "atrás" lleva a la bienvenida, no a la recuperación.
	return <PasswordSuccessScreen onGoToLogin={() => nav.resetTo({ name: "Welcome" }, { name: "Login" })} />;
}
