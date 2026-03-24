import { sellerBackendApi } from "../../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:livedealz/overview/SupplierDealzMarketplacePage").catch(() => undefined);

export { default as SupplierDealzMarketplacePage } from './SupplierDealzMarketplaceLegacy';
export { default } from './SupplierDealzMarketplaceLegacy';
