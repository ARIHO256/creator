import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:ops/DisputesProvider").catch(() => undefined);

export { default } from "../orders/Disputes";
