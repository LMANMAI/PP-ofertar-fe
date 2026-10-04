import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { storeToken } from "../../auth/biometricAuth";
import { REWARDS } from "../../data/rewards";
import {
	ChangePasswordAuthScreen,
	ConfirmRedeemScreen,
	HelpCenterScreen,
	LogoutConfirmScreen,
	PaymentMethodsScreen,
	PersonalDataScreen,
	PlansScreen,
	PointsHistoryScreen,
	PointsScreen,
	RedeemSuccessScreen,
	RewardDetailScreen,
} from "../../screens";
import { usePointsStore, useSessionStore, useUiStore } from "../../store";
import { handleLogout } from "../actions";
import { nav } from "../nav";
import type { RootStackParamList } from "../types";
import { useSession, useTabProps } from "./useRouteProps";

type Props<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

const findReward = (id: string | null) => REWARDS.find((r) => r.id === id) ?? REWARDS[0];

// ── Puntos ───────────────────────────────────────────────────────────

export function PointsRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const balance = usePointsStore((s) => s.balance);
	if (!session) return null;
	return (
		<PointsScreen
			{...tabProps}
			session={session}
			pointsBalance={balance}
			onBack={() => nav.goMain("profile")}
			onSelectReward={(id) => nav.push("RewardDetail", { rewardId: id })}
			onShowHistory={() => nav.push("PointsHistory")}
		/>
	);
}

export function RewardDetailRoute({ route }: Props<"RewardDetail">) {
	const tabProps = useTabProps();
	const balance = usePointsStore((s) => s.balance);
	return (
		<RewardDetailScreen
			{...tabProps}
			reward={findReward(route.params.rewardId)}
			pointsBalance={balance}
			onBack={() => nav.backTo("Points")}
			onRedeem={() => nav.push("ConfirmRedeem", { rewardId: route.params.rewardId })}
		/>
	);
}

export function ConfirmRedeemRoute({ route }: Props<"ConfirmRedeem">) {
	const session = useSession();
	const balance = usePointsStore((s) => s.balance);
	if (!session) return null;
	const reward = findReward(route.params.rewardId);
	return (
		<ConfirmRedeemScreen
			reward={reward}
			pointsBalance={balance}
			onCancel={nav.goBack}
			onConfirm={async () => {
				// El saldo posta vive en el backend: /points/redeem valida ahí mismo que alcancen los
				// puntos (409 si no) y devuelve el saldo actualizado (ver usePointsStore.redeem).
				try {
					const redeemed = await usePointsStore.getState().redeem(session.token, reward.id, reward.points);
					if (redeemed) nav.replace("RedeemSuccess", { rewardId: reward.id });
				} catch (err) {
					useUiStore.getState().showToast(err instanceof Error ? err.message : "No se pudo canjear. Probá de nuevo.");
					nav.goBack();
				}
			}}
		/>
	);
}

export function RedeemSuccessRoute({ route }: Props<"RedeemSuccess">) {
	const tabProps = useTabProps();
	const remaining = usePointsStore((s) => s.lastRedeemBalance);
	return (
		<RedeemSuccessScreen
			{...tabProps}
			reward={findReward(route.params.rewardId)}
			remainingPoints={remaining}
			onSeeMy={() => nav.push("PointsHistory")}
			onKeepRedeeming={() => nav.backTo("Points")}
		/>
	);
}

export function PointsHistoryRoute() {
	const tabProps = useTabProps();
	const entries = usePointsStore((s) => s.history);
	return <PointsHistoryScreen {...tabProps} entries={entries} onBack={() => nav.backTo("Points")} />;
}

// ── Perfil ───────────────────────────────────────────────────────────

export function PersonalDataRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	if (!session) return null;
	return (
		<PersonalDataScreen
			{...tabProps}
			session={session}
			onBack={(msg) => {
				if (msg) useUiStore.getState().showToast(msg);
				nav.goMain("profile");
			}}
			// An email change re-issues the token for the new address; the one kept
			// for biometric login would stop matching any account.
			onSessionUpdate={(s) => {
				useSessionStore.getState().setSession(s);
				if (useSessionStore.getState().biometricEnabled) storeToken(s.token).catch(() => {});
			}}
		/>
	);
}

export function PaymentMethodsRoute() {
	const tabProps = useTabProps();
	return <PaymentMethodsScreen {...tabProps} onBack={() => nav.goMain("profile")} />;
}

export function PlansRoute() {
	const tabProps = useTabProps();
	return <PlansScreen {...tabProps} onBack={() => nav.goMain("profile")} />;
}

export function HelpCenterRoute() {
	const tabProps = useTabProps();
	return <HelpCenterScreen {...tabProps} onBack={() => nav.goMain("profile")} />;
}

export function ChangePasswordAuthRoute() {
	const session = useSession();
	const tabProps = useTabProps();
	const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
	if (!session) return null;
	return (
		<ChangePasswordAuthScreen
			{...tabProps}
			session={session}
			onSessionUpdate={useSessionStore.getState().setSession}
			biometricEnabled={biometricEnabled}
			onBack={(msg) => {
				if (msg) useUiStore.getState().showToast(msg);
				nav.goMain("profile");
			}}
		/>
	);
}

export function LogoutConfirmRoute() {
	return <LogoutConfirmScreen onCancel={() => nav.goMain("profile")} onConfirm={handleLogout} />;
}
