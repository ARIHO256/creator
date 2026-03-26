import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProfileProviderView from "./Profile.ProviderView";
import ProfileSellerView from "./Profile.SellerView";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:settings/Profile").catch(() => undefined);

export default function ProfilePage() {
  return <RoleView provider={<ProfileProviderView />} seller={<ProfileSellerView />} />;
}
