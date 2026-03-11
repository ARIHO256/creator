import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderInventoryView from "./Inventory.ProviderView";
import SellerInventoryView from "./Inventory.SellerView";

export default function InventoryPage() {
  return <RoleView provider={<ProviderInventoryView />} seller={<SellerInventoryView />} />;
}
