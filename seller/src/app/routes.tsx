// src/app/routes.js
import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  needsOnboarding,
  onboardingPathForRole,
  readOnboardingStatus,
  nextOnboardingRoute,
} from '../features/misc/onboardingStatus';
import { useLocalization } from '../localization/LocalizationProvider';
import type { Session } from '../types/session';
import type { AuthProps } from '../features/misc/Auth';
import { hasSessionToken, isValidSession, readSession, useSession } from '../auth/session';
import { getCurrentRole } from '../auth/roles';
import { ProviderGuard, SellerGuard, SellerOrProviderGuard } from '../auth/RoleGuard';
import { sellerBackendApi } from '../lib/backendApi';

const scaffold = (name: string) => {
  const Scaffold = () => {
    const { t } = useLocalization();
    return (
      <div className="w-full px-[0.55%] py-6">
        <h1 className="text-2xl font-extrabold">{t(name)}</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">
          {t('Scaffold placeholder — replace with the real screen.')}
        </p>
      </div>
    );
  };
  return Scaffold;
};
const safeLazy = <P extends object>(
  importer: () => Promise<{ default: React.ComponentType<P> }>,
  name: string
): React.LazyExoticComponent<React.ComponentType<P>> =>
  lazy(() =>
    importer()
      .then((m) => ({ default: m.default || scaffold(name) }))
      .catch(() => ({ default: scaffold(name) }))
  );
const safeNamedLazy = (
  importer: () => Promise<Record<string, React.ComponentType<any>>>,
  exportName: string,
  name: string
) =>
  safeLazy(
    () =>
      importer().then((m) => ({
        default: (m[exportName] || m.default || scaffold(name)) as React.ComponentType<any>,
      })) as Promise<{ default: React.ComponentType<any> }>,
    name
  );

const mapSupplierPathToMldz = (pathname: string): string => {
  if (
    pathname.startsWith('/supplier/overview/public-profile') ||
    pathname.startsWith('/supplier/overview/supplier-public-profile') ||
    pathname.startsWith('/supplier/public-profile')
  )
    return '/mldz/overview/supplier-public-profile';
  if (pathname.startsWith('/supplier/overview/my-campaigns/'))
    return '/mldz/campaigns/awaiting-admin-approval';
  if (
    pathname.startsWith('/supplier/overview/dealz-marketplace') ||
    pathname.startsWith('/supplier/dealz-marketplace')
  )
    return '/mldz/dealz-marketplace';
  if (pathname.startsWith('/supplier/overview/my-campaigns')) return '/mldz/campaigns';
  if (pathname.startsWith('/supplier/live/stream-to-platforms'))
    return '/mldz/live/stream-to-platforms';
  if (pathname.startsWith('/supplier/live/audience-notifications'))
    return '/mldz/live/audience-notifications';
  if (pathname.startsWith('/supplier/live/live-alerts')) return '/mldz/live/live-alerts';
  if (pathname.startsWith('/supplier/live/overlays-ctas-pro'))
    return '/mldz/live/overlays-ctas-pro';
  if (pathname.startsWith('/supplier/live/safety-moderation'))
    return '/mldz/live/safety-moderation';
  if (pathname.startsWith('/supplier/live/post-live-publisher'))
    return '/mldz/live/post-live-publisher';
  if (pathname.startsWith('/supplier/live-dashboard') || pathname.startsWith('/supplier/live/dashboard'))
    return '/mldz/live/dashboard';
  if (pathname.startsWith('/supplier/live-schedule') || pathname.startsWith('/supplier/live/schedule'))
    return '/mldz/live/schedule';
  if (
    pathname.startsWith('/supplier/live-studio') ||
    pathname.startsWith('/supplier/live/studio') ||
    pathname.startsWith('/supplier/live/builder')
  )
    return '/mldz/live/studio';
  if (pathname.startsWith('/supplier/replays-clips') || pathname.startsWith('/supplier/live/replays'))
    return '/mldz/live/replays';
  if (
    pathname.startsWith('/supplier/adz-marketplace') ||
    pathname.startsWith('/supplier/adz/marketplace')
  )
    return '/mldz/adz/marketplace';
  if (pathname.startsWith('/supplier/adz/builder')) return '/mldz/adz/builder';
  if (pathname.startsWith('/supplier/adz-manager') || pathname.startsWith('/supplier/adz/manager'))
    return '/mldz/adz/manager';
  if (pathname.startsWith('/supplier/adz/dashboard')) return '/mldz/adz/dashboard';
  if (
    pathname.startsWith('/supplier/adz/performance') ||
    pathname.startsWith('/supplier/analytics-status') ||
    pathname.startsWith('/supplier/analytics/status')
  )
    return '/mldz/adz-performance';
  if (
    pathname.startsWith('/supplier/task-board') ||
    pathname.startsWith('/supplier/deliverables/task-board')
  )
    return '/mldz/deliverables/task-board';
  if (pathname.startsWith('/supplier/asset-library') || pathname.startsWith('/supplier/deliverables/assets'))
    return '/mldz/deliverables/asset-library';
  if (
    pathname.startsWith('/supplier/new-link') ||
    pathname.startsWith('/supplier/links/new') ||
    pathname.startsWith('/supplier/deliverables/new-link')
  )
    return '/mldz/deliverables/links-hub/new-link';
  if (pathname.startsWith('/supplier/links-hub') || pathname.startsWith('/supplier/deliverables/links'))
    return '/mldz/deliverables/links-hub';
  if (
    pathname.startsWith('/supplier/collabs/creator-profile') ||
    pathname.startsWith('/supplier/collabs/profile')
  )
    return '/mldz/creators/profile';
  if (pathname.startsWith('/supplier/collabs/creators')) return '/mldz/creators/directory';
  if (pathname.startsWith('/supplier/collabs/my-creators')) return '/mldz/creators/my-creators';
  if (pathname.startsWith('/supplier/collabs/negotiation-room'))
    return '/mldz/collab/negotiation-room';
  if (
    pathname.startsWith('/supplier/collabs/invites') ||
    pathname.startsWith('/supplier/collabs/invites-from-creators')
  )
    return '/mldz/creators/invites';
  if (pathname.startsWith('/supplier/collabs/proposals'))
    return '/mldz/collab/proposals';
  if (pathname.startsWith('/supplier/collabs/contracts')) return '/mldz/collab/contracts';
  if (pathname.startsWith('/supplier/team/roles-permissions')) return '/mldz/team/roles-permissions';
  if (pathname.startsWith('/supplier/team')) return '/mldz/team/crew-manager';
  if (pathname.startsWith('/supplier/settings/my-subscriptions'))
    return '/mldz/settings/my-subscriptions';
  if (pathname.startsWith('/supplier/settings')) return '/mldz/settings/supplier-settings';
  return '/mldz/feed';
};

