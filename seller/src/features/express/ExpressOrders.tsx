import ExpressOrderDetail from "./ExpressOrderDetail";

import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:express/ExpressOrders").catch(() => undefined);

export default function ExpressOrders() {
  return <ExpressOrderDetail />;
}
