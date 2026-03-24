import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderQuoteNew").catch(() => undefined);

export { default } from "./provider_new_quote_provider_new_quote_previewable";
