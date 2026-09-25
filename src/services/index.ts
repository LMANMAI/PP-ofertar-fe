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
	bestKnownDiscount,
	campaignOfferToOffer,
	describeCampaignDiscount,
	getRecurringProducts,
	offerSavings,
	sortByOfferRelevance,
	summarizeOfferPromos,
} from "./productsApi";

export type {
	RecurringProduct,
	BestOffer,
	AlternativeOffer,
	CampaignOffer,
	FeaturedPromo,
	OfferPromoSummary,
} from "./productsApi";

export {
	describePromoLabel,
	pickProductPromo,
	readPromoLabel,
	readPromoLabels,
} from "./promoLabels";

export type { PromoCondition, PromoLabelKind, PromoLabelReading } from "./promoLabels";

export {
	ALL_CATEGORIES,
	describePromo,
	getOffers,
	offerBadge,
	offerCategories,
	offerCategoryLabel,
	offerPromo,
	resolveOffer,
} from "./offersApi";

export type { Offer, OfferPage, PromoIcon, PromoMechanic, PromoWording } from "./offersApi";

export {
	getStoreChains,
	getNearbyStores,
	getFavoriteStores,
	updateFavoriteStores,
} from "./storesApi";

export type { StoreChain, NearbyStore, FavoriteStores } from "./storesApi";

export { getProductoPorEan, getSucursalesCercanas, SepaError } from "./sepaApi";

export type {
	ProductoDetalleResponse,
	ComercioPrecioResponse,
	SucursalPrecio,
	SucursalesCercanas,
} from "./sepaApi";

export {
	getPointsBalance,
	getPointsHistory,
	redeemReward,
} from "./pointsApi";

export type {
	PointsReason,
	PointsTransactionResponse,
	PointsBalanceResponse,
} from "./pointsApi";
