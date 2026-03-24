import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:settings/Profile.SellerView").catch(() => undefined);

export { default } from "./supplier_hub_profile_storefront_previewable";
