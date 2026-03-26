import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:ops/ShippingProfiles").catch(() => undefined);

export { default } from "./ops_shipping_profiles_premium";
