const BASE_URL = "https://ocr-api-ofertar-ocr-ofertar.qr2vg3.easypanel.host/api/v1";

let cachedToken: string | null = null;

export type DiscountItem = {
	description: string;
	amount: number;
};

export type ImageQuality = {
	is_blurry: boolean;
	is_dark: boolean;
	score: number;
	feedback?: string;
};

export type TicketItem = {
	description: string;
	raw_description: string;
	price: number;
	original_price: number;
	code: string;
	quantity: number;
	category: string;
	discount: DiscountItem | null;
};

export type OCRResponse = {
	supermarket_name?: string;
	ticket_id?: string;
	image_quality: ImageQuality | null;
	items: TicketItem[];
	discounts: DiscountItem[];
	subtotal: number;
	total_discounts: number;
	total: number;
};

type LoginResponse = {
	access_token: string;
	token_type?: string;
};

export async function login(): Promise<string> {
	if (cachedToken) return cachedToken;

	const res = await fetch(`${BASE_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: "admin",
			password: "changeme",
		}),
	});

	if (!res.ok) {
		throw new Error(`Error de autenticación (${res.status})`);
	}

	const data: LoginResponse = await res.json();
	cachedToken = data.access_token;
	return cachedToken;
}

function getAuthHeaders(token: string): HeadersInit {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

export async function sendOcrTicket(
	fileType: "pdf" | "image",
	content: string,
): Promise<OCRResponse> {
	const token = await login();

	const res = await fetch(`${BASE_URL}/ocr/ticket`, {
		method: "POST",
		headers: getAuthHeaders(token),
		body: JSON.stringify({ file_type: fileType, content }),
	});

	if (!res.ok) {
		const message = await parseErrorMessage(res);
		throw new Error(message || `Error del OCR (${res.status})`);
	}

	return res.json() as Promise<OCRResponse>;
}

export async function sendOcrTickets(images: string[]): Promise<OCRResponse> {
	const token = await login();

	const res = await fetch(`${BASE_URL}/ocr/tickets`, {
		method: "POST",
		headers: getAuthHeaders(token),
		body: JSON.stringify({ images }),
	});

	if (!res.ok) {
		const message = await parseErrorMessage(res);
		throw new Error(message || `Error del OCR (${res.status})`);
	}

	return res.json() as Promise<OCRResponse>;
}

async function parseErrorMessage(res: Response): Promise<string> {
	try {
		const text = await res.text();
		const json = JSON.parse(text);
		if (Array.isArray(json.detail)) {
			return json.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
		}
		return json.detail || json.message || text;
	} catch {
		return `Error del servidor (${res.status})`;
	}
}
