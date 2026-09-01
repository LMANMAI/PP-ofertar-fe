export {
	scanTicket,
	getTickets,
	getTicket,
	updateTicket,
	getSavingsReport,
} from "./ticketApi";

export type {
	TicketItemResponse,
	TicketResponse,
	SavingsReportResponse,
	UpdateTicketData,
} from "./ticketApi";

export {
	register,
	login,
	getProfile,
	updateProfile,
	changePassword,
} from "./authApi";

export type {
	UserProfile,
	AuthResponse,
	UpdateProfileData,
} from "./authApi";

export { getProductoPorEan } from "./sepaApi";

	ProductoDetalleResponse,
	ComercioPrecioResponse,
} from "./sepaApi";
