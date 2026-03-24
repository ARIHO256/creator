import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:ops/Warehouses").catch(() => undefined);

export { default } from "./ops_warehouses_premium";
