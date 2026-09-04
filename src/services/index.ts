export {
	scanTicket,
	getTickets,
	getTicket,
	updateTicket,
	deleteTicket,
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

export {
	campaignOfferToOffer,
	describeCampaignDiscount,
	getRecurringProducts,
	offerSavings,
	sortByOfferRelevance,
} from "./productsApi";

export type { RecurringProduct, BestOffer, AlternativeOffer, CampaignOffer } from "./productsApi";

export {
	ALL_CATEGORIES,
	describePromo,
	getOffers,
	offerBadge,
	offerCategories,
	offerPromo,
} from "./offersApi";

export type { Offer, OfferPage, PromoIcon, PromoMechanic, PromoWording } from "./offersApi";

export {
	getStoreChains,
	getNearbyStores,
	getFavoriteStores,
	updateFavoriteStores,
} from "./storesApi";

export type { StoreChain, NearbyStore, FavoriteStores } from "./storesApi";

export { getProductoPorEan } from "./sepaApi";

export type {
	ProductoDetalleResponse,
	ComercioPrecioResponse,
} from "./sepaApi";
