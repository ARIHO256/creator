import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderInventoryView from "./Inventory.ProviderView";
import SellerInventoryView from "./Inventory.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:ops/Inventory").catch(() => undefined);

export default function InventoryPage() {
  return <RoleView provider={<ProviderInventoryView />} seller={<SellerInventoryView />} />;
}
