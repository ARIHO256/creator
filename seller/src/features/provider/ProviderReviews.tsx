import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderReviews").catch(() => undefined);

export { default } from "./provider_reviews_orange_star_ratings_previewable";