const SupplierMldzRedirect = () => {
  const location = useLocation();
  const target = mapSupplierPathToMldz(location.pathname);
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
};

const useChannels = (): Record<string, boolean> => {
  const [channels, setChannels] = React.useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!hasSessionToken(readSession())) {
      setChannels({});
      return;
    }
    let active = true;
    void sellerBackendApi
      .getUiState()
      .then((payload) => {
        if (!active) return;
        const next = (payload.channels as Record<string, boolean> | undefined) || {};
        setChannels(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return channels;
};

type GuardProps = {
  children: React.ReactElement;
};

const LiveDealzGuard = ({ children }: GuardProps) =>
  isValidSession(useSession()) ? children : <Navigate to="/auth" replace />;
const ChannelGuard = ({
  channelKey,
  children,
}: {
  channelKey: string;
  children: React.ReactElement;
}) => (useChannels()[channelKey] ? children : <Navigate to="/auth" replace />);

// Landing
const Landing = safeLazy(() => import('../features/landing/Landing'), 'Landing');
const PublicLanding = safeLazy(
  () => import('../features/landing/PublicLanding'),
  'Public Landing Experience'
);
const TrustCenter = scaffold('Trust Center');
const MarketPanelApprovals = scaffold('Market Panel Approvals');

// Listings
const Listings = safeLazy(() => import('../features/listings/Listings'), 'Listings');
const ListingDetail = safeLazy(
  () => import('../features/listings/ListingDetail'),
  'Listing Detail'
);
const NewListing = safeLazy(
  () => import('../features/listings/ListingWizard/StepABasics'),
  'New Listing Wizard'
);
const BulkImport = safeLazy(() => import('../features/listings/BulkImport'), 'Bulk Import');
const ProductShare = safeLazy(() => import('../features/listings/ProductShare'), 'Product Share');
const ProductListingTaxonomyNavigatorCanvas = safeLazy(
  () => import('../features/listings/ListingWizard/StepABasics'),
  'Product Listing Taxonomy Navigator'
);
const ListingFormPreview = safeLazy(
  () => import('../features/listings/FormPreview'),
  'Listing Form Preview'
);
const ListingAwaitingApproval = safeLazy(
  () => import('../features/listings/AwaitingApproval_ProductListing'),
  'Listing Awaiting Approval'
);
const ServiceListingAwaitingApproval = safeLazy(
  () => import('../features/listings/AwaitingApproval_ServiceListing'),
  'Service Listing Awaiting Approval'
);
const ProductListingWizard = safeLazy(
  () => import('../features/listings/ProductListingWizard'),
  'Product Listing Wizard'
);

// Catalog helpers (optional)
const CatalogTemplates = safeLazy(
  () => import('../features/catalog/templates/Templates'),
  'Catalog Templates'
);
const CatalogMediaLibrary = safeLazy(
  () => import('../features/catalog/media-library/MediaLibrary'),
  'Catalog Media Library'
);

// Orders & Prints
const Orders = safeLazy(() => import('../features/orders/Orders'), 'Orders & Ops');
const OrderDetail = safeLazy(() => import('../features/orders/OrderDetail'), 'Order Detail');
const Returns = safeLazy(() => import('../features/orders/ReturnsRmas'), 'Returns');
const PrintInvoice = safeLazy(
  () => import('../features/orders/prints/PrintInvoice'),
  'Print Invoice'
);
const PrintPackingSlip = safeLazy(
  () => import('../features/orders/prints/PrintPackingSlip'),
  'Print Packing Slip'
);
const PackingSticker = safeLazy(
  () => import('../features/orders/prints/PackingSticker'),
  'Packing Sticker'
);

// Wholesale
const WholesaleHome = safeLazy(
  () => import('../features/wholesale/WholesaleHome'),
  'Wholesale Home'
);
const PriceLists = safeLazy(
  () => import('../features/wholesale/WholesalePriceLists'),
  'Price Lists'
);
const RFQInbox = safeLazy(() => import('../features/wholesale/WholesaleRfqInbox'), 'RFQ Inbox');
const Quotes = safeLazy(() => import('../features/wholesale/WholesaleQuotes'), 'Quotes');
const WholesaleIncoterms = safeLazy(
  () => import('../features/wholesale/WholesaleIncoterms'),
  'Wholesale Incoterms'
);
const QuoteDetail = safeLazy(() => import('../features/wholesale/WholesaleQuotes'), 'Quote Detail');

// LiveDealz (MyLiveDealz supplier pages)
const MldzFeed = safeNamedLazy(
  () => import('../features/livedealz/overview/SupplierLiveDealzFeedPage'),
  'SupplierLiveDealzFeedPage',
  'MyLiveDealz feed'
);
const MldzSupplierPublicProfile = safeNamedLazy(
  () => import('../features/livedealz/overview/SupplierPublicProfilePage'),
  'SupplierPublicProfilePage',
  'Supplier public profile'
);
const MldzCampaigns = safeNamedLazy(
  () => import('../features/livedealz/overview/SupplierMyCampaignsPage'),
  'SupplierMyCampaignsPage',
  'MyLiveDealz campaigns'
);
const MldzAwaitingAdminApproval = safeNamedLazy(
  () => import('../features/livedealz/overview/SupplierAwaitingAdminApprovalPage'),
  'SupplierAwaitingAdminApprovalPremium',
  'Awaiting admin approval'
);
const MldzDealzMarketplace = safeNamedLazy(
  () => import('../features/livedealz/overview/SupplierDealzMarketplacePage'),
  'SupplierDealzMarketplacePage',
  'Dealz marketplace'
);
const MldzAnalyticsStatus = safeNamedLazy(
  () => import('../features/livedealz/analytics/SupplierAnalyticsStatusPage'),
  'SupplierAnalyticsStatusPage',
  'Analytics status'
);
const MldzContracts = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierContractsPage'),
  'SupplierContractsPage',
  'Contracts'
);
const MldzCampaignsBoard = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierCampaignsBoardPage'),
  'SupplierCampaignsBoardPage',
  'Campaigns board'
);
const MldzProposals = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierProposalsPage'),
  'SupplierProposalsPage',
  'Proposals'
);
const MldzCreatorDirectory = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierCreatorDirectoryPage'),
  'SupplierCreatorDirectoryPage',
  'Creator directory'
);
const MldzMyCreators = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierMyCreatorsPage'),
  'SupplierMyCreatorsPage',
  'My creators'
);
const MldzCreatorInvites = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierInvitesFromCreatorsPage'),
  'SupplierInvitesFromCreatorsPage',
  'Invites from creators'
);
const MldzLiveDashboard = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierLiveDashboardPage'),
  'SupplierLiveDashboardPage',
  'Live dashboard'
);
const MldzLiveSchedule = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierLiveSchedulePage'),
  'SupplierLiveSchedulePage',
  'Live schedule'
);
const MldzLiveStudio = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierLiveStudioPage'),
  'SupplierLiveStudioPage',
  'Live studio'
);
const MldzStreamToPlatforms = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierStreamToPlatformsPage'),
  'SupplierStreamToPlatformsPage',
  'Stream to platforms'
);
const MldzAudienceNotifications = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierAudienceNotificationsPage'),
  'SupplierAudienceNotificationsPage',
  'Audience notifications'
);
const MldzLiveAlertsManager = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierLiveAlertsManagerPage'),
  'SupplierLiveAlertsManagerPage',
  'Live alerts manager'
);
const MldzOverlaysCtasPro = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierOverlaysCTAsProPage'),
  'SupplierOverlaysCTAsPro',
  'Overlays CTAs Pro'
);
const MldzSafetyModeration = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierSafetyModerationPage'),
  'SupplierSafetyModerationPage',
  'Safety moderation'
);
const MldzPostLivePublisher = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierPostLivePublisherPage'),
  'SupplierPostLivePublisherPage',
  'Post-live publisher'
);
const MldzLiveReplays = safeNamedLazy(
  () => import('../features/livedealz/live/SupplierReplaysClipsPage'),
  'SupplierReplaysClipsPage',
  'Live replays'
);
const MldzAdzDashboard = safeNamedLazy(
  () => import('../features/livedealz/adz/SupplierAdzDashboardPage'),
  'SupplierAdzDashboardPage',
  'Adz dashboard'
);
const MldzAdzMarketplace = safeNamedLazy(
  () => import('../features/livedealz/adz/SupplierAdzMarketplacePage'),
  'SupplierAdzMarketplacePage',
  'Adz marketplace'
);
const MldzAdzManager = safeNamedLazy(
  () => import('../features/livedealz/adz/SupplierAdzManagerPage'),
  'SupplierAdzManagerPage',
  'Adz manager'
);
const MldzAdzBuilder = safeNamedLazy(
  () => import('../features/livedealz/adz/SupplierAdBuilderPage'),
  'AdBuilder',
  'Adz builder'
);
const MldzAdzPerformance = safeNamedLazy(
  () => import('../features/livedealz/adz/SupplierAdzPerformancePage'),
  'SupplierAdzPerformancePage',
  'Adz performance'
);
const MldzDeliverablesBoard = safeNamedLazy(
  () => import('../features/livedealz/deliverables/SupplierTaskBoardPage'),
  'SupplierTaskBoardPage',
  'Deliverables task board'
);
const MldzAssetLibrary = safeNamedLazy(
  () => import('../features/livedealz/deliverables/SupplierAssetLibraryPage'),
  'SupplierAssetLibraryPage',
  'Asset library'
);
const MldzLinksHub = safeNamedLazy(
  () => import('../features/livedealz/deliverables/SupplierLinksHubPage'),
  'SupplierLinksHubPage',
  'Links hub'
);
const MldzNewLink = safeNamedLazy(
  () => import('../features/livedealz/+NewLink'),
  'SupplierLinkToolsOrangePrimaryPreviewable',
  'New link'
);
const MldzCrewManager = safeNamedLazy(
  () => import('../features/livedealz/team/SupplierCrewManagerPage'),
  'SupplierCrewManagerPage',
  'Crew manager'
);
const MldzRolesPermissions = safeNamedLazy(
  () => import('../features/livedealz/team/SupplierRolesPermissionsPage'),
  'SupplierRolesPermissionsPage',
  'Roles & permissions'
);
const MldzSettings = safeNamedLazy(
  () => import('../features/livedealz/settings/SupplierSettingsPage'),
  'SupplierSettingsPage',
  'Supplier settings'
);
const MldzMySubscriptions = safeNamedLazy(
  () => import('../features/livedealz/settings/SupplierMyLiveDealzSubscriptionPage'),
  'SupplierMyLiveDealzSubscriptionPage',
  'My subscriptions'
);
const MldzCreatorPublicProfile = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierCreatorPublicProfilePage'),
  'SupplierCreatorProfilePage',
  'Creator public profile'
);
const MldzNegotiationRoom = safeNamedLazy(
  () => import('../features/livedealz/collabs/SupplierNegotiationRoomPage'),
  'SupplierNegotiationRoomPage',
  'Negotiation room'
);

