import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProviderListingDetailView from "./ListingDetail.ProviderView";
import SellerListingDetailView from "./ListingDetail.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:listings/ListingDetail").catch(() => undefined);

export default function ListingDetailPage() {
  return (
    <RoleView provider={<ProviderListingDetailView />} seller={<SellerListingDetailView />} />
  );
}
