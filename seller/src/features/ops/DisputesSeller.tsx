import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:ops/DisputesSeller").catch(() => undefined);

export { default } from "../orders/Disputes";