// ExpressMart
const ExpressOrders = safeLazy(() => import('../features/express/ExpressOrders'), 'Express Orders');
const ExpressOrderDetail = safeLazy(
  () => import('../features/express/ExpressOrderDetail'),
  'Express Order Detail'
);

// Channels / Mapping / Compliance
const Compliance = safeLazy(() => import('../features/channels/Compliance'), 'Compliance Center');

// Regulatory Desk
const RegulatoryDesksHome = safeLazy(
  () => import('../features/desks/regulatory_desks_overview'),
  'Regulatory Desks Home'
);
const RegulatoryHealthLogistics = safeLazy(
  () => import('../features/desks/healthmart/HealthMartLogisticsOrders'),
  'HealthMart Logistics Orders'
);
const RegulatoryHealthHub = safeLazy(
  () => import('../features/desks/healthmart/HealthMartComplianceHub'),
  'HealthMart Compliance Hub'
);
const RegulatoryHealthPharmacy = safeLazy(
  () => import('../features/desks/healthmart/HealthMartPharmacyItems'),
  'HealthMart Pharmacy Items'
);
const RegulatoryHealthEquipment = safeLazy(
  () => import('../features/desks/healthmart/HealthMartEquipmentItems'),
  'HealthMart Equipment Items'
);
const RegulatoryEduItems = safeLazy(
  () => import('../features/desks/edumart/EduMartItems'),
  'EduMart Items'
);
const RegulatoryFaithItems = safeLazy(
  () => import('../features/desks/faithmart/FaithMartItems'),
  'FaithMart Items'
);

