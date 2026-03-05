import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../src/server.js";

const dbFile = join(tmpdir(), `mldz_backend_test_${Date.now()}.json`);
const app = createApp({ port: 0, host: "127.0.0.1", dbFile });

async function requestJson(path, { method = "GET", body, token } = {}) {
  const address = app.server.address();
  const url = `http://${address.address}:${address.port}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  let json = null;
  if (text) json = JSON.parse(text);
  return { status: response.status, json };
}

let token = null;

test.before(async () => {
  await app.start();
});

test.after(async () => {
  await app.stop();
  rmSync(dbFile, { force: true });
});

test("logs in with the seed creator account", async () => {
  const response = await requestJson("/api/auth/login", {
    method: "POST",
    body: { email: "creator@mylivedealz.com", password: "Password123!" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(response.json.data.token);
  assert.equal(response.json.data.user.email, "creator@mylivedealz.com");
  token = response.json.data.token;
});

test("returns bootstrap data with nav badges", async () => {
  const response = await requestJson("/api/app/bootstrap", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.creatorProfile.handle, "ronald.creates");
  assert.ok(response.json.data.navBadges.proposals >= 1);
});

test("returns public landing content for the creator portal", async () => {
  const response = await requestJson("/api/landing/content");
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.match(response.json.data.hero.title, /creator/i);
  assert.ok(Array.isArray(response.json.data.stats));
  assert.ok(response.json.data.stats.length >= 3);
});

test("returns backend-driven home feed data", async () => {
  const response = await requestJson("/api/dashboard/feed", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.match(response.json.data.hero.title, /Welcome back/);
  assert.ok(Array.isArray(response.json.data.followedSellers));
  assert.ok(response.json.data.followedSellers.some((entry) => entry.id === "seller_glowup"));
  assert.ok(Array.isArray(response.json.data.featuredReplays));
});

test("returns backend-driven my day workspace data", async () => {
  const response = await requestJson("/api/dashboard/my-day", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(Array.isArray(response.json.data.kpis));
  assert.ok(Array.isArray(response.json.data.tasks));
  assert.ok(Array.isArray(response.json.data.agenda));
  assert.ok(response.json.data.kpis.some((entry) => entry.id === "myday_kpi_money"));
});

test("lists notifications and can mark them all as read", async () => {
  const listBefore = await requestJson("/api/notifications", { token });
  assert.equal(listBefore.status, 200);
  assert.equal(listBefore.json.ok, true);
  assert.ok(listBefore.json.data.some((entry) => entry.read === false));

  const markAll = await requestJson("/api/notifications/read-all", {
    method: "POST",
    token
  });
  assert.equal(markAll.status, 200);
  assert.equal(markAll.json.ok, true);
  assert.ok(markAll.json.data.updated >= 1);

  const listAfter = await requestJson("/api/notifications", { token });
  assert.equal(listAfter.status, 200);
  assert.ok(listAfter.json.data.every((entry) => entry.read === true));
});

test("returns a dedicated backend settings payload for the full settings page", async () => {
  const response = await requestJson("/api/settings", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.userId, "user_ronald");
  assert.equal(response.json.data.profile.name, "Ronald Isabirye");
  assert.equal(response.json.data.socials.instagram, "@ronald.creates");
  assert.equal(response.json.data.settings.notifications.proposals, true);
  assert.ok(Array.isArray(response.json.data.settings.devices));
  assert.ok(Array.isArray(response.json.data.settings.audit));
});

test("persists full settings page edits through the dedicated settings API", async () => {
  const patchResponse = await requestJson("/api/settings", {
    method: "PATCH",
    token,
    body: {
      profile: { tagline: "Backend-driven creator settings" },
      socials: { instagram: "@backend.creator" },
      review: { acceptTerms: true },
      notifications: { platformNews: true },
      settings: {
        calendar: { googleConnected: true },
        privacy: {
          profileVisibility: "Private",
          blockedSellers: ["Fake Dealz Ltd", "Noisy Seller"]
        }
      }
    }
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.json.ok, true);
  assert.equal(patchResponse.json.data.profile.tagline, "Backend-driven creator settings");
  assert.equal(patchResponse.json.data.socials.instagram, "@backend.creator");
  assert.equal(patchResponse.json.data.review.acceptTerms, true);
  assert.equal(patchResponse.json.data.notifications.platformNews, true);
  assert.equal(patchResponse.json.data.settings.calendar.googleConnected, true);
  assert.equal(patchResponse.json.data.settings.privacy.profileVisibility, "Private");
  assert.ok(patchResponse.json.data.settings.privacy.blockedSellers.includes("Noisy Seller"));

  const getAfter = await requestJson("/api/settings", { token });
  assert.equal(getAfter.status, 200);
  assert.equal(getAfter.json.data.socials.instagram, "@backend.creator");
  assert.equal(getAfter.json.data.settings.notifications.platformNews, true);
});

test("can send and verify payout settings verification from the backend", async () => {
  const sendCode = await requestJson("/api/settings/payout/send-code", {
    method: "POST",
    token,
    body: {
      payout: { method: "Bank transfer", currency: "USD" }
    }
  });

  assert.equal(sendCode.status, 200);
  assert.equal(sendCode.json.ok, true);
  assert.equal(sendCode.json.data.payout.verification.status, "code_sent");
  assert.equal(sendCode.json.data.payout.verification.lastSentTo, "Bank transfer");

  const verify = await requestJson("/api/settings/payout/verify", {
    method: "POST",
    token,
    body: {
      payout: { method: "Bank transfer" }
    }
  });

  assert.equal(verify.status, 200);
  assert.equal(verify.json.ok, true);
  assert.equal(verify.json.data.payout.verification.status, "verified");
});

test("can sign out remembered settings devices through backend actions", async () => {
  const removeOne = await requestJson("/api/settings/devices/device_1", {
    method: "DELETE",
    token
  });
  assert.equal(removeOne.status, 200);
  assert.equal(removeOne.json.ok, true);
  assert.ok(removeOne.json.data.settings.devices.every((device) => device.id !== "device_1"));

  const signOutAll = await requestJson("/api/settings/devices/sign-out-all", {
    method: "POST",
    token
  });
  assert.equal(signOutAll.status, 200);
  assert.equal(signOutAll.json.ok, true);
  assert.equal(signOutAll.json.data.settings.devices.length, 0);
});

test("returns the public creator profile with campaigns replays and reviews", async () => {
  const response = await requestJson("/api/public-profile/ronald.creates", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.handle, "ronald.creates");
  assert.ok(Array.isArray(response.json.data.latestCampaigns));
  assert.ok(Array.isArray(response.json.data.recentReplays));
  assert.ok(Array.isArray(response.json.data.reviews));
});

test("lists live sessions with multi-status + campaign filtering", async () => {
  const all = await requestJson("/api/live/sessions", { token });
  assert.equal(all.status, 200);
  assert.equal(all.json.ok, true);
  assert.ok(Array.isArray(all.json.data));
  assert.ok(all.json.data.length >= 1);

  const scheduledOnly = await requestJson("/api/live/sessions?status=scheduled", { token });
  assert.equal(scheduledOnly.status, 200);
  assert.ok(scheduledOnly.json.data.every((entry) => String(entry.status).toLowerCase() === "scheduled"));

  const multi = await requestJson("/api/live/sessions?status=scheduled,draft", { token });
  assert.equal(multi.status, 200);
  assert.ok(multi.json.data.some((entry) => String(entry.status).toLowerCase() === "scheduled"));
  assert.ok(multi.json.data.some((entry) => String(entry.status).toLowerCase() === "draft"));

  const campaignScoped = await requestJson("/api/live/sessions?campaignId=camp_glowup", { token });
  assert.equal(campaignScoped.status, 200);
  assert.ok(campaignScoped.json.data.length >= 1);
  assert.ok(campaignScoped.json.data.every((entry) => String(entry.campaignId) === "camp_glowup"));
});



test("returns backend-driven reviews dashboard data with team creator options", async () => {
  const response = await requestJson("/api/reviews/dashboard", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.canViewWorkspace, true);
  assert.equal(response.json.data.selectedCreator.id, "all");
  assert.ok(Array.isArray(response.json.data.creators));
  assert.ok(response.json.data.creators.some((entry) => entry.id === "creator_ronald"));
  assert.ok(response.json.data.creators.some((entry) => entry.id === "creator_amina"));
  assert.ok(Array.isArray(response.json.data.reviews));
  assert.ok(response.json.data.reviews.some((entry) => entry.creatorId === "creator_amina"));
});

test("filters backend-driven reviews dashboard by creator and visibility", async () => {
  const response = await requestJson("/api/reviews/dashboard?creatorId=creator_amina&scope=public", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.selectedCreator.id, "creator_amina");
  assert.ok(response.json.data.reviews.length >= 1);
  assert.ok(response.json.data.reviews.every((entry) => entry.creatorId === "creator_amina"));
  assert.ok(response.json.data.reviews.every((entry) => entry.publicReview === true));
});

test("lists seller invites and records invite responses", async () => {
  const listResponse = await requestJson("/api/invites", { token });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.ok, true);
  assert.ok(Array.isArray(listResponse.json.data));
  const invite = listResponse.json.data.find((entry) => entry.id === "invite_glowup");
  assert.ok(invite);
  assert.equal(invite.seller, "GlowUp Hub");
  assert.equal(invite.currency, "USD");

  const respondResponse = await requestJson("/api/invites/invite_glowup/respond", {
    method: "POST",
    token,
    body: { decision: "negotiating" }
  });
  assert.equal(respondResponse.status, 201);
  assert.equal(respondResponse.json.ok, true);
  assert.equal(respondResponse.json.data.status, "negotiating");

  const listAfter = await requestJson("/api/invites?status=negotiating", { token });
  assert.equal(listAfter.status, 200);
  assert.ok(listAfter.json.data.some((entry) => entry.id === "invite_glowup"));
});

test("returns audit logs for owner roles with audit visibility", async () => {
  const response = await requestJson("/api/audit-logs", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(Array.isArray(response.json.data));
  assert.ok(response.json.data.length >= 3);
});

test("can switch the current shell role and persist it on the session user", async () => {
  const switchResponse = await requestJson("/api/auth/switch-role", {
    method: "POST",
    token,
    body: { role: "Seller" }
  });
  assert.equal(switchResponse.status, 200);
  assert.equal(switchResponse.json.ok, true);
  assert.equal(switchResponse.json.data.user.currentRole, "Seller");

  const meAfterSwitch = await requestJson("/api/me", { token });
  assert.equal(meAfterSwitch.status, 200);
  assert.equal(meAfterSwitch.json.data.user.currentRole, "Seller");

  const switchBack = await requestJson("/api/auth/switch-role", {
    method: "POST",
    token,
    body: { role: "Creator" }
  });
  assert.equal(switchBack.status, 200);
  assert.equal(switchBack.json.data.user.currentRole, "Creator");
});

test("returns workspace roles with owner access to reviews and subscription", async () => {
  const response = await requestJson("/api/roles", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.currentMember.email, "creator@mylivedealz.com");
  assert.equal(response.json.data.currentMember.roleId, "role_creator_owner");
  assert.equal(response.json.data.effectivePermissions["reviews.view"], true);
  assert.equal(response.json.data.effectivePermissions["subscription.view"], true);

  assert.ok(response.json.data.workspaceSecurity);
  assert.equal(response.json.data.workspaceSecurity.require2FA, true);
  assert.equal(response.json.data.workspaceSecurity.allowExternalInvites, false);
  assert.equal(response.json.data.workspaceSecurity.supplierGuestExpiryHours, 24);
});

test("enforces and persists workspace invite/security policies", async () => {
  const blockedInvite = await requestJson("/api/roles/invites", {
    method: "POST",
    token,
    body: {
      name: "External User",
      email: "external.user@gmail.com",
      roleId: "role_moderator",
      seat: "Team"
    }
  });

  assert.equal(blockedInvite.status, 403);
  assert.equal(blockedInvite.json.ok, false);
  assert.equal(blockedInvite.json.error.code, "EXTERNAL_INVITES_BLOCKED");

  const patchPolicy = await requestJson("/api/roles/security", {
    method: "PATCH",
    token,
    body: {
      allowExternalInvites: true,
      supplierGuestExpiryHours: 48
    }
  });

  assert.equal(patchPolicy.status, 200);
  assert.equal(patchPolicy.json.ok, true);
  assert.equal(patchPolicy.json.data.allowExternalInvites, true);
  assert.equal(patchPolicy.json.data.supplierGuestExpiryHours, 48);

  const allowedInvite = await requestJson("/api/roles/invites", {
    method: "POST",
    token,
    body: {
      name: "External User",
      email: "external.user@gmail.com",
      roleId: "role_moderator",
      seat: "Supplier Guest"
    }
  });

  assert.equal(allowedInvite.status, 201);
  assert.equal(allowedInvite.json.ok, true);
  assert.equal(allowedInvite.json.data.email, "external.user@gmail.com");
  assert.equal(allowedInvite.json.data.expiresAtLabel, "In 2 days");

  const rolesAfter = await requestJson("/api/roles", { token });
  assert.equal(rolesAfter.status, 200);
  assert.equal(rolesAfter.json.data.workspaceSecurity.allowExternalInvites, true);
  assert.equal(rolesAfter.json.data.workspaceSecurity.supplierGuestExpiryHours, 48);
});

test("can update current role permissions and refresh effective access", async () => {
  const disableResponse = await requestJson("/api/roles/role_creator_owner", {
    method: "PATCH",
    token,
    body: {
      perms: {
        "reviews.view": false
      }
    }
  });

  assert.equal(disableResponse.status, 200);
  assert.equal(disableResponse.json.ok, true);
  assert.equal(disableResponse.json.data.perms["reviews.view"], false);

  const afterDisable = await requestJson("/api/roles", { token });
  assert.equal(afterDisable.status, 200);
  assert.equal(afterDisable.json.data.effectivePermissions["reviews.view"], false);

  const reviewsDenied = await requestJson("/api/reviews/dashboard", { token });
  assert.equal(reviewsDenied.status, 403);
  assert.equal(reviewsDenied.json.ok, false);

  const enableResponse = await requestJson("/api/roles/role_creator_owner", {
    method: "PATCH",
    token,
    body: {
      perms: {
        "reviews.view": true
      }
    }
  });

  assert.equal(enableResponse.status, 200);
  assert.equal(enableResponse.json.ok, true);
  assert.equal(enableResponse.json.data.perms["reviews.view"], true);

  const afterEnable = await requestJson("/api/roles", { token });
  assert.equal(afterEnable.status, 200);
  assert.equal(afterEnable.json.data.effectivePermissions["reviews.view"], true);

  const reviewsEnabled = await requestJson("/api/reviews/dashboard", { token });
  assert.equal(reviewsEnabled.status, 200);
  assert.equal(reviewsEnabled.json.ok, true);
});

test("can create update and delete a custom workspace role", async () => {
  const createResponse = await requestJson("/api/roles", {
    method: "POST",
    token,
    body: {
      name: "QA Reviewer",
      badge: "Custom",
      description: "Can review QA workflows.",
      perms: {
        "reviews.view": true,
        "subscription.view": false
      }
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.ok, true);
  const roleId = createResponse.json.data.id;
  assert.ok(roleId);
  assert.equal(createResponse.json.data.name, "QA Reviewer");
  assert.equal(createResponse.json.data.perms["reviews.view"], true);

  const patchResponse = await requestJson(`/api/roles/${roleId}`, {
    method: "PATCH",
    token,
    body: {
      description: "Updated QA review permissions.",
      perms: {
        "subscription.view": true
      }
    }
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.json.ok, true);
  assert.equal(patchResponse.json.data.description, "Updated QA review permissions.");
  assert.equal(patchResponse.json.data.perms["subscription.view"], true);

  const listResponse = await requestJson("/api/roles", { token });
  assert.equal(listResponse.status, 200);
  assert.ok(listResponse.json.data.roles.some((role) => role.id === roleId));

  const deleteResponse = await requestJson(`/api/roles/${roleId}`, {
    method: "DELETE",
    token
  });

  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.json.ok, true);
  assert.equal(deleteResponse.json.data.deleted, true);

  const afterDelete = await requestJson("/api/roles", { token });
  assert.equal(afterDelete.status, 200);
  assert.ok(!afterDelete.json.data.roles.some((role) => role.id === roleId));
});

test("returns supplier giveaway inventory for a live campaign", async () => {
  const response = await requestJson("/api/live/campaigns/cp_autumn_beauty/giveaways", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.campaignId, "cp_autumn_beauty");

  const serum = response.json.data.featuredItems.find((entry) => entry.itemId === "it_serum");
  assert.ok(serum);
  assert.equal(serum.totalQuantity, 100);
  assert.equal(serum.allocatedQuantity, 50);
  assert.equal(serum.availableQuantity, 50);

  const beautyKit = response.json.data.customGiveaways.find((entry) => entry.id === "sgw_beauty_kit");
  assert.ok(beautyKit);
  assert.equal(beautyKit.totalQuantity, 6);
  assert.equal(beautyKit.allocatedQuantity, 1);
  assert.equal(beautyKit.availableQuantity, 5);
});

test("can follow a seller", async () => {
  const response = await requestJson("/api/sellers/seller_evgadget/follow", {
    method: "POST",
    token,
    body: { follow: true }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.id, "seller_evgadget");
  assert.equal(response.json.data.isFollowing, true);
});


test("lists opportunities and persists save state", async () => {
  const listResponse = await requestJson("/api/opportunities", { token });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.ok, true);
  assert.ok(Array.isArray(listResponse.json.data));
  const glowup = listResponse.json.data.find((entry) => entry.id === "opp_glowup_flash");
  assert.ok(glowup);
  assert.equal(glowup.title, "Autumn Beauty Flash");
  assert.equal(glowup.isSaved, true);
  assert.equal(glowup.latestProposalId, "proposal_glowup");

  const unsaveResponse = await requestJson("/api/opportunities/opp_glowup_flash/save", {
    method: "POST",
    token,
    body: { saved: false }
  });
  assert.equal(unsaveResponse.status, 200);
  assert.equal(unsaveResponse.json.ok, true);
  assert.equal(unsaveResponse.json.data.isSaved, false);

  const saveResponse = await requestJson("/api/opportunities/opp_glowup_flash/save", {
    method: "POST",
    token,
    body: { saved: true }
  });
  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.json.ok, true);
  assert.equal(saveResponse.json.data.isSaved, true);
});

test("returns campaign board rows with linked collaboration and runtime ids", async () => {
  const response = await requestJson("/api/campaign-board", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(Array.isArray(response.json.data));

  const gadgetmart = response.json.data.find((entry) => entry.id === "camp_gadgetmart");
  assert.ok(gadgetmart);
  assert.equal(gadgetmart.stage, "negotiating");
  assert.equal(gadgetmart.proposalId, "proposal_gadgetmart");
  assert.equal(gadgetmart.contractId, "contract_gadgetmart");
  assert.equal(gadgetmart.latestLiveSessionId, "live_tech_friday");
  assert.equal(gadgetmart.latestAdCampaignId, "adz_powerbank");
});

test("returns backend-driven dealz and adz marketplace cards", async () => {
  const dealzResponse = await requestJson("/api/dealz-marketplace", { token });
  assert.equal(dealzResponse.status, 200);
  assert.equal(dealzResponse.json.ok, true);
  assert.ok(Array.isArray(dealzResponse.json.data));

  const glowupDeal = dealzResponse.json.data.find((entry) => entry.id === "camp_glowup");
  assert.ok(glowupDeal);
  assert.equal(glowupDeal.kind, "hybrid");
  assert.equal(glowupDeal.liveSessionId, "live_beauty_flash");
  assert.equal(glowupDeal.adCampaignId, "adz_glowup_serum");
  assert.equal(glowupDeal.hasReplay, true);

  const adzResponse = await requestJson("/api/adz/marketplace", { token });
  assert.equal(adzResponse.status, 200);
  assert.equal(adzResponse.json.ok, true);
  assert.ok(Array.isArray(adzResponse.json.data));

  const powerbank = adzResponse.json.data.find((entry) => entry.id === "adz_powerbank");
  assert.ok(powerbank);
  assert.equal(powerbank.campaignId, "camp_gadgetmart");
  assert.equal(powerbank.seller, "GadgetMart Africa");
  assert.equal(powerbank.linkedLinks, 1);
  assert.equal(powerbank.lowStock, true);
});

test("can add a proposal message", async () => {
  const response = await requestJson("/api/proposals/proposal_glowup/messages", {
    method: "POST",
    token,
    body: { body: "Please confirm the kill fee before sign-off." }
  });
  assert.equal(response.status, 201);
  assert.equal(response.json.ok, true);
  const lastMessage = response.json.data.messages.at(-1);
  assert.match(lastMessage.body, /kill fee/i);
});

test("can patch proposal terms", async () => {
  const response = await requestJson("/api/proposals/proposal_glowup", {
    method: "PATCH",
    token,
    body: {
      notesShort: "Updated from automated test.",
      terms: {
        killFee: "$120",
        exclusivityWindow: "7 days"
      }
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.notesShort, "Updated from automated test.");
  assert.equal(response.json.data.terms.killFee, "$120");
  assert.equal(response.json.data.terms.exclusivityWindow, "7 days");
});

test("can request a payout", async () => {
  const response = await requestJson("/api/earnings/payouts/request", {
    method: "POST",
    token,
    body: { amount: 100, method: "Bank transfer" }
  });
  assert.equal(response.status, 201);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.amount, 100);
  assert.equal(response.json.data.status, "Requested");
});

test("returns enriched earnings summary with payout method details", async () => {
  const response = await requestJson("/api/earnings/summary", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.summary.currency, "USD");
  assert.equal(response.json.data.payoutMethod.methodType, "bank");
  assert.match(response.json.data.payoutMethod.detail, /Ronald Isabirye/i);
  assert.ok(Array.isArray(response.json.data.byMonth));
});

test("returns filtered payout history from the backend ledger", async () => {
  const response = await requestJson("/api/earnings/payouts?status=Requested&q=MLDZ-P", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(Array.isArray(response.json.data));
  assert.ok(response.json.data.length >= 1);
  assert.equal(response.json.data[0].status, "Requested");
});

test("returns backend analytics overview payload", async () => {
  const response = await requestJson("/api/analytics/overview", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.rank.currentTier, "Silver");
  assert.ok(Array.isArray(response.json.data.campaigns));
  assert.ok(Array.isArray(response.json.data.trend));
  assert.ok(response.json.data.metricsByCategory.All["30"].salesDriven > 0);
});

test("resolves a default live studio workspace when opened without sessionId", async () => {
  const response = await requestJson("/api/live/studio/default", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.ok(response.json.data.session);
  assert.ok(typeof response.json.data.session.id === "string");
  assert.ok(response.json.data.session.id.length > 0);
  // Tool configs are part of the studio workspace response.
  assert.ok(response.json.data.audienceNotifications);
});

test("can start a live session", async () => {
  const response = await requestJson("/api/live/studio/live_beauty_flash/start", {
    method: "POST",
    token
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.status, "live");
  assert.equal(response.json.data.studio.mode, "broadcast");
});

test("can request contract termination", async () => {
  const response = await requestJson("/api/contracts/contract_gadgetmart/terminate-request", {
    method: "POST",
    token,
    body: {
      reason: "timeline_breakdown",
      explanation: "The revised production calendar no longer fits the signed dates."
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.id, "contract_gadgetmart");
  assert.equal(response.json.data.status, "termination_requested");
  assert.equal(response.json.data.termination.requested, true);
  assert.match(response.json.data.termination.explanation, /calendar/i);
});

test("can create and update a task with comments and attachments", async () => {
  const createResponse = await requestJson("/api/tasks", {
    method: "POST",
    token,
    body: {
      contractId: "contract_glowup",
      title: "Backend integration verification task",
      column: "todo",
      priority: "medium",
      dueAt: "2026-03-05T10:00:00.000Z",
      earnings: 45,
      description: "Created from automated test coverage."
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.ok, true);
  const taskId = createResponse.json.data.id;
  assert.ok(taskId);
  assert.equal(createResponse.json.data.contractId, "contract_glowup");

  const updateResponse = await requestJson(`/api/tasks/${taskId}`, {
    method: "PATCH",
    token,
    body: {
      column: "submitted",
      priority: "high",
      description: "Ready for review."
    }
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.ok, true);
  assert.equal(updateResponse.json.data.column, "submitted");
  assert.equal(updateResponse.json.data.priority, "high");
  assert.equal(updateResponse.json.data.description, "Ready for review.");

  const commentResponse = await requestJson(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    token,
    body: { body: "Submitted for review from test automation." }
  });

  assert.equal(commentResponse.status, 201);
  assert.equal(commentResponse.json.ok, true);
  assert.match(commentResponse.json.data.comments.at(-1).body, /review/i);

  const attachmentResponse = await requestJson(`/api/tasks/${taskId}/attachments`, {
    method: "POST",
    token,
    body: {
      name: "Creative brief",
      url: "https://example.com/brief.pdf",
      note: "Reference link"
    }
  });

  assert.equal(attachmentResponse.status, 201);
  assert.equal(attachmentResponse.json.ok, true);
  assert.equal(attachmentResponse.json.data.attachments.at(-1).url, "https://example.com/brief.pdf");
});

test("can create and approve an asset", async () => {
  const createResponse = await requestJson("/api/assets", {
    method: "POST",
    token,
    body: {
      title: "Backend integration test asset",
      mediaType: "image",
      campaignId: "camp_glowup",
      previewUrl: "https://example.com/assets/test-image.jpg",
      tags: ["backend", "verification"]
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.ok, true);
  const assetId = createResponse.json.data.id;
  assert.ok(assetId);
  assert.equal(createResponse.json.data.status, "pending_supplier");

  const reviewResponse = await requestJson(`/api/assets/${assetId}/review`, {
    method: "PATCH",
    token,
    body: {
      status: "approved",
      note: "Approved from automated integration test."
    }
  });

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.json.ok, true);
  assert.equal(reviewResponse.json.data.status, "approved");
  assert.match(reviewResponse.json.data.reviewNote, /automated integration test/i);
});

test("can save, load, and publish a live builder draft", async () => {
  const saveResponse = await requestJson("/api/live/builder/save", {
    method: "POST",
    token,
    body: {
      sessionId: "tmp_live_builder_test",
      builderState: {
        step: "review",
        draft: {
          id: "tmp_live_builder_test",
          title: "Integration Test Live Builder Session",
          status: "Draft",
          supplierId: "ui_supplier_glow",
          campaignId: "ui_campaign_glow",
          platforms: ["TikTok Live"],
          locationLabel: "Online",
          publicJoinUrl: "https://mylivedealz.com/live/test-session",
          heroAspect: "16:9",
          heroImageUrl: "https://example.com/assets/live-hero.jpg",
          heroVideoUrl: "",
          desktopMode: "modal",
          scheduleAnchor: "start",
          durationMode: "preset",
          durationMinutes: 45,
          timezoneLabel: "Africa/Kampala",
          startDateISO: "2026-03-06",
          startTime: "18:00",
          endDateISO: "2026-03-06",
          endTime: "18:45",
          products: [
            {
              id: "item_1",
              kind: "product",
              name: "Glow Serum",
              imageUrl: "https://example.com/assets/live-item.jpg",
              goalMetric: "sold",
              goalTarget: 10
            }
          ],
          giveaways: [],
          teleprompterScript: "Testing live builder integration.",
          runOfShow: [],
          creatives: {
            openerAssetId: "asset_opener",
            lowerThirdAssetId: "",
            overlayAssetIds: []
          },
          stream: {
            ingestUrl: "rtmps://live.example.com/app",
            streamKey: "sk_live_test_integration",
            simulcast: {
              "TikTok Live": true,
              "Instagram Live": false,
              "YouTube Live": false,
              "Facebook Live": false
            },
            autoStart: true,
            recording: true,
            lowLatency: true
          },
          team: {
            moderators: [],
            cohosts: [],
            blockedTerms: [],
            pinnedGuidelines: true
          },
          compliance: {
            requiresDisclosure: true,
            disclosureText: "Paid partnership.",
            restrictedTermsCheck: true,
            musicRightsConfirmed: true
          }
        },
        externalAssets: {},
        giveawayUi: {}
      },
      summary: {
        title: "Integration Test Live Builder Session",
        sellerId: "ui_supplier_glow",
        sellerName: "GlowUp Hub",
        campaignId: "ui_campaign_glow",
        campaignName: "Autumn Beauty Flash",
        scheduledFor: "2026-03-06T15:00:00.000Z",
        time: "6:00 PM EAT",
        location: "Online",
        simulcast: ["TikTok Live"],
        durationMin: 45,
        productsCount: 1,
        scriptsReady: true,
        assetsReady: true,
        status: "Draft"
      }
    }
  });

  assert.equal(saveResponse.status, 201);
  assert.equal(saveResponse.json.ok, true);
  const sessionId = saveResponse.json.data.id;
  assert.equal(sessionId, "tmp_live_builder_test");
  assert.equal(saveResponse.json.data.builderState.step, "review");
  assert.ok(saveResponse.json.data.builderState.savedAt);
  assert.equal(saveResponse.json.data.productsCount, 1);

  const getResponse = await requestJson(`/api/live/builder/${sessionId}`, {
    token
  });

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.ok, true);
  assert.equal(getResponse.json.data.builderState.draft.title, "Integration Test Live Builder Session");

  const publishResponse = await requestJson(`/api/live/builder/${sessionId}/publish`, {
    method: "POST",
    token,
    body: { status: "scheduled" }
  });

  assert.equal(publishResponse.status, 200);
  assert.equal(publishResponse.json.ok, true);
  assert.equal(publishResponse.json.data.status, "scheduled");
  assert.equal(publishResponse.json.data.builderState.draft.status, "Scheduled");
  assert.ok(publishResponse.json.data.builderState.publishedAt);
});

test("can save, load, and publish an ad builder draft", async () => {
  const saveResponse = await requestJson("/api/adz/builder/save", {
    method: "POST",
    token,
    body: {
      adId: "tmp_ad_builder_test",
      builderState: {
        step: "review",
        builder: {
          supplierId: "ui_seller_glow",
          campaignId: "ui_campaign_beauty",
          selectedOfferIds: ["offer_1"],
          primaryOfferId: "offer_1",
          platforms: ["Instagram"],
          platformOtherList: [],
          platformOtherDraft: "",
          heroImageAssetId: "asset_hero",
          heroIntroVideoAssetId: "asset_intro",
          itemPosterByOfferId: { offer_1: "asset_offer_poster" },
          itemVideoByOfferId: {},
          ctaText: "Shop the featured dealz before they end.",
          primaryCtaLabel: "Buy now",
          secondaryCtaLabel: "Add to cart",
          landingBehavior: "Checkout",
          landingUrl: "",
          shortDomain: "mldz.link",
          shortSlug: "integration-test-ad",
          utmPresetId: "preset_default",
          utmCustom: {},
          startDate: "2026-03-07",
          startTime: "12:00",
          endDate: "2026-03-07",
          endTime: "14:00"
        },
        externalAssets: {},
        isGenerated: false,
        showSharePanel: false
      },
      summary: {
        title: "Beauty Builder Integration",
        subtitle: "Backend-persisted draft",
        sellerId: "ui_seller_glow",
        sellerName: "GlowUp Hub",
        campaignId: "ui_campaign_beauty",
        campaignName: "Beauty Builder Integration",
        platforms: ["Instagram"],
        startISO: "2026-03-07T09:00:00.000Z",
        endISO: "2026-03-07T11:00:00.000Z",
        timezone: "Africa/Kampala",
        heroImageUrl: "https://example.com/assets/ad-hero.jpg",
        heroIntroVideoUrl: "https://example.com/assets/ad-intro.mp4",
        offers: [
          {
            id: "offer_1",
            type: "product",
            name: "Glow Serum Bundle",
            currency: "USD",
            price: 19,
            stockLeft: 25,
            posterUrl: "https://example.com/assets/ad-offer.jpg"
          }
        ],
        shortLink: "https://mldz.link/integration-test-ad",
        generated: false,
        status: "draft"
      }
    }
  });

  assert.equal(saveResponse.status, 201);
  assert.equal(saveResponse.json.ok, true);
  const campaignId = saveResponse.json.data.id;
  assert.equal(campaignId, "tmp_ad_builder_test");
  assert.equal(saveResponse.json.data.generated, false);
  assert.equal(saveResponse.json.data.builderState.step, "review");
  assert.ok(saveResponse.json.data.builderState.savedAt);

  const getResponse = await requestJson(`/api/adz/builder/${campaignId}`, {
    token
  });

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.ok, true);
  assert.equal(getResponse.json.data.builderState.builder.shortSlug, "integration-test-ad");

  const publishResponse = await requestJson(`/api/adz/builder/${campaignId}/publish`, {
    method: "POST",
    token,
    body: { status: "scheduled" }
  });

  assert.equal(publishResponse.status, 200);
  assert.equal(publishResponse.json.ok, true);
  assert.equal(publishResponse.json.data.generated, true);
  assert.equal(publishResponse.json.data.status, "scheduled");
  assert.ok(publishResponse.json.data.builderState.publishedAt);
});

test("can update and publish a replay draft", async () => {
  const updateResponse = await requestJson("/api/live/replays/replay_gadgetmart", {
    method: "PATCH",
    token,
    body: {
      title: "Updated replay from test",
      hook: "Replay hook from automation",
      retention: "Retention updated by test",
      notes: ["clip ready", "post-live share"],
      allowComments: false,
      showProductStrip: true,
      clips: [
        {
          id: "clip_test_1",
          title: "Hook clip",
          startSec: 0,
          endSec: 18,
          format: "9:16",
          status: "Draft"
        }
      ]
    }
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.ok, true);
  assert.equal(updateResponse.json.data.title, "Updated replay from test");
  assert.equal(updateResponse.json.data.allowComments, false);
  assert.equal(updateResponse.json.data.clips.length, 1);

  const publishResponse = await requestJson("/api/live/replays/replay_gadgetmart/publish", {
    method: "POST",
    token,
    body: {
      published: true,
      scheduledPublishAt: "2026-03-10T10:00:00.000Z"
    }
  });

  assert.equal(publishResponse.status, 200);
  assert.equal(publishResponse.json.ok, true);
  assert.equal(publishResponse.json.data.published, true);
  assert.equal(publishResponse.json.data.scheduledPublishAt, "2026-03-10T10:00:00.000Z");
  assert.ok(publishResponse.json.data.publishedAt);
});

test("can update ad campaign execution state and fetch promo detail", async () => {
  const patchResponse = await requestJson("/api/adz/campaigns/adz_powerbank", {
    method: "PATCH",
    token,
    body: {
      status: "paused",
      campaignSubtitle: "Paused from automated runtime test"
    }
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.json.ok, true);
  assert.equal(patchResponse.json.data.status, "paused");
  assert.equal(patchResponse.json.data.campaignSubtitle, "Paused from automated runtime test");

  const performanceResponse = await requestJson("/api/adz/campaigns/adz_powerbank/performance", {
    token
  });

  assert.equal(performanceResponse.status, 200);
  assert.equal(performanceResponse.json.ok, true);
  assert.ok(performanceResponse.json.data.clicks >= 1);
  assert.ok(Array.isArray(performanceResponse.json.data.byPlatform));

  const promoDetailResponse = await requestJson("/api/promo-ads/adz_powerbank", {
    token
  });

  assert.equal(promoDetailResponse.status, 200);
  assert.equal(promoDetailResponse.json.ok, true);
  assert.equal(promoDetailResponse.json.data.campaign.id, "adz_powerbank");
  assert.ok(Array.isArray(promoDetailResponse.json.data.links));
});


test("can create, update, and filter tracked links", async () => {
  const createResponse = await requestJson("/api/links", {
    method: "POST",
    token,
    body: {
      tab: "live",
      title: "Replay distribution link from test",
      subtitle: "Created from automated backend coverage",
      status: "draft",
      campaign: {
        id: "camp_glowup",
        name: "Beauty Flash Dealz"
      },
      supplier: {
        name: "GlowUp Hub",
        type: "Seller"
      },
      primaryUrl: "https://mylivedealz.com/replay/live_beauty_flash?creator=test",
      shortUrl: "https://go.mylivedealz.com/test-replay",
      pinned: false,
      note: "Initial note from test"
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.ok, true);
  const linkId = createResponse.json.data.id;
  assert.ok(linkId);
  assert.equal(createResponse.json.data.tab, "live");
  assert.equal(createResponse.json.data.status, "draft");
  assert.equal(createResponse.json.data.campaign.id, "camp_glowup");

  const detailResponse = await requestJson(`/api/links/${linkId}`, {
    token
  });

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.json.ok, true);
  assert.equal(detailResponse.json.data.id, linkId);
  assert.equal(detailResponse.json.data.shortUrl, "https://go.mylivedealz.com/test-replay");

  const updateResponse = await requestJson(`/api/links/${linkId}`, {
    method: "PATCH",
    token,
    body: {
      status: "active",
      pinned: true,
      note: "Updated by automated tracked-link test"
    }
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.ok, true);
  assert.equal(updateResponse.json.data.status, "active");
  assert.equal(updateResponse.json.data.pinned, true);
  assert.match(updateResponse.json.data.note, /tracked-link test/i);

  const pinnedListResponse = await requestJson("/api/links?tab=live&pinned=true", {
    token
  });

  assert.equal(pinnedListResponse.status, 200);
  assert.equal(pinnedListResponse.json.ok, true);
  assert.ok(Array.isArray(pinnedListResponse.json.data));
  assert.ok(pinnedListResponse.json.data.some((entry) => entry.id === linkId));

  const campaignListResponse = await requestJson("/api/links?campaignId=camp_glowup", {
    token
  });

  assert.equal(campaignListResponse.status, 200);
  assert.equal(campaignListResponse.json.ok, true);
  assert.ok(campaignListResponse.json.data.some((entry) => entry.id === linkId));
});

test("can save and submit the onboarding workflow", async () => {
  const resetResponse = await requestJson("/api/onboarding/reset", {
    method: "POST",
    token
  });

  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.json.ok, true);

  const workflowForm = {
    profile: {
      name: "Workflow Test Creator",
      handle: "workflow.creator",
      country: "Uganda",
      email: "creator@mylivedealz.com"
    },
    preferences: {
      lines: ["Beauty"]
    },
    kyc: {
      idUploaded: true,
      selfieUploaded: true
    }
  };

  const saveResponse = await requestJson("/api/onboarding", {
    method: "PATCH",
    token,
    body: {
      form: workflowForm,
      stepIndex: 6,
      maxUnlocked: 8
    }
  });

  assert.equal(saveResponse.status, 200);
  assert.equal(saveResponse.json.ok, true);
  assert.equal(saveResponse.json.data.stepIndex, 6);
  assert.equal(saveResponse.json.data.form.profile.name, "Workflow Test Creator");

  const submitResponse = await requestJson("/api/onboarding/submit", {
    method: "POST",
    token,
    body: {
      form: workflowForm,
      stepIndex: 8,
      maxUnlocked: 8
    }
  });

  assert.equal(submitResponse.status, 200);
  assert.equal(submitResponse.json.ok, true);
  assert.equal(submitResponse.json.data.onboarding.submittedAt !== null, true);
  assert.equal(submitResponse.json.data.approval.status, "UnderReview");
  assert.equal(submitResponse.json.data.approval.onboardingSnapshot.profile.name, "Workflow Test Creator");

  const approvalResponse = await requestJson("/api/account-approval", { token });
  assert.equal(approvalResponse.status, 200);
  assert.equal(approvalResponse.json.ok, true);
  assert.equal(approvalResponse.json.data.status, "UnderReview");
  assert.equal(approvalResponse.json.data.displayName, "Workflow Test Creator");
});

test("can refresh approval into send-back and resubmit with uploaded files", async () => {
  await requestJson("/api/onboarding/reset", {
    method: "POST",
    token
  });

  const incompleteForm = {
    profile: {
      name: "Needs Fix Creator",
      handle: ""
    },
    preferences: {
      lines: ["General"]
    },
    kyc: {
      idUploaded: false,
      selfieUploaded: false
    }
  };

  const submitResponse = await requestJson("/api/onboarding/submit", {
    method: "POST",
    token,
    body: {
      form: incompleteForm,
      stepIndex: 4,
      maxUnlocked: 8
    }
  });

  assert.equal(submitResponse.status, 200);
  assert.equal(submitResponse.json.ok, true);
  assert.equal(submitResponse.json.data.approval.status, "UnderReview");

  const refreshResponse = await requestJson("/api/account-approval/refresh", {
    method: "POST",
    token
  });

  assert.equal(refreshResponse.status, 200);
  assert.equal(refreshResponse.json.ok, true);
  assert.equal(refreshResponse.json.data.status, "SendBack");
  assert.ok(refreshResponse.json.data.items.length >= 1);
  assert.ok(refreshResponse.json.data.adminDocs.length >= 1);

  const uploadResponse = await requestJson("/api/uploads", {
    method: "POST",
    token,
    body: {
      name: "updated-profile.pdf",
      type: "application/pdf",
      size: 142000,
      purpose: "approval_resubmission",
      relatedEntityType: "account_approval",
      relatedEntityId: refreshResponse.json.data.id
    }
  });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.json.ok, true);

  const resubmitResponse = await requestJson("/api/account-approval/resubmit", {
    method: "POST",
    token,
    body: {
      note: "Updated the profile and attached a revised document.",
      items: refreshResponse.json.data.items.map((item) => ({ ...item, done: true })),
      attachmentIds: [uploadResponse.json.data.id],
      preferences: {
        email: true,
        inApp: false
      }
    }
  });

  assert.equal(resubmitResponse.status, 200);
  assert.equal(resubmitResponse.json.ok, true);
  assert.equal(resubmitResponse.json.data.status, "Resubmitted");
  assert.equal(resubmitResponse.json.data.attachments.length, 1);
  assert.equal(resubmitResponse.json.data.attachments[0].name, "updated-profile.pdf");
  assert.equal(resubmitResponse.json.data.preferences.inApp, false);
});

test("can create and advance content approval submissions through the workflow API", async () => {
  const createResponse = await requestJson("/api/content-approvals", {
    method: "POST",
    token,
    body: {
      title: "Workflow content submission",
      campaign: "Workflow QA Campaign",
      supplier: {
        name: "Workflow Seller",
        type: "Seller"
      },
      channel: "Instagram",
      type: "Video",
      desk: "General",
      notesFromCreator: "Initial creative notes for workflow coverage.",
      caption: "Workflow caption draft"
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.ok, true);
  const submissionId = createResponse.json.data.id;
  assert.ok(submissionId);
  assert.equal(createResponse.json.data.status, "Pending");

  const updateResponse = await requestJson(`/api/content-approvals/${submissionId}`, {
    method: "PATCH",
    token,
    body: {
      status: "Changes Requested",
      caption: "Workflow caption updated after review"
    }
  });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.ok, true);
  assert.equal(updateResponse.json.data.status, "Changes Requested");
  assert.match(updateResponse.json.data.caption, /updated after review/i);

  const nudgeResponse = await requestJson(`/api/content-approvals/${submissionId}/nudge`, {
    method: "POST",
    token
  });

  assert.equal(nudgeResponse.status, 200);
  assert.equal(nudgeResponse.json.ok, true);
  assert.match(nudgeResponse.json.data.audit[0].msg, /nudged reviewer/i);

  const resubmitResponse = await requestJson(`/api/content-approvals/${submissionId}/resubmit`, {
    method: "POST",
    token,
    body: {
      caption: "Workflow caption final"
    }
  });

  assert.equal(resubmitResponse.status, 200);
  assert.equal(resubmitResponse.json.ok, true);
  assert.equal(resubmitResponse.json.data.status, "Pending");
  assert.match(resubmitResponse.json.data.audit[0].msg, /resubmitted/i);

  const listResponse = await requestJson("/api/content-approvals", { token });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.ok, true);
  assert.ok(listResponse.json.data.some((entry) => entry.id === submissionId));
});


test("returns crew workspace data and persists crew assignment updates", async () => {
  const listResponse = await requestJson("/api/crew", { token });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.ok, true);
  assert.ok(Array.isArray(listResponse.json.data.liveSessions));
  assert.ok(Array.isArray(listResponse.json.data.members));

  const patchResponse = await requestJson("/api/crew/sessions/live_beauty_flash", {
    method: "PATCH",
    token,
    body: {
      assignments: [
        { memberId: "member_2", roleId: "role_producer" },
        { memberId: "member_1", roleId: "role_creator_owner" }
      ]
    }
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.json.ok, true);
  assert.equal(patchResponse.json.data.sessionId, "live_beauty_flash");
  assert.equal(patchResponse.json.data.assignments.length, 2);
  assert.ok(patchResponse.json.data.updatedAt);

  const afterPatch = await requestJson("/api/crew", { token });
  const session = afterPatch.json.data.crew.sessions.find((entry) => entry.sessionId === "live_beauty_flash");
  assert.ok(session);
  assert.equal(session.assignments.length, 2);
  assert.equal(session.assignments[1].memberId, "member_1");
});

test("returns and updates live support tool configurations", async () => {
  const audienceGet = await requestJson("/api/tools/audience-notifications", { token });
  assert.equal(audienceGet.status, 200);
  assert.equal(audienceGet.json.ok, true);
  assert.equal(audienceGet.json.data.sessionId, "live_beauty_flash");

  const audiencePatch = await requestJson("/api/tools/audienceNotifications", {
    method: "PATCH",
    token,
    body: {
      sessionId: "live_tech_friday",
      enabledChannels: ["WhatsApp", "Telegram"],
      enabledReminders: ["T-24h", "Live Now"],
      replayDelayMinutes: 90
    }
  });
  assert.equal(audiencePatch.status, 200);
  assert.equal(audiencePatch.json.ok, true);
  assert.equal(audiencePatch.json.data.sessionId, "live_tech_friday");
  assert.equal(audiencePatch.json.data.replayDelayMinutes, 90);
  assert.ok(audiencePatch.json.data.updatedAt);

  const alertsPatch = await requestJson("/api/tools/liveAlerts", {
    method: "PATCH",
    token,
    body: {
      sessionId: "live_tech_friday",
      enabledDestinations: ["WhatsApp", "Push"],
      draftText: "We are live with new gadget bundles.",
      frequencyCapMinutes: 20
    }
  });
  assert.equal(alertsPatch.status, 200);
  assert.equal(alertsPatch.json.ok, true);
  assert.equal(alertsPatch.json.data.frequencyCapMinutes, 20);
  assert.equal(alertsPatch.json.data.enabledDestinations.length, 2);

  const overlaysPatch = await requestJson("/api/tools/overlays", {
    method: "PATCH",
    token,
    body: {
      sessionId: "live_tech_friday",
      variant: "Variant C",
      qrEnabled: false,
      qrLabel: "Tap to shop",
      qrUrl: "https://go.mylivedealz.com/tf1",
      destUrl: "https://mldz.link/techfriday"
    }
  });
  assert.equal(overlaysPatch.status, 200);
  assert.equal(overlaysPatch.json.ok, true);
  assert.equal(overlaysPatch.json.data.variant, "Variant C");
  assert.equal(overlaysPatch.json.data.qrEnabled, false);

  const streamingPatch = await requestJson("/api/tools/streaming", {
    method: "PATCH",
    token,
    body: {
      sessionId: "live_tech_friday",
      selectedDestinations: ["YouTube Live", "TikTok Live"],
      advancedOpen: false,
      recordMaster: true,
      autoReplay: true,
      autoHighlights: false
    }
  });
  assert.equal(streamingPatch.status, 200);
  assert.equal(streamingPatch.json.ok, true);
  assert.equal(streamingPatch.json.data.selectedDestinations.length, 2);
  assert.equal(streamingPatch.json.data.autoHighlights, false);

  const safetyPatch = await requestJson("/api/tools/safety", {
    method: "PATCH",
    token,
    body: {
      roleMode: "creator",
      muteChat: true,
      slowMode: true,
      linkBlocking: true,
      keywordRules: ["spam", "scam", "fake checkout"]
    }
  });
  assert.equal(safetyPatch.status, 200);
  assert.equal(safetyPatch.json.ok, true);
  assert.equal(safetyPatch.json.data.roleMode, "creator");
  assert.deepEqual(safetyPatch.json.data.keywordRules, ["spam", "scam", "fake checkout"]);

  const safetyGet = await requestJson("/api/tools/safety", { token });
  assert.equal(safetyGet.status, 200);
  assert.equal(safetyGet.json.ok, true);
  assert.equal(safetyGet.json.data.muteChat, true);
  assert.equal(safetyGet.json.data.roleMode, "creator");
});

test("returns backend-driven subscription dashboard data", async () => {
  const response = await requestJson("/api/subscription", { token });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.data.plan, "pro");
  assert.equal(response.json.data.currentPlanMeta.id, "pro");
  assert.equal(response.json.data.canManageBilling, true);
  assert.ok(Array.isArray(response.json.data.planCatalog));
  assert.ok(response.json.data.planCatalog.some((entry) => entry.id === "enterprise"));
  assert.ok(Array.isArray(response.json.data.usage));
  assert.ok(response.json.data.usage.some((entry) => entry.id === "live-sessionz"));
  assert.ok(Array.isArray(response.json.data.invoices));
  assert.ok(response.json.data.invoices.length >= 1);
  assert.equal(response.json.data.paymentMethod.brand, "Visa");
});

test("updates subscription plan and billing cycle through backend", async () => {
  const patchResponse = await requestJson("/api/subscription", {
    method: "PATCH",
    token,
    body: {
      plan: "enterprise",
      cycle: "yearly"
    }
  });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.json.ok, true);
  assert.equal(patchResponse.json.data.plan, "enterprise");
  assert.equal(patchResponse.json.data.cycle, "yearly");
  assert.equal(patchResponse.json.data.currentPlanMeta.id, "enterprise");
  assert.equal(patchResponse.json.data.canManageBilling, true);
  assert.ok(patchResponse.json.data.invoices.every((invoice) => invoice.description.includes("Enterprise")));

  const revertResponse = await requestJson("/api/subscription", {
    method: "PATCH",
    token,
    body: {
      plan: "pro",
      cycle: "monthly"
    }
  });
  assert.equal(revertResponse.status, 200);
  assert.equal(revertResponse.json.data.plan, "pro");
  assert.equal(revertResponse.json.data.cycle, "monthly");
});

test("denies subscription data when the permission is removed", async () => {
  const disableResponse = await requestJson("/api/roles/role_creator_owner", {
    method: "PATCH",
    token,
    body: {
      perms: {
        "subscription.view": false
      }
    }
  });

  assert.equal(disableResponse.status, 200);
  assert.equal(disableResponse.json.ok, true);
  assert.equal(disableResponse.json.data.perms["subscription.view"], false);

  const deniedResponse = await requestJson("/api/subscription", { token });
  assert.equal(deniedResponse.status, 403);
  assert.equal(deniedResponse.json.ok, false);

  const enableResponse = await requestJson("/api/roles/role_creator_owner", {
    method: "PATCH",
    token,
    body: {
      perms: {
        "subscription.view": true
      }
    }
  });

  assert.equal(enableResponse.status, 200);
  assert.equal(enableResponse.json.ok, true);
  assert.equal(enableResponse.json.data.perms["subscription.view"], true);

  const restored = await requestJson("/api/subscription", { token });
  assert.equal(restored.status, 200);
  assert.equal(restored.json.ok, true);
});
