import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOffers, type Offer } from "../../services/offersApi";
import { getPointsBalance, getPointsHistory, redeemReward } from "../../services/pointsApi";
import type { TicketResponse } from "../../services/ticketApi";
import { historyEntryFromTx, resetAllStores, useOffersStore, usePointsStore, useScanStore, useSessionStore, useUiStore } from "..";

// vi.mock se hoistea por encima de los imports.
vi.mock("../../services/pointsApi", () => ({
	getPointsBalance: vi.fn(),
	getPointsHistory: vi.fn(),
	redeemReward: vi.fn(),
}));
vi.mock("../../services/offersApi", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../services/offersApi")>()),
	getOffers: vi.fn(),
}));


const mockBalance = vi.mocked(getPointsBalance);
const mockHistory = vi.mocked(getPointsHistory);
const mockRedeem = vi.mocked(redeemReward);
const mockOffers = vi.mocked(getOffers);

const sesion = {
	token: "t1",
	user: {
		id: 1,
		name: "Ana",
		email: "ana@test.com",
		profilePicture: null,
		address: null,
		alternativeBrandsEnabled: true,
		referralCode: null,
		points: 0,
		offersPushEnabled: true,
		createdAt: "2026-09-25T20:00:00",
	},
};

const oferta = (id: string) => ({ id, kind: "campaign", headline: "x" }) as Offer;

beforeEach(() => {
	resetAllStores();
	vi.clearAllMocks();
});

describe("resetAllStores", () => {
	it("deja todo el estado de la cuenta como recién abierta la app", () => {
		useSessionStore.getState().setSession(sesion);
		useSessionStore.getState().setBiometricEnabled(true);
		useUiStore.getState().setTab("offers");
		useUiStore.getState().showToast("hola");
		useScanStore.getState().setScannedTicket({ id: 9 } as TicketResponse);
		useScanStore.getState().setSelectedPdf({ name: "a.pdf", uri: "u", base64: "b" });
		useScanStore.getState().addAwaiting(5);
		useOffersStore.getState().open("campaign:1", oferta("campaign:1"));
		usePointsStore.setState({ balance: 80, history: [{ id: "1" } as never] });

		resetAllStores();

		expect(useSessionStore.getState().session).toBeNull();
		expect(useSessionStore.getState().biometricEnabled).toBe(false);
		expect(useUiStore.getState().tab).toBe("home");
		expect(useUiStore.getState().toastMessage).toBeNull();
		expect(useScanStore.getState().scannedTicket).toBeNull();
		expect(useScanStore.getState().selectedPdf).toBeNull();
		expect(useScanStore.getState().awaitingTicketIds).toEqual([]);
		expect(useOffersStore.getState().offers).toEqual([]);
		expect(useOffersStore.getState().selectedOfferId).toBeNull();
		expect(usePointsStore.getState().balance).toBe(0);
		expect(usePointsStore.getState().history).toEqual([]);
	});

	it("conserva lo que no depende de la cuenta (arranque)", () => {
		useSessionStore.getState().setBooted(true);
		useSessionStore.getState().setShowBiometricOnWelcome(true);
		resetAllStores();
		expect(useSessionStore.getState().booted).toBe(true);
		expect(useSessionStore.getState().showBiometricOnWelcome).toBe(true);
	});
});

describe("scanStore", () => {
	it("los tickets en espera van del más nuevo al más viejo y se quitan al avisar", () => {
		const s = useScanStore.getState();
		s.addAwaiting(1);
		s.addAwaiting(2);
		s.addAwaiting(3);
		expect(useScanStore.getState().awaitingTicketIds).toEqual([3, 2, 1]);
		useScanStore.getState().announce(2);
		expect(useScanStore.getState().awaitingTicketIds).toEqual([3, 1]);
	});

	it("startProcessing y finishProcessing controlan la pantalla de carga", () => {
		useScanStore.getState().startProcessing("pdf");
		expect(useScanStore.getState()).toMatchObject({ processingOcr: true, processingFileType: "pdf" });
		useScanStore.getState().finishProcessing();
		expect(useScanStore.getState()).toMatchObject({ processingOcr: false, processingFileType: null });
	});

	it("resetForRetry limpia el error, el PDF y el ticket, pero no los tickets en espera", () => {
		const s = useScanStore.getState();
		s.setOcrError("falló");
		s.setSelectedPdf({ name: "a.pdf", uri: "u", base64: "b" });
		s.setScannedTicket({ id: 1 } as TicketResponse);
		s.addAwaiting(7);
		useScanStore.getState().resetForRetry();
		expect(useScanStore.getState()).toMatchObject({ ocrErrorMsg: "", selectedPdf: null, scannedTicket: null });
		expect(useScanStore.getState().awaitingTicketIds).toEqual([7]);
	});
});

