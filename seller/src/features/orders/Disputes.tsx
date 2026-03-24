import React from "react";
import SellerOrdersView from "./Orders.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:orders/Disputes").catch(() => undefined);

export default function SellerDisputesView() {
  return <SellerOrdersView initialScreen="disputes" />;
}