// Provider (new module)
const ProviderOnboarding = safeLazy(
  () => import('../features/provider/ProviderOnboarding'),
  'Provider Onboarding'
);
const ProviderQuotes = safeLazy(
  () => import('../features/provider/ProviderQuotes'),
  'Provider Quotes'
);
const ProviderQuoteNew = safeLazy(
  () => import('../features/provider/ProviderQuoteNew'),
  'Provider New Quote'
);
const ProviderQuoteDetail = safeLazy(
  () => import('../features/provider/ProviderQuoteDetail'),
  'Provider Quote Detail'
);
const ProviderPortfolio = safeLazy(
  () => import('../features/provider/ProviderPortfolio'),
  'Provider Portfolio'
);
const ProviderReviews = safeLazy(
  () => import('../features/provider/ProviderReviews'),
  'Provider Reviews'
);
const ProviderJointQuote = safeLazy(
  () => import('../features/provider/ProviderJointQuote'),
  'Joint Quote Collaboration'
);
const ProviderServiceCommand = safeLazy(
  () => import('../features/provider/ProviderServiceCommand'),
  'Service Command'
);
const ProviderBookings = safeLazy(
  () => import('../features/provider/ProviderBookings'),
  'Provider Bookings'
);
const ProviderConsultations = safeLazy(
  () => import('../features/provider/ProviderConsultations'),
  'Provider Consultations'
);

// Ops / Finance (seller) / Misc
const OpsOverview = safeLazy(
  () => import('../features/ops/ops_center_overview'),
  'Ops Center Overview'
);
const Inventory = safeLazy(() => import('../features/ops/Inventory'), 'Inventory');
const Shipping = safeLazy(() => import('../features/ops/ShippingProfiles'), 'Shipping Profiles');
const Warehouses = safeLazy(() => import('../features/ops/Warehouses'), 'Warehouses');
const Exports = safeLazy(() => import('../features/ops/Exports'), 'Exports');
const DocumentsCenter = safeLazy(
  () => import('../features/ops/DocumentsCenter'),
  'Documents Center'
);
const ComplianceCenter = safeLazy(
  () => import('../features/ops/ComplianceCenter'),
  'Compliance Center'
);
const DisputesSeller = safeLazy(
  () => import('../features/ops/DisputesSeller'),
  'Disputes (Seller)'
);
const DisputesProvider = safeLazy(
  () => import('../features/ops/DisputesProvider'),
  'Disputes (Provider)'
);

// Seller reviews
const SellerReviews = safeLazy(
  () =>
    import('../features/reviews/reviews_hub_unified_supplier_reputation_v_3_products_live_sessionz'),
  'Seller Reviews'
);
const FinanceHome = safeLazy(() => import('../features/finance/finance_home'), 'Finance Home');
const FinanceWallets = safeLazy(
  () => import('../features/finance/finance_statements_previewable'),
  'Wallets & Payouts'
);
const FinanceHolds = safeLazy(
  () => import('../features/finance/finance_payout_holds_previewable (1)'),
  'Payout Holds'
);
const FinanceInvoices = safeLazy(
  () => import('../features/finance/finance_invoices_previewable'),
  'Invoices'
);
const FinanceStatements = safeLazy(
  () => import('../features/finance/finance_statements_previewable'),
  'Statements'
);
const FinanceTaxReports = safeLazy(
  () => import('../features/finance/finance_tax_reports_previewable'),
  'Tax Reports'
);
const Analytics = safeLazy(() => import('../features/misc/Analytics'), 'Analytics');
const Messages = safeLazy(() => import('../features/misc/Messages'), 'Messages');
const Notifications = safeLazy(() => import('../features/misc/Notifications'), 'Notifications');
const TemplatesHub = safeLazy(
  () => import('../features/settings/templates_hub_quote_message_contract_listing_previewable'),
  'Templates Hub'
);
const StorefrontOverview = safeLazy(
  () => import('../features/settings/Profile'),
  'Storefront Overview'
);
const HelpSupport = safeLazy(() => import('../features/misc/HelpSupport'), 'Help & Support');
const Dashboard = safeLazy(() => import('../features/misc/Dashboard'), 'Dashboard');
const SellerOnboarding = safeLazy(
  () => import('../features/misc/SellerOnboarding'),
  'Seller Onboarding'
);
const Auth = safeLazy<AuthProps>(() => import('../features/misc/Auth'), 'Auth');
const GlobalSearch = safeLazy(() => import('../features/misc/GlobalSearch'), 'Search');

// Dedicated desks (gated)
const HealthLogistics = safeLazy(
  () => import('../features/desks/healthmart/HealthMartLogisticsOrders'),
  'HealthMart Logistics Orders'
);
const HealthPharmacy = safeLazy(
  () => import('../features/desks/healthmart/HealthMartPharmacyItems'),
  'HealthMart Pharmacy Items'
);
const HealthEquipment = safeLazy(
  () => import('../features/desks/healthmart/HealthMartEquipmentItems'),
  'HealthMart Equipment Items'
);
const EduItems = safeLazy(() => import('../features/desks/edumart/EduMartItems'), 'EduMart Items');
const FaithItems = safeLazy(
  () => import('../features/desks/faithmart/FaithMartItems'),
  'FaithMart Items'
);

// Settings
const SettingsProfile = safeLazy(
  () => import('../features/settings/Profile'),
  'Profile & Storefront'
);
const SettingsTeam = safeLazy(
  () =>
    import('../features/settings/teams_roles_supplier_custom_roles_permission_builder_previewable'),
  'Team & Roles'
);
const SettingsPayoutMethods = safeLazy(
  () =>
    import('../features/settings/payout_methods_bank_setup_validation_test_payout_simulation_previewable'),
  'Payout Methods'
);
const SettingsPreferences = safeLazy(
  () =>
    import('../features/settings/settings_preferences_language_currency_ui_workspaces_previewable'),
  'Preferences'
);
const SettingsSecurity = safeLazy(
  () =>
    import('../features/settings/settings_security_2_fa_password_sessions_trust_policies_previewable'),
  'Security'
);
const SettingsSecuritySessions = safeLazy(
  () => import('../features/settings/device_sessions_session_list_trust_geo_anomaly_alerts_previewable'),
  'Security Sessions'
);
const SettingsIntegrations = safeLazy(
  () => import('../features/settings/settings_integrations_connected_apps_api_keys_webhook_health'),
  'Integrations'
);
const SettingsTax = safeLazy(
  () =>
    import('../features/settings/tax_hub_vat_profiles_invoice_compliance_compliance_pack_previewable'),
  'Tax'
);
const SettingsKyc = safeLazy(
  () => import('../features/settings/supplier_hub_kyc_kyb_previewable'),
  'KYC / KYB'
);
const SettingsNotificationPreferences = safeLazy(
  () =>
    import('../features/settings/notification_preferences_categories_channels_rules_digest_previewable'),
  'Notification Preferences'
);
const SettingsSavedViews = safeLazy(
  () =>
    import('../features/settings/saved_views_manager_rename_pin_share_compliance_lock_previewable'),
  'Saved Views'
);
const SettingsAuditLog = safeLazy(
  () =>
    import('../features/settings/audit_log_explorer_filters_exports_evidence_bundles_previewable'),
  'Audit Log'
);
const SettingsHelp = safeLazy(
  () =>
    import('../features/settings/help_support_kb_tickets_guided_troubleshooting_incident_history_previewable'),
  'Settings Help & Support'
);
const SettingsStatusCenter = safeLazy(
  () => import('../features/settings/support_system_status_previewable'),
  'Status Center'
);

