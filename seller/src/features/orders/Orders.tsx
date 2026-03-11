import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderOrdersView from "./Orders.ProviderView";
import SellerOrdersView from "./Orders.SellerView";

export default function OrdersPage() {
  return <RoleView provider={<ProviderOrdersView />} seller={<SellerOrdersView />} />;
}
