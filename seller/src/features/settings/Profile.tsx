import React from "react";
import { RoleView } from "../../auth/RoleView";
import ProfileProviderView from "./Profile.ProviderView";
import ProfileSellerView from "./Profile.SellerView";

export default function ProfilePage() {
  return <RoleView provider={<ProfileProviderView />} seller={<ProfileSellerView />} />;
}