const Fallback = () => {
  return null;
};

const NotFoundMessage = () => {
  const { t } = useLocalization();
  return <div className="text-sm text-gray-500 dark:text-slate-400">{t('Not found')}</div>;
};

type RoutesConfigProps = {
  session?: Session | null;
};

export default function RoutesConfig({ session: sessionProp }: RoutesConfigProps = {}) {
  const location = useLocation();
  const storedSession = useSession();
  const session = typeof sessionProp !== 'undefined' ? sessionProp : storedSession;
  const isAuthenticated = isValidSession(session);

  const role = getCurrentRole(session);
  const onboardingPath = onboardingPathForRole(role);
  const status = readOnboardingStatus(role, session);
  const targetOnboarding = nextOnboardingRoute(role, status) || onboardingPath;
  const onOnboardingRoute = location.pathname.startsWith(onboardingPath);
  const onAuthRoute = location.pathname.startsWith('/auth');
  const enforceOnboarding = isAuthenticated && needsOnboarding(role, session);
  const mldzPriorityPrefetchedRef = useRef(false);
  if (enforceOnboarding && !onOnboardingRoute && !onAuthRoute) {
    return <Navigate to={targetOnboarding} replace />;
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    const isMldzFamilyRoute =
      location.pathname.startsWith('/mldz') || location.pathname.startsWith('/supplier');

    const preloadMldzPriority = () => {
      void Promise.allSettled([
        import('../features/livedealz/overview/SupplierLiveDealzFeedPage'),
        import('../features/livedealz/overview/SupplierMyCampaignsPage'),
        import('../features/livedealz/live/SupplierLiveDashboardPage'),
        import('../features/livedealz/live/SupplierLiveStudioPage'),
        import('../features/livedealz/adz/SupplierAdzDashboardPage'),
        import('../features/livedealz/deliverables/SupplierTaskBoardPage'),
      ]);
    };

    const preloadMldzBackground = () => {
      void Promise.allSettled([
        import('../features/livedealz/overview/SupplierDealzMarketplacePage'),
        import('../features/livedealz/collabs/SupplierCreatorDirectoryPage'),
        import('../features/livedealz/collabs/SupplierMyCreatorsPage'),
        import('../features/livedealz/collabs/SupplierProposalsPage'),
        import('../features/livedealz/collabs/SupplierContractsPage'),
        import('../features/livedealz/live/SupplierLiveSchedulePage'),
        import('../features/livedealz/live/SupplierReplaysClipsPage'),
        import('../features/livedealz/adz/SupplierAdzManagerPage'),
        import('../features/livedealz/adz/SupplierAdBuilderPage'),
        import('../features/livedealz/deliverables/SupplierAssetLibraryPage'),
        import('../features/livedealz/deliverables/SupplierLinksHubPage'),
        import('../features/livedealz/team/SupplierCrewManagerPage'),
      ]);
    };

    const preloadCritical = () => {
      if (isMldzFamilyRoute) {
        void Promise.allSettled([
          import('../features/livedealz/overview/SupplierLiveDealzFeedPage'),
          import('../features/livedealz/live/SupplierLiveDashboardPage'),
          import('../features/livedealz/adz/SupplierAdzDashboardPage'),
        ]);
        return;
      }
      void Promise.allSettled([
        import('../features/misc/Notifications'),
        import('../features/misc/Messages'),
        import('../features/misc/Analytics'),
      ]);
    };

    const preloadBackground = () => {
      void Promise.allSettled([
        import('../features/misc/Dashboard'),
        import('../features/listings/Listings'),
        import('../features/orders/Orders'),
        import('../features/settings/Profile'),
        import('../features/misc/HelpSupport'),
      ]);
    };

    if (typeof window === 'undefined') return;
    const hasIdle = 'requestIdleCallback' in window;
    if (hasIdle) {
      const id = window.requestIdleCallback(() => {
        if (isMldzFamilyRoute && !mldzPriorityPrefetchedRef.current) {
          mldzPriorityPrefetchedRef.current = true;
          preloadMldzPriority();
        }
        preloadCritical();
        preloadMldzBackground();
        preloadBackground();
      }, { timeout: 900 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => {
      if (isMldzFamilyRoute && !mldzPriorityPrefetchedRef.current) {
        mldzPriorityPrefetchedRef.current = true;
        preloadMldzPriority();
      }
      preloadCritical();
      preloadMldzBackground();
      preloadBackground();
    }, 120);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, location.pathname]);

  return (
    <Suspense fallback={<Fallback />}>
      <Routes location={location}>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Navigate to={enforceOnboarding ? targetOnboarding : "/dashboard"} replace />} />
            <Route
              path="/auth"
              element={enforceOnboarding ? <Navigate to={targetOnboarding} replace /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/auth/*"
              element={enforceOnboarding ? <Navigate to={targetOnboarding} replace /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/landing" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard role={role} />} />
            <Route path="/status-center" element={<SettingsStatusCenter />} />
            <Route path="/trust" element={<TrustCenter />} />
            <Route path="/account/health" element={<Navigate to="/status-center" replace />} />
            <Route path="/market-panel/approvals" element={<MarketPanelApprovals />} />
            <Route path="/seller/onboarding" element={<SellerOnboarding />} />

            <Route
              path="/listings"
              element={
                <SellerGuard>
                  <Listings />
                </SellerGuard>
              }
            />
            <Route
              path="/listings/new"
              element={
                <SellerOrProviderGuard>
                  <NewListing />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/listings/wizard"
              element={
                <SellerOrProviderGuard>
                  <ProductListingWizard />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/listings/AwaitingApproval_ProductListing"
              element={
                <SellerGuard>
                  <ListingAwaitingApproval />
                </SellerGuard>
              }
            />
            <Route
              path="/listings/AwaitingApproval_ServiceListing"
              element={
                <SellerGuard>
                  <ServiceListingAwaitingApproval />
                </SellerGuard>
              }
            />
            <Route
              path="/services/AwaitingApproval_ServiceListing"
              element={
                <SellerGuard>
                  <ServiceListingAwaitingApproval />
                </SellerGuard>
              }
            />
            <Route
              path="/listings/form-preview"
              element={
                <SellerOrProviderGuard>
                  <ListingFormPreview />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/listings/taxonomy"
              element={
                <SellerOrProviderGuard>
                  <ProductListingTaxonomyNavigatorCanvas />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/listings/bulk"
              element={
                <SellerGuard>
                  <BulkImport />
                </SellerGuard>
              }
            />
            <Route
              path="/listings/:id"
              element={
                <SellerGuard>
                  <ListingDetail />
                </SellerGuard>
              }
            />
            <Route path="/p/:sku" element={<ProductShare />} />

            <Route
              path="/catalog/templates"
              element={
                <SellerGuard>
                  <CatalogTemplates />
                </SellerGuard>
              }
            />
            <Route
              path="/catalog/media-library"
              element={
                <SellerGuard>
                  <CatalogMediaLibrary />
                </SellerGuard>
              }
            />
            <Route
              path="/templates"
              element={
                <SellerGuard>
                  <TemplatesHub />
                </SellerGuard>
              }
            />
            <Route
              path="/storefront"
              element={
                <SellerGuard>
                  <StorefrontOverview />
                </SellerGuard>
              }
            />

            <Route
              path="/orders"
              element={
                <SellerGuard>
                  <Orders />
                </SellerGuard>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <SellerGuard>
                  <OrderDetail />
                </SellerGuard>
              }
            />
            <Route
              path="/returns"
              element={
                <SellerGuard>
                  <Returns />
                </SellerGuard>
              }
            />
            <Route
              path="/orders/:id/print/invoice"
              element={
                <SellerGuard>
                  <PrintInvoice />
                </SellerGuard>
              }
            />
            <Route
              path="/orders/:id/print/packing-slip"
              element={
                <SellerGuard>
                  <PrintPackingSlip />
                </SellerGuard>
              }
            />
            <Route
              path="/orders/:id/print/sticker"
              element={
                <SellerGuard>
                  <PackingSticker />
                </SellerGuard>
              }
            />

            <Route
              path="/wholesale"
              element={
                <SellerGuard>
                  <WholesaleHome />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/price-lists"
              element={
                <SellerGuard>
                  <PriceLists />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/rfq-inbox"
              element={
                <SellerGuard>
                  <RFQInbox />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/rfq"
              element={
                <SellerGuard>
                  <RFQInbox />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/quotes"
              element={
                <SellerGuard>
                  <Quotes />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/incoterms"
              element={
                <SellerGuard>
                  <WholesaleIncoterms />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/templates"
              element={
                <SellerGuard>
                  <TemplatesHub />
                </SellerGuard>
              }
            />
            <Route
              path="/wholesale/quotes/:id"
              element={
                <SellerGuard>
                  <QuoteDetail />
                </SellerGuard>
              }
            />
            <Route path="/livedealz/home" element={<MldzFeed />} />
            <Route
              path="/seller/promo-analytics"
              element={
                <LiveDealzGuard>
                  <MldzAnalyticsStatus />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/dealz/catalog"
              element={
                <LiveDealzGuard>
                  <MldzCampaigns />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/dealz/deals"
              element={
                <LiveDealzGuard>
                  <MldzDealzMarketplace />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/dealz/new"
              element={
                <LiveDealzGuard>
                  <MldzCampaigns />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/dealz/approvals"
              element={
                <LiveDealzGuard>
                  <MldzCampaignsBoard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/promo-adz/:promoId/summary"
              element={
                <LiveDealzGuard>
                  <MldzAdzDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/promo-adz/:promoId/links"
              element={
                <LiveDealzGuard>
                  <MldzLinksHub />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/promo-adz/:promoId/assets"
              element={
                <LiveDealzGuard>
                  <MldzAssetLibrary />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/promo-adz/:promoId/distribution"
              element={
                <LiveDealzGuard>
                  <MldzAdzManager />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/shoppable-adz/manager"
              element={
                <LiveDealzGuard>
                  <MldzAdzManager />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/shoppable-adz/builder"
              element={
                <LiveDealzGuard>
                  <MldzAdzMarketplace />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/shoppable-adz/creator-permissions"
              element={
                <LiveDealzGuard>
                  <MldzAdzManager />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-sessions"
              element={
                <LiveDealzGuard>
                  <MldzLiveDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-sessions/:id"
              element={
                <LiveDealzGuard>
                  <MldzLiveDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-sessions/setup"
              element={
                <LiveDealzGuard>
                  <MldzLiveSchedule />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-sessions/go-live"
              element={
                <LiveDealzGuard>
                  <MldzLiveStudio />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-sessions/history"
              element={
                <LiveDealzGuard>
                  <MldzLiveReplays />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/creators/discovery"
              element={
                <LiveDealzGuard>
                  <MldzCreatorDirectory />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/creators/my-creators"
              element={
                <LiveDealzGuard>
                  <MldzMyCreators />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/creators/invite-from-creators"
              element={
                <LiveDealzGuard>
                  <MldzCreatorInvites />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/creators/invite-preferences"
              element={
                <LiveDealzGuard>
                  <MldzCreatorInvites />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/collabs/negotiation"
              element={
                <LiveDealzGuard>
                  <MldzProposals />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/contracts"
              element={
                <LiveDealzGuard>
                  <MldzContracts />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-feed/preview"
              element={
                <LiveDealzGuard>
                  <MldzFeed />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/seller/live-feed"
              element={
                <LiveDealzGuard>
                  <MldzFeed />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/supplier/*"
              element={
                <LiveDealzGuard>
                  <SupplierMldzRedirect />
                </LiveDealzGuard>
              }
            />

            <Route
              path="/mldz/feed"
              element={
                <LiveDealzGuard>
                  <MldzFeed />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/overview/supplier-public-profile"
              element={
                <LiveDealzGuard>
                  <MldzSupplierPublicProfile />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/campaigns"
              element={
                <LiveDealzGuard>
                  <MldzCampaigns />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/campaigns/awaiting-admin-approval"
              element={
                <LiveDealzGuard>
                  <MldzAwaitingAdminApproval />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/dealz-marketplace"
              element={
                <LiveDealzGuard>
                  <MldzDealzMarketplace />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/dashboard"
              element={
                <LiveDealzGuard>
                  <MldzLiveDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/schedule"
              element={
                <LiveDealzGuard>
                  <MldzLiveSchedule />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/studio"
              element={
                <LiveDealzGuard>
                  <MldzLiveStudio />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/stream-to-platforms"
              element={
                <LiveDealzGuard>
                  <MldzStreamToPlatforms />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/audience-notifications"
              element={
                <LiveDealzGuard>
                  <MldzAudienceNotifications />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/live-alerts"
              element={
                <LiveDealzGuard>
                  <MldzLiveAlertsManager />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/overlays-ctas-pro"
              element={
                <LiveDealzGuard>
                  <MldzOverlaysCtasPro />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/safety-moderation"
              element={
                <LiveDealzGuard>
                  <MldzSafetyModeration />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/post-live-publisher"
              element={
                <LiveDealzGuard>
                  <MldzPostLivePublisher />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/live/replays"
              element={
                <LiveDealzGuard>
                  <MldzLiveReplays />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/adz/dashboard"
              element={
                <LiveDealzGuard>
                  <MldzAdzDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/adz/marketplace"
              element={
                <LiveDealzGuard>
                  <MldzAdzMarketplace />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/adz/manager"
              element={
                <LiveDealzGuard>
                  <MldzAdzManager />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/adz/builder"
              element={
                <LiveDealzGuard>
                  <MldzAdzBuilder />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/adz-performance"
              element={
                <LiveDealzGuard>
                  <MldzAdzPerformance />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/ads"
              element={
                <LiveDealzGuard>
                  <MldzAdzDashboard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/promos/new"
              element={
                <LiveDealzGuard>
                  <MldzCampaigns />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/insights/analytics-status"
              element={
                <LiveDealzGuard>
                  <MldzAnalyticsStatus />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/creators/directory"
              element={
                <LiveDealzGuard>
                  <MldzCreatorDirectory />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/creators/profile"
              element={
                <LiveDealzGuard>
                  <MldzCreatorPublicProfile />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/creators/my-creators"
              element={
                <LiveDealzGuard>
                  <MldzMyCreators />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/creators/invites"
              element={
                <LiveDealzGuard>
                  <MldzCreatorInvites />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/collab/campaigns"
              element={
                <LiveDealzGuard>
                  <MldzCampaignsBoard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/collab/proposals"
              element={
                <LiveDealzGuard>
                  <MldzProposals />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/collab/negotiation-room"
              element={
                <LiveDealzGuard>
                  <MldzNegotiationRoom />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/collab/contracts"
              element={
                <LiveDealzGuard>
                  <MldzContracts />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/deliverables/task-board"
              element={
                <LiveDealzGuard>
                  <MldzDeliverablesBoard />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/deliverables/asset-library"
              element={
                <LiveDealzGuard>
                  <MldzAssetLibrary />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/deliverables/links-hub"
              element={
                <LiveDealzGuard>
                  <MldzLinksHub />
                </LiveDealzGuard>
              }
            />
            <Route
              path="/mldz/deliverables/links-hub/new-link"
              element={
                <LiveDealzGuard>
                  <MldzNewLink />
                </LiveDealzGuard>
              }
            />
            <Route path="/mldz/team/crew-manager" element={<MldzCrewManager />} />
            <Route path="/mldz/team/roles-permissions" element={<MldzRolesPermissions />} />
            <Route path="/mldz/settings/supplier-settings" element={<MldzSettings />} />
            <Route path="/mldz/settings/my-subscriptions" element={<MldzMySubscriptions />} />
            <Route
              path="/mldz/*"
              element={
                <LiveDealzGuard>
                  <MldzFeed />
                </LiveDealzGuard>
              }
            />

            <Route
              path="/expressmart/orders"
              element={
                <SellerGuard>
                  <ExpressOrders />
                </SellerGuard>
              }
            />
            <Route
              path="/expressmart/orders/:id"
              element={
                <SellerGuard>
                  <ExpressOrderDetail />
                </SellerGuard>
              }
            />
            <Route
              path="/expressmart"
              element={
                <SellerGuard>
                  <ExpressOrderDetail />
                </SellerGuard>
              }
            />

            <Route
              path="/compliance"
              element={
                <SellerOrProviderGuard>
                  <Compliance />
                </SellerOrProviderGuard>
              }
            />

            <Route
              path="/regulatory/healthmart-logistics"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthLogistics />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart-pharmacy"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthPharmacy />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart-equipment"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthEquipment />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/edumart-items"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryEduItems />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/faithmart-items"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryFaithItems />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryDesksHome />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/desks"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryDesksHome />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthHub />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart/logistics"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthLogistics />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart/pharmacy"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthPharmacy />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/healthmart/equipment"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryHealthEquipment />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/edumart"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryEduItems />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/regulatory/faithmart"
              element={
                <SellerOrProviderGuard>
                  <RegulatoryFaithItems />
                </SellerOrProviderGuard>
              }
            />

            <Route
              path="/provider/onboarding"
              element={
                <ProviderGuard>
                  <ProviderOnboarding />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/service-command"
              element={
                <ProviderGuard>
                  <ProviderServiceCommand />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/quotes"
              element={
                <ProviderGuard>
                  <ProviderQuotes />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/quotes/:id"
              element={
                <ProviderGuard>
                  <ProviderQuoteDetail />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/new-quote"
              element={
                <ProviderGuard>
                  <ProviderQuoteNew />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/quote"
              element={
                <ProviderGuard>
                  <ProviderQuoteNew />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/joint-quotes"
              element={
                <ProviderGuard>
                  <ProviderJointQuote />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/joint-quote"
              element={
                <ProviderGuard>
                  <ProviderJointQuote />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/joint-quotes/:id"
              element={
                <ProviderGuard>
                  <ProviderJointQuote />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/consultations"
              element={
                <ProviderGuard>
                  <ProviderConsultations />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/consultations/queue"
              element={
                <ProviderGuard>
                  <ProviderConsultations />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/bookings"
              element={
                <ProviderGuard>
                  <ProviderBookings />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/bookings/:id"
              element={
                <ProviderGuard>
                  <ProviderBookings />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/portfolio"
              element={
                <ProviderGuard>
                  <ProviderPortfolio />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/catalog/portfolio"
              element={
                <ProviderGuard>
                  <ProviderPortfolio />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/reviews"
              element={
                <ProviderGuard>
                  <ProviderReviews />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/reviewslocalize"
              element={
                <ProviderGuard>
                  <ProviderReviews />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/disputes"
              element={
                <ProviderGuard>
                  <DisputesProvider />
                </ProviderGuard>
              }
            />

            <Route
              path="/provider/listings"
              element={
                <ProviderGuard>
                  <Listings />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/listings/:id"
              element={
                <ProviderGuard>
                  <ListingDetail />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/orders"
              element={
                <ProviderGuard>
                  <Orders />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/inventory"
              element={
                <ProviderGuard>
                  <Inventory />
                </ProviderGuard>
              }
            />
            <Route
              path="/provider/profile"
              element={
                <ProviderGuard>
                  <SettingsProfile />
                </ProviderGuard>
              }
            />

            <Route
              path="/seller/reviews"
              element={
                <SellerGuard>
                  <SellerReviews />
                </SellerGuard>
              }
            />
            <Route
              path="/reviews"
              element={
                <SellerGuard>
                  <SellerReviews />
                </SellerGuard>
              }
            />

            <Route
              path="/healthmart/logistics-orders"
              element={
                <SellerGuard>
                  <ChannelGuard channelKey="healthmart">
                    <HealthLogistics />
                  </ChannelGuard>
                </SellerGuard>
              }
            />
            <Route
              path="/healthmart/pharmacy-items"
              element={
                <SellerGuard>
                  <ChannelGuard channelKey="healthmart">
                    <HealthPharmacy />
                  </ChannelGuard>
                </SellerGuard>
              }
            />
            <Route
              path="/healthmart/equipment-items"
              element={
                <SellerGuard>
                  <ChannelGuard channelKey="healthmart">
                    <HealthEquipment />
                  </ChannelGuard>
                </SellerGuard>
              }
            />
            <Route
              path="/edumart/items"
              element={
                <SellerGuard>
                  <ChannelGuard channelKey="edumart">
                    <EduItems />
                  </ChannelGuard>
                </SellerGuard>
              }
            />
            <Route
              path="/faithmart/items"
              element={
                <SellerGuard>
                  <ChannelGuard channelKey="faithmart">
                    <FaithItems />
                  </ChannelGuard>
                </SellerGuard>
              }
            />

            <Route
              path="/inventory"
              element={
                <SellerGuard>
                  <Inventory />
                </SellerGuard>
              }
            />
            <Route
              path="/shipping"
              element={
                <SellerGuard>
                  <Shipping />
                </SellerGuard>
              }
            />
            <Route
              path="/exports"
              element={
                <SellerGuard>
                  <Exports />
                </SellerGuard>
              }
            />
            <Route
              path="/disputes"
              element={
                <SellerGuard>
                  <DisputesSeller />
                </SellerGuard>
              }
            />
            <Route
              path="/seller/disputes"
              element={
                <SellerGuard>
                  <DisputesSeller />
                </SellerGuard>
              }
            />
            <Route
              path="/ops"
              element={
                <SellerGuard>
                  <OpsOverview />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/inventory"
              element={
                <SellerGuard>
                  <Inventory />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/shipping-profiles"
              element={
                <SellerGuard>
                  <Shipping />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/shipping"
              element={
                <SellerGuard>
                  <Shipping />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/warehouses"
              element={
                <SellerGuard>
                  <Warehouses />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/returns"
              element={
                <SellerGuard>
                  <Returns />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/disputes"
              element={
                <SellerGuard>
                  <DisputesSeller />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/exports"
              element={
                <SellerGuard>
                  <Exports />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/documents"
              element={
                <SellerGuard>
                  <DocumentsCenter />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/compliance"
              element={
                <SellerGuard>
                  <ComplianceCenter />
                </SellerGuard>
              }
            />
            <Route
              path="/ops/*"
              element={
                <SellerGuard>
                  <OpsOverview />
                </SellerGuard>
              }
            />

            <Route
              path="/wallet"
              element={
                <SellerGuard>
                  <FinanceWallets />
                </SellerGuard>
              }
            />
            <Route
              path="/finance"
              element={
                <SellerGuard>
                  <FinanceHome />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/wallets"
              element={
                <SellerGuard>
                  <FinanceWallets />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/holds"
              element={
                <SellerGuard>
                  <FinanceHolds />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                <SellerGuard>
                  <FinanceInvoices />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/statements"
              element={
                <SellerGuard>
                  <FinanceStatements />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/tax-reports"
              element={
                <SellerGuard>
                  <FinanceTaxReports />
                </SellerGuard>
              }
            />
            <Route
              path="/finance/*"
              element={
                <SellerGuard>
                  <FinanceHome />
                </SellerGuard>
              }
            />

            <Route
              path="/analytics"
              element={
                <SellerOrProviderGuard>
                  <Analytics />
                </SellerOrProviderGuard>
              }
            />
            <Route
              path="/messages"
              element={
                <SellerOrProviderGuard>
                  <Messages role={role} />
                </SellerOrProviderGuard>
              }
            />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/help-support" element={<HelpSupport />} />
            <Route path="/support/*" element={<HelpSupport />} />
            <Route path="/contact/support" element={<HelpSupport />} />
            <Route path="/search" element={<GlobalSearch />} />

            <Route path="/settings/profile" element={<SettingsProfile />} />
            <Route path="/settings/team" element={<SettingsTeam />} />
            <Route path="/settings/payout-methods" element={<SettingsPayoutMethods />} />
            <Route path="/settings/preferences" element={<SettingsPreferences />} />
            <Route path="/settings/security" element={<SettingsSecurity />} />
            <Route path="/settings/security/sessions" element={<SettingsSecuritySessions />} />
            <Route path="/settings/integrations" element={<SettingsIntegrations />} />
            <Route path="/settings/tax" element={<SettingsTax />} />
            <Route path="/settings/kyc" element={<SettingsKyc />} />
            <Route path="/settings" element={<SettingsProfile />} />
            <Route path="/settings/teams" element={<SettingsTeam />} />
            <Route
              path="/settings/notification-preferences"
              element={<SettingsNotificationPreferences />}
            />
            <Route path="/settings/saved-views" element={<SettingsSavedViews />} />
            <Route path="/settings/audit" element={<SettingsAuditLog />} />
            <Route path="/settings/help" element={<SettingsHelp />} />

            <Route
              path="*"
              element={
                <div className="p-6">
                  <NotFoundMessage />
                </div>
              }
            />
          </>
        ) : (
          <>
            <Route path="/" element={<PublicLanding />} />
            <Route path="/auth" element={<Auth defaultTab="signin" />} />
            <Route path="/auth/*" element={<Auth defaultTab="signin" />} />
            <Route path="/p/:sku" element={<ProductShare />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}
