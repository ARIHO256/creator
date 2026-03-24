import React from "react";
import SellerOrdersView from "./Orders.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:orders/ReturnsRmas").catch(() => undefined);

export default function SellerReturnsRmasView() {
  return <SellerOrdersView initialScreen="returns" />;
}
