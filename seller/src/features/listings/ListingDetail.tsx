import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderListingDetailView from "./ListingDetail.ProviderView";
import SellerListingDetailView from "./ListingDetail.SellerView";

export default function ListingDetailPage() {
  return (
    <RoleView provider={<ProviderListingDetailView />} seller={<SellerListingDetailView />} />
  );
}
