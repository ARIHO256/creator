import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderOrdersView from "./Orders.ProviderView";
import SellerOrdersView from "./Orders.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:orders/Orders").catch(() => undefined);

export default function OrdersPage() {
  return <RoleView provider={<ProviderOrdersView />} seller={<SellerOrdersView />} />;
}