describe("pointsStore", () => {
	it("historyEntryFromTx elige el ícono según el motivo y conserva puntos y descripción", () => {
		const base = { id: 4, description: "Canje", points: -100, createdAt: "2026-09-25T20:00:00" };
		expect(historyEntryFromTx({ ...base, reason: "REDEEM" })).toMatchObject({ id: "4", icon: "gift-outline", title: "Canje", pts: -100 });
		expect(historyEntryFromTx({ ...base, reason: "REFERRAL_ACTIVATED" }).icon).toBe("people");
		expect(historyEntryFromTx({ ...base, reason: "REFERRAL_RETAINED" }).icon).toBe("heart-outline");
		expect(historyEntryFromTx({ ...base, reason: "REFERRAL_SIGNUP" }).icon).toBe("people-outline");
		expect(historyEntryFromTx({ ...base, reason: "REDEEM" }).date).not.toBe("");
	});

	it("refresh trae saldo e historial", async () => {
		mockBalance.mockResolvedValue({ balance: 120, referralCode: null });
		mockHistory.mockResolvedValue([{ id: 1, reason: "REDEEM", description: "d", points: 5, createdAt: "2026-09-25T20:00:00" }]);
		await usePointsStore.getState().refresh("t1");
		expect(usePointsStore.getState().balance).toBe(120);
		expect(usePointsStore.getState().history).toHaveLength(1);
	});

	it("si el backend no responde, refresh deja lo que había y no lanza", async () => {
		usePointsStore.setState({ balance: 50 });
		mockBalance.mockRejectedValue(new Error("caído"));
		mockHistory.mockResolvedValue([]);
		await expect(usePointsStore.getState().refresh("t1")).resolves.toBeUndefined();
		expect(usePointsStore.getState().balance).toBe(50);
	});

	it("redeem actualiza el saldo con el que devuelve el backend y vuelve a pedir el historial", async () => {
		mockRedeem.mockResolvedValue({ balance: 30, referralCode: null });
		mockBalance.mockResolvedValue({ balance: 30, referralCode: null });
		mockHistory.mockResolvedValue([]);
		expect(await usePointsStore.getState().redeem("t1", "r1", 90)).toBe(true);
		expect(usePointsStore.getState()).toMatchObject({ balance: 30, lastRedeemBalance: 30, redeeming: false });
		expect(mockRedeem).toHaveBeenCalledWith("t1", "r1", 90);
		expect(mockBalance).toHaveBeenCalled();
	});

	it("redeem ignora un segundo toque mientras hay un canje en curso", async () => {
		let terminar!: (v: { balance: number; referralCode: null }) => void;
		mockRedeem.mockReturnValue(new Promise((ok) => (terminar = ok)));
		mockBalance.mockResolvedValue({ balance: 0, referralCode: null });
		mockHistory.mockResolvedValue([]);
		const primero = usePointsStore.getState().redeem("t1", "r1", 90);
		expect(await usePointsStore.getState().redeem("t1", "r1", 90)).toBe(false);
		terminar({ balance: 10, referralCode: null });
		expect(await primero).toBe(true);
		expect(mockRedeem).toHaveBeenCalledOnce();
	});

	it("si el canje falla lanza el error del backend y libera el bloqueo", async () => {
		mockRedeem.mockRejectedValue(new Error("No te alcanzan los puntos"));
		await expect(usePointsStore.getState().redeem("t1", "r1", 90)).rejects.toThrow("No te alcanzan los puntos");
		expect(usePointsStore.getState().redeeming).toBe(false);
	});
});

describe("offersStore", () => {
	it("load guarda las ofertas del feed", async () => {
		mockOffers.mockResolvedValue({ items: [oferta("a")], page: 1, pageSize: 50, total: 1, totalPages: 1 } as never);
		await useOffersStore.getState().load("t1");
		expect(useOffersStore.getState().offers.map((o) => o.id)).toEqual(["a"]);
	});

	it("si el feed falla queda vacío en vez de romper", async () => {
		mockOffers.mockRejectedValue(new Error("caído"));
		await useOffersStore.getState().load("t1");
		expect(useOffersStore.getState().offers).toEqual([]);
	});

	it("descarta la respuesta de una sesión anterior", async () => {
		let terminar!: (v: never) => void;
		mockOffers.mockReturnValueOnce(new Promise((ok) => (terminar = ok)));
		const cargando = useOffersStore.getState().load("cuenta-vieja");
		useOffersStore.getState().reset(); // cerró sesión mientras se cargaba
		terminar({ items: [oferta("de-otra-cuenta")], page: 1, pageSize: 50, total: 1, totalPages: 1 } as never);
		await cargando;
		expect(useOffersStore.getState().offers).toEqual([]);
	});

	it("find resuelve por id y usa la oferta de respaldo si no está en el feed", () => {
		useOffersStore.setState({ offers: [oferta("a")] });
		expect(useOffersStore.getState().find("a")?.id).toBe("a");
		useOffersStore.getState().open("campaign:9", oferta("campaign:9"));
		expect(useOffersStore.getState().find("campaign:9")?.id).toBe("campaign:9");
		expect(useOffersStore.getState().selectedOfferId).toBe("campaign:9");
	});
});
